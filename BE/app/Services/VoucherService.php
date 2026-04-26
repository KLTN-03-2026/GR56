<?php

namespace App\Services;

use App\Models\DonHang;
use App\Models\KhachHang;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VoucherService
{
    // ==================== VALIDATE & APPLY ====================

    /**
     * Kiểm tra và trả về thông tin giảm giá của voucher
     *
     * @return array ['ok' => bool, 'message' => string, 'voucher' => Voucher|null, 'so_tien_giam' => int]
     */
    public static function kiemTraVoucher(
        string $ma_code,
        int    $id_khach_hang,
        int    $id_quan_an,
        int    $tong_tien_hang  // Tổng tiền hàng (chưa tính phí ship)
    ): array {
        $voucher = Voucher::where('ma_code', strtoupper(trim($ma_code)))->first();

        if (!$voucher) {
            return ['ok' => false, 'message' => 'Mã voucher không tồn tại.'];
        }

        // Kiểm tra hiệu lực tổng thể
        if (!$voucher->conHieuLuc()) {
            return ['ok' => false, 'message' => 'Voucher đã hết hạn hoặc tạm ngưng.'];
        }

        // Kiểm tra voucher có thuộc quán này không (id_quan_an = 0 = toàn hệ thống)
        if ($voucher->id_quan_an != 0 && $voucher->id_quan_an != $id_quan_an) {
            return ['ok' => false, 'message' => 'Voucher không áp dụng cho quán này.'];
        }

        // Kiểm tra voucher private
        if ($voucher->loai_voucher === Voucher::LOAI_PRIVATE) {
            if ($voucher->id_khach_hang_rieng != $id_khach_hang) {
                return ['ok' => false, 'message' => 'Voucher này không dành cho bạn.'];
            }
        }

        // Kiểm tra đơn tối thiểu
        if ($tong_tien_hang < $voucher->don_hang_toi_thieu) {
            return [
                'ok'      => false,
                'message' => 'Đơn hàng tối thiểu ' . number_format($voucher->don_hang_toi_thieu) . 'đ để dùng voucher này.',
            ];
        }

        // Kiểm tra lượt dùng của khách này
        if (!$voucher->khachConDungDuoc($id_khach_hang)) {
            return ['ok' => false, 'message' => 'Bạn đã sử dụng voucher này rồi.'];
        }

        // Tính số tiền giảm
        $so_tien_giam = self::tinhSoTienGiam($voucher, $tong_tien_hang);

        return [
            'ok'           => true,
            'message'      => 'Áp dụng voucher thành công! Tiết kiệm ' . number_format($so_tien_giam) . 'đ',
            'voucher'      => array_merge($voucher->toArray(), [
                'loai_voucher'   => self::labelLoaiVoucher($voucher),
                'thoi_gian_con_lai' => self::thoiGianConLai($voucher),
            ]),
            'so_tien_giam' => $so_tien_giam,
        ];
    }

    /**
     * Ghi nhận đã dùng voucher (gọi sau khi đơn hàng tạo thành công)
     */
    public static function ghiNhanDaDung(int $id_voucher, int $id_khach_hang, int $id_don_hang, int $so_tien_giam): void
    {
        DB::transaction(function () use ($id_voucher, $id_khach_hang, $id_don_hang, $so_tien_giam) {
            VoucherUsage::create([
                'id_voucher'      => $id_voucher,
                'id_khach_hang'   => $id_khach_hang,
                'id_don_hang'     => $id_don_hang,
                'so_tien_da_giam' => $so_tien_giam,
            ]);

            // Tăng số lượt đã dùng
            Voucher::where('id', $id_voucher)->increment('so_luot_da_dung');
        });
    }

    // ==================== ĐỀ XUẤT VOUCHER ====================

    /**
     * Lấy danh sách voucher phù hợp nhất để đề xuất cho khách
     * Sắp xếp theo: cá nhân hóa > giá trị giảm cao nhất
     */
    public static function deXuatVoucher(int $id_khach_hang, int $id_quan_an, int $tong_tien_hang): array
    {
        $now = now()->toDateString();

        // Lấy tất cả voucher có thể dùng
        $vouchers = Voucher::where('tinh_trang', 1)
            ->where('thoi_gian_bat_dau', '<=', $now)
            ->where('thoi_gian_ket_thuc', '>=', $now)
            ->where('don_hang_toi_thieu', '<=', $tong_tien_hang)
            ->where(function ($q) use ($id_quan_an) {
                $q->where('id_quan_an', 0)       // Toàn hệ thống
                    ->orWhere('id_quan_an', $id_quan_an); // Của quán này
            })
            ->where(function ($q) use ($id_khach_hang) {
                $q->where('loai_voucher', '!=', Voucher::LOAI_PRIVATE)
                    ->orWhere('id_khach_hang_rieng', $id_khach_hang); // Voucher riêng của khách này
            })
            ->get();

        $result = [];
        foreach ($vouchers as $v) {
            // Bỏ qua hết lượt
            if (!$v->conHieuLuc()) continue;
            // Bỏ qua nếu khách đã dùng đủ lượt
            if (!$v->khachConDungDuoc($id_khach_hang)) continue;

            $so_tien_giam = self::tinhSoTienGiam($v, $tong_tien_hang);

            $result[] = [
                'id'                => $v->id,
                'ma_code'           => $v->ma_code,
                'ten_voucher'       => $v->ten_voucher,
                'mo_ta'             => $v->mo_ta,
                'loai_giam'         => $v->loai_giam,
                'so_giam_gia'       => $v->so_giam_gia,
                'so_tien_toi_da'    => $v->so_tien_toi_da,
                'don_hang_toi_thieu' => $v->don_hang_toi_thieu,
                'so_tien_giam'      => $so_tien_giam,
                'loai_voucher_label' => self::labelLoaiVoucher($v),
                'thoi_gian_ket_thuc' => $v->thoi_gian_ket_thuc,
                'thoi_gian_con_lai' => self::thoiGianConLai($v),
                'hinh_anh'          => $v->hinh_anh,
                'is_private'        => $v->loai_voucher === Voucher::LOAI_PRIVATE,
                'is_system'         => in_array($v->loai_voucher, [Voucher::LOAI_SYSTEM, Voucher::LOAI_PRIVATE]),
                'priority'          => self::tinhDoUuTien($v, $id_khach_hang, $so_tien_giam),
            ];
        }

        // Sắp xếp theo độ ưu tiên giảm dần
        usort($result, fn($a, $b) => $b['priority'] <=> $a['priority']);

        return array_slice($result, 0, 5); // Trả về tối đa 5 voucher tốt nhất
    }

    // ==================== AUTO-GENERATE ====================

    /**
     * Sinh voucher tự động theo hành vi khách hàng
     * Chạy hàng đêm qua cron job
     */
    public static function autoGenerateBanDem(): array
    {
        $stats = ['tao_moi' => 0, 'bo_qua' => 0];

        // 1. Khách không đặt 7 ngày → Voucher "Nhớ bạn"
        $khach_7ngay = KhachHang::whereDoesntHave('donHangs', function ($q) {
            $q->where('created_at', '>=', now()->subDays(7));
        })->whereHas('donHangs', function ($q) {
            // Đã từng đặt hàng (có ít nhất 1 đơn)
            $q->where('created_at', '>=', now()->subDays(60));
        })->get();

        foreach ($khach_7ngay as $kh) {
            // Kiểm tra đã có voucher "quay lại" chưa dùng chưa
            $da_co = Voucher::where('id_khach_hang_rieng', $kh->id)
                ->where('loai_voucher', Voucher::LOAI_SYSTEM)
                ->where('thoi_gian_ket_thuc', '>=', now()->toDateString())
                ->whereRaw('so_luot_da_dung < so_luot_moi_nguoi')
                ->exists();

            if (!$da_co) {
                Voucher::create([
                    'ma_code'             => 'NHOB' . $kh->id . rand(100, 999),
                    'ten_voucher'         => 'Nhớ bạn quá! Quay lại nhé',
                    'mo_ta'               => 'Voucher đặc biệt dành riêng cho bạn, chúng tôi nhớ bạn!',
                    'hinh_anh'            => null,
                    'thoi_gian_bat_dau'   => now()->toDateString(),
                    'thoi_gian_ket_thuc'  => now()->addDays(7)->toDateString(),
                    'loai_giam'           => Voucher::GIAM_TIEN_MAT,
                    'so_giam_gia'         => 20000,
                    'so_tien_toi_da'      => 20000,
                    'don_hang_toi_thieu'  => 50000,
                    'id_quan_an'          => 0, // Toàn hệ thống
                    'tinh_trang'          => 1,
                    'loai_voucher'        => Voucher::LOAI_PRIVATE,
                    'id_khach_hang_rieng' => $kh->id,
                    'so_luot_toi_da'      => 1,
                    'so_luot_da_dung'     => 0,
                    'so_luot_moi_nguoi'   => 1,
                ]);
                $stats['tao_moi']++;
            } else {
                $stats['bo_qua']++;
            }
        }

        // 2. Khách không đặt 14 ngày → Voucher "Lâu rồi không gặp"
        $khach_14ngay = KhachHang::whereDoesntHave('donHangs', function ($q) {
            $q->where('created_at', '>=', now()->subDays(14));
        })->whereHas('donHangs', function ($q) {
            $q->where('created_at', '>=', now()->subDays(90));
        })->get();

        foreach ($khach_14ngay as $kh) {
            $da_co = Voucher::where('id_khach_hang_rieng', $kh->id)
                ->where('ten_voucher', 'LIKE', '%Lâu rồi%')
                ->where('thoi_gian_ket_thuc', '>=', now()->toDateString())
                ->exists();

            if (!$da_co) {
                Voucher::create([
                    'ma_code'             => 'LRKG' . $kh->id . rand(100, 999),
                    'ten_voucher'         => 'Lâu rồi không gặp!',
                    'mo_ta'               => 'Đặc biệt dành cho bạn - 14 ngày rồi chúng tôi không gặp!',
                    'hinh_anh'            => null,
                    'thoi_gian_bat_dau'   => now()->toDateString(),
                    'thoi_gian_ket_thuc'  => now()->addDays(5)->toDateString(),
                    'loai_giam'           => Voucher::GIAM_TIEN_MAT,
                    'so_giam_gia'         => 30000,
                    'so_tien_toi_da'      => 30000,
                    'don_hang_toi_thieu'  => 70000,
                    'id_quan_an'          => 0,
                    'tinh_trang'          => 1,
                    'loai_voucher'        => Voucher::LOAI_PRIVATE,
                    'id_khach_hang_rieng' => $kh->id,
                    'so_luot_toi_da'      => 1,
                    'so_luot_da_dung'     => 0,
                    'so_luot_moi_nguoi'   => 1,
                ]);
                $stats['tao_moi']++;
            }
        }

        // 3. Khách VIP (≥ 10 đơn hoàn thành) chưa có voucher VIP
        $khach_vip = KhachHang::whereHas('donHangs', function ($q) {
            $q->where('tinh_trang', DonHang::TINH_TRANG_DA_GIAO);
        }, '>=', 10)->get();

        foreach ($khach_vip as $kh) {
            $ton_tai = Voucher::where('id_khach_hang_rieng', $kh->id)
                ->where('ma_code', 'LIKE', 'VIP%')
                ->where('thoi_gian_ket_thuc', '>=', now()->toDateString())
                ->exists();

            if (!$ton_tai) {
                Voucher::create([
                    'ma_code'             => 'VIP' . $kh->id,
                    'ten_voucher'         => 'Ưu đãi Khách VIP',
                    'mo_ta'               => 'Cảm ơn bạn đã tin tưởng SHOPEFOOD! Đây là ưu đãi dành cho Khách VIP.',
                    'hinh_anh'            => null,
                    'thoi_gian_bat_dau'   => now()->toDateString(),
                    'thoi_gian_ket_thuc'  => now()->addMonth()->toDateString(),
                    'loai_giam'           => Voucher::GIAM_PHAN_TRAM,
                    'so_giam_gia'         => 10,
                    'so_tien_toi_da'      => 40000,
                    'don_hang_toi_thieu'  => 50000,
                    'id_quan_an'          => 0,
                    'tinh_trang'          => 1,
                    'loai_voucher'        => Voucher::LOAI_PRIVATE,
                    'id_khach_hang_rieng' => $kh->id,
                    'so_luot_toi_da'      => 4, // 4 lần/tháng
                    'so_luot_da_dung'     => 0,
                    'so_luot_moi_nguoi'   => 4,
                ]);
                $stats['tao_moi']++;
            }
        }

        // 4. Voucher giờ vắng: sinh lúc 13:30, hết hạn 17:00
        $gio_hien_tai = (int) now()->format('G');
        if ($gio_hien_tai === 13) {
            $da_co_hom_nay = Voucher::where('ma_code', 'LIKE', 'GIOVANH%')
                ->whereDate('thoi_gian_ket_thuc', today())
                ->exists();

            if (!$da_co_hom_nay) {
                Voucher::create([
                    'ma_code'             => 'GIOVANH' . now()->format('dmy'),
                    'ten_voucher'         => 'Ưu đãi giờ vắng 14h-17h',
                    'mo_ta'               => 'Đặt trong khung 14:00-17:00 để nhận ưu đãi đặc biệt hôm nay!',
                    'hinh_anh'            => null,
                    'thoi_gian_bat_dau'   => today()->toDateString(),
                    'thoi_gian_ket_thuc'  => today()->toDateString(),
                    'loai_giam'           => Voucher::GIAM_PHAN_TRAM,
                    'so_giam_gia'         => 20,
                    'so_tien_toi_da'      => 50000,
                    'don_hang_toi_thieu'  => 60000,
                    'id_quan_an'          => 0,
                    'tinh_trang'          => 1,
                    'loai_voucher'        => Voucher::LOAI_SYSTEM,
                    'id_khach_hang_rieng' => null,
                    'so_luot_toi_da'      => 50, // 50 người dùng được/ngày
                    'so_luot_da_dung'     => 0,
                    'so_luot_moi_nguoi'   => 1,
                ]);
                $stats['tao_moi']++;
            }
        }

        // 5. Xóa voucher hết hạn > 7 ngày để dọn DB
        $deleted = Voucher::where('thoi_gian_ket_thuc', '<', now()->subDays(7)->toDateString())
            ->where('loai_voucher', '!=', Voucher::LOAI_PUBLIC) // Giữ lại voucher public
            ->delete();

        Log::info("VoucherService::autoGenerate - Tạo: {$stats['tao_moi']}, Bỏ qua: {$stats['bo_qua']}, Xóa cũ: $deleted");

        return $stats;
    }

    // ==================== HELPERS ====================

    public static function tinhSoTienGiam(Voucher $v, int $tong_tien_hang): int
    {
        if ($v->loai_giam == Voucher::GIAM_PHAN_TRAM) {
            $giam = (int) ($tong_tien_hang * $v->so_giam_gia / 100);
            return min($giam, $v->so_tien_toi_da ?: PHP_INT_MAX);
        } else {
            return min((int) $v->so_giam_gia, $tong_tien_hang); // Không giảm quá tổng tiền
        }
    }

    private static function labelLoaiVoucher(Voucher $v): string
    {
        return match ($v->loai_voucher) {
            'private'  => 'Dành riêng cho bạn',
            'system'   => 'Ưu đãi hệ thống',
            'referral' => 'Giới thiệu bạn bè',
            default    => 'Khuyến mãi',
        };
    }

    private static function thoiGianConLai(Voucher $v): string
    {
        $con_lai = Carbon::parse($v->thoi_gian_ket_thuc)->diffInDays(now(), false);
        if ($con_lai < 0) return 'Hết hạn';
        if ($con_lai === 0) return 'Hết hạn hôm nay';
        return "Còn {$con_lai} ngày";
    }

    private static function tinhDoUuTien(Voucher $v, int $id_khach_hang, int $so_tien_giam): int
    {
        $priority = $so_tien_giam; // Base: giá trị giảm càng cao càng ưu tiên
        if ($v->loai_voucher === Voucher::LOAI_PRIVATE && $v->id_khach_hang_rieng === $id_khach_hang) {
            $priority += 100000; // Ưu tiên cao nhất: voucher cá nhân
        }
        if ($v->loai_voucher === Voucher::LOAI_SYSTEM) {
            $priority += 50000; // Ưu tiên cao: voucher hệ thống
        }
        return $priority;
    }
}
