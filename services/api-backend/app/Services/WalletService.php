<?php

namespace App\Services;

use App\Models\DonHang;
use App\Models\KhachHang;
use App\Models\LichSuXu;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * WalletService — xử lý logic chia tiền khi đơn hàng giao thành công
 *
 * Công thức:
 *   tien_chiet_khau = tien_hang × chiet_khau_phan_tram / 100
 *   tien_quan_an    = tien_hang - tien_chiet_khau
 *   tien_shipper    = phi_ship × 90% (Admin giữ 10% phí ship)
 */
class WalletService
{
    // % chiết khấu admin giữ lại từ tiền hàng
    const CHIET_KHAU_DEFAULT = 15;

    // % admin giữ lại từ phí ship
    const CHIET_KHAU_PHI_SHIP = 10;

    /**
     * Thực hiện đối soát và chia tiền cho 1 đơn hàng
     * Được gọi khi đơn hàng chuyển sang tinh_trang = 3 (Giao thành công)
     */
    public static function doiSoatDonHang(DonHang $don_hang): bool
    {
        if (!$don_hang->is_thanh_toan || $don_hang->da_doi_soat) {
            return false;
        }

        if (!$don_hang->id_shipper) {
            return false;
        }

        DB::beginTransaction();
        try {
            $chiet_khau_pct      = floatval(\App\Models\CauHinh::getVal('chiet_khau_phan_tram', self::CHIET_KHAU_DEFAULT));
            $chiet_khau_ship_pct = self::CHIET_KHAU_PHI_SHIP;
            $tien_hang           = floatval($don_hang->tien_hang);
            $phi_ship            = floatval($don_hang->phi_ship);

            // Admin lấy 15% từ tiền hàng
            $tien_chiet_khau     = round($tien_hang * $chiet_khau_pct / 100, 2);
            $tien_quan_an        = round($tien_hang - $tien_chiet_khau, 2);

            // Admin lấy 10% từ phí ship, Shipper được 90%
            $chiet_khau_phi_ship = round($phi_ship * $chiet_khau_ship_pct / 100, 2);
            $tien_shipper        = round($phi_ship - $chiet_khau_phi_ship, 2);

            $don_hang->chiet_khau_phan_tram = $chiet_khau_pct;
            $don_hang->tien_chiet_khau      = $tien_chiet_khau + $chiet_khau_phi_ship; // tổng admin giữ
            $don_hang->tien_quan_an         = $tien_quan_an;
            $don_hang->tien_shipper         = $tien_shipper;
            $don_hang->da_doi_soat          = true;
            $don_hang->thoi_gian_doi_soat   = now();
            $don_hang->save();

            // Chỉ thực hiện chia tiền trên ví điện tử nếu là đơn Chuyển Khoản VÀ PAYOS
            // Đơn COD đã được chia tiền ngay khi "Nhận đơn" rồi
            if ($don_hang->phuong_thuc_thanh_toan == DonHang::thanh_toan_chuyen_khoan || $don_hang->phuong_thuc_thanh_toan == DonHang::thanh_toan_payos) {
                // Credit ví quán ăn
                self::creditWallet(
                    'quan_an',
                    $don_hang->id_quan_an,
                    $tien_quan_an,
                    $don_hang->id,
                    "Tiền đơn hàng #{$don_hang->ma_don_hang} (sau chiết khấu {$chiet_khau_pct}%)"
                );

                // Credit phí ship 90% cho shipper
                self::creditWallet(
                    'shipper',
                    $don_hang->id_shipper,
                    $tien_shipper,
                    $don_hang->id,
                    "Phí ship đơn hàng #{$don_hang->ma_don_hang} (90%)"
                );
            }

            DB::commit();
            Log::info("Đối soát đơn #{$don_hang->ma_don_hang}: quán={$tien_quan_an}, shipper={$tien_shipper}");
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi đối soát đơn #{$don_hang->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Thanh toán đơn COD ngay khi shipper nhận đơn.
     * Shipper bị trừ: tong_tien - (phi_ship * 90%)
     * Số tiền này được chuyển ngay cho Quán ăn (tien_hang * 85%) và Hệ thống.
     */
    public static function thanhToanDonHangCOD(DonHang $don_hang, int $id_shipper): array
    {
        $tien_hang           = floatval($don_hang->tien_hang);
        $phi_ship            = floatval($don_hang->phi_ship);
        $chiet_khau_pct      = floatval(\App\Models\CauHinh::getVal('chiet_khau_phan_tram', self::CHIET_KHAU_DEFAULT));
        $chiet_khau_ship_pct = self::CHIET_KHAU_PHI_SHIP;

        // Tính toán phân bổ
        $tien_chiet_khau_hang = round($tien_hang * $chiet_khau_pct / 100, 2);
        $tien_quan_an         = round($tien_hang - $tien_chiet_khau_hang, 2);
        $tien_shipper_huong   = round($phi_ship * (100 - $chiet_khau_ship_pct) / 100, 2);

        // Số tiền shipper bị trừ từ ví (để mua đơn hàng từ hệ thống)
        // Shipper sẽ thu lại tong_tien mặt từ khách, nên thực tế shipper lãi tien_shipper_huong.
        $so_tien_bi_tru       = floatval($don_hang->tong_tien) - $tien_shipper_huong;

        $wallet = Wallet::firstOrCreate(
            ['loai_vi' => 'shipper', 'id_chu_vi' => $id_shipper],
            ['so_du' => 0, 'tong_tien_nhan' => 0, 'tong_tien_rut' => 0]
        );

        if ($wallet->so_du < $so_tien_bi_tru) {
            return [
                'ok'      => false,
                'message' => 'Số dư không đủ. Cần thanh toán ' . number_format($so_tien_bi_tru, 0, ',', '.') . 'đ, hiện có ' . number_format($wallet->so_du, 0, ',', '.') . 'đ.',
            ];
        }

        DB::beginTransaction();
        try {
            $so_du_truoc = $wallet->so_du;
            $so_du_sau   = $so_du_truoc - $so_tien_bi_tru;
            $wallet->so_du = $so_du_sau;
            $wallet->save();

            WalletTransaction::create([
                'id_wallet'      => $wallet->id,
                'id_don_hang'    => $don_hang->id,
                'loai_giao_dich' => 'debit',
                'so_tien'        => $so_tien_bi_tru,
                'so_du_truoc'    => $so_du_truoc,
                'so_du_sau'      => $so_du_sau,
                'mo_ta'          => "Thanh toán nhận đơn COD #{$don_hang->ma_don_hang} (Trừ tiền hàng & phí hệ thống)",
            ]);

            // Chuyển tiền ngay cho Quán ăn
            self::creditWallet(
                'quan_an',
                $don_hang->id_quan_an,
                $tien_quan_an,
                $don_hang->id,
                "Tiền đơn COD #{$don_hang->ma_don_hang} (Shipper thanh toán)"
            );

            // Cập nhật các thông số vào đơn hàng
            $don_hang->id_shipper           = $id_shipper;
            $don_hang->chiet_khau_phan_tram = $chiet_khau_pct;
            $don_hang->tien_chiet_khau      = $tien_chiet_khau_hang + ($phi_ship - $tien_shipper_huong);
            $don_hang->tien_quan_an         = $tien_quan_an;
            $don_hang->tien_shipper         = $tien_shipper_huong;
            $don_hang->da_dat_coc           = true;
            $don_hang->save();

            DB::commit();
            return ['ok' => true, 'message' => 'Đã thanh toán phí đơn hàng! Bạn hãy thu ' . number_format($don_hang->tong_tien, 0, ',', '.') . 'đ tiền mặt từ khách.'];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi COD Purchase #{$don_hang->id}: " . $e->getMessage());
            return ['ok' => false, 'message' => 'Lỗi hệ thống'];
        }
    }

    /**
     * Shipper nộp tiền mặt vào ví (được admin xác nhận)
     */
    public static function nopTienVaoVi(int $id_shipper, float $so_tien, string $mo_ta = ''): array
    {
        if ($so_tien <= 0) {
            return ['ok' => false, 'message' => 'Số tiền nộp phải lớn hơn 0'];
        }

        DB::beginTransaction();
        try {
            $wallet = Wallet::firstOrCreate(
                ['loai_vi' => 'shipper', 'id_chu_vi' => $id_shipper],
                ['so_du' => 0, 'tong_tien_nhan' => 0, 'tong_tien_rut' => 0]
            );

            $so_du_truoc = $wallet->so_du;
            $so_du_sau   = $so_du_truoc + $so_tien;

            $wallet->so_du          = $so_du_sau;
            $wallet->tong_tien_nhan = $wallet->tong_tien_nhan + $so_tien;
            $wallet->save();

            WalletTransaction::create([
                'id_wallet'      => $wallet->id,
                'id_don_hang'    => null,
                'loai_giao_dich' => 'credit',
                'so_tien'        => $so_tien,
                'so_du_truoc'    => $so_du_truoc,
                'so_du_sau'      => $so_du_sau,
                'mo_ta'          => $mo_ta ?: "Nộp tiền mặt vào ví",
            ]);

            DB::commit();
            return ['ok' => true, 'wallet' => $wallet];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi nộp tiền ví shipper #{$id_shipper}: " . $e->getMessage());
            return ['ok' => false, 'message' => 'Lỗi hệ thống'];
        }
    }

    /**
     * Credit tiền vào ví (tạo ví tự động nếu chưa có)
     */
    public static function creditWallet(string $loai_vi, int $id_chu_vi, float $so_tien, int $id_don_hang, string $mo_ta): void
    {
        $wallet = Wallet::firstOrCreate(
            ['loai_vi' => $loai_vi, 'id_chu_vi' => $id_chu_vi],
            ['so_du' => 0, 'tong_tien_nhan' => 0, 'tong_tien_rut' => 0]
        );

        $so_du_truoc = $wallet->so_du;
        $so_du_sau   = $so_du_truoc + $so_tien;

        $wallet->so_du          = $so_du_sau;
        $wallet->tong_tien_nhan = $wallet->tong_tien_nhan + $so_tien;
        $wallet->save();

        WalletTransaction::create([
            'id_wallet'      => $wallet->id,
            'id_don_hang'    => $id_don_hang,
            'loai_giao_dich' => 'credit',
            'so_tien'        => $so_tien,
            'so_du_truoc'    => $so_du_truoc,
            'so_du_sau'      => $so_du_sau,
            'mo_ta'          => $mo_ta,
        ]);
    }

    /**
     * Debit tiền khỏi ví khi rút tiền được duyệt
     */
    public static function debitWallet(Wallet $wallet, float $so_tien, string $mo_ta): bool
    {
        if ($wallet->so_du < $so_tien) {
            return false;
        }

        $so_du_truoc = $wallet->so_du;
        $so_du_sau   = $so_du_truoc - $so_tien;

        $wallet->so_du         = $so_du_sau;
        $wallet->tong_tien_rut = $wallet->tong_tien_rut + $so_tien;
        $wallet->save();

        WalletTransaction::create([
            'id_wallet'      => $wallet->id,
            'id_don_hang'    => null,
            'loai_giao_dich' => 'debit',
            'so_tien'        => $so_tien,
            'so_du_truoc'    => $so_du_truoc,
            'so_du_sau'      => $so_du_sau,
            'mo_ta'          => $mo_ta,
        ]);

        return true;
    }

    /**
     * Hoàn tiền cho khách khi đơn online bị hủy
     */
    public static function hoanTienHuyDon(DonHang $don_hang): void
    {
        $so_tien = floatval($don_hang->tong_tien);
        if ($so_tien <= 0) return;

        self::creditWallet(
            'khach_hang',
            $don_hang->id_khach_hang,
            $so_tien,
            $don_hang->id,
            "Hoàn tiền đơn hàng #{$don_hang->ma_don_hang} bị hủy"
        );
        Log::info("Hoàn {$so_tien}đ vào ví khách #{$don_hang->id_khach_hang} (đơn #{$don_hang->ma_don_hang})");
    }

    /**
     * Hoàn lại tiền đặt cọc COD cho shipper khi đơn bị hủy
     */
    public static function hoanCocCODChoShipper(DonHang $don_hang): void
    {
        if (!$don_hang->id_shipper || !$don_hang->da_dat_coc) return;

        $tien_da_bi_tru = floatval($don_hang->tong_tien) - floatval($don_hang->tien_shipper ?? 0);
        if ($tien_da_bi_tru <= 0) return;

        self::creditWallet(
            'shipper',
            $don_hang->id_shipper,
            $tien_da_bi_tru,
            $don_hang->id,
            "Hoàn cọc COD đơn hàng #{$don_hang->ma_don_hang} bị hủy"
        );

        // Hoàn lại tiền quán ăn đã nhận
        $tien_quan_an = floatval($don_hang->tien_quan_an ?? 0);
        if ($tien_quan_an > 0) {
            $wallet_quan = Wallet::where('loai_vi', 'quan_an')
                ->where('id_chu_vi', $don_hang->id_quan_an)
                ->first();
            if ($wallet_quan && $wallet_quan->so_du >= $tien_quan_an) {
                self::debitWallet(
                    $wallet_quan,
                    $tien_quan_an,
                    "Hoàn lại tiền đơn COD #{$don_hang->ma_don_hang} bị hủy"
                );
            }
        }
        Log::info("Hoàn cọc COD {$tien_da_bi_tru}đ cho shipper #{$don_hang->id_shipper} (đơn #{$don_hang->ma_don_hang})");
    }

    /**
     * Hoàn lại xu và voucher cho khách hàng khi đơn hàng bị hủy.
     *
     * - Xu: cộng lại diem_xu đã bị trừ khi đặt hàng, ghi lịch sử xu (loai_giao_dich = 3: hoàn xu hủy đơn).
     * - Voucher: giảm so_luot_da_dung của voucher, xóa bản ghi VoucherUsage tương ứng.
     *
     * An toàn để gọi nhiều lần; bên trong đã có guard tránh duplicate.
     */
    public static function hoanXuVaVoucher(DonHang $don_hang): void
    {
        // ── 1. Hoàn xu ────────────────────────────────────────────
        $xu_da_dung = floatval($don_hang->xu_su_dung ?? 0);
        if ($xu_da_dung > 0) {
            // Kiểm tra xem đã hoàn xu cho đơn này chưa (tránh duplicate)
            $daHoan = LichSuXu::where('id_don_hang', $don_hang->id)
                ->where('loai_giao_dich', 3) // 3 = hoàn xu khi hủy đơn
                ->exists();

            if (!$daHoan) {
                $khachHang = KhachHang::find($don_hang->id_khach_hang);
                if ($khachHang) {
                    $khachHang->diem_xu += $xu_da_dung;
                    $khachHang->save();

                    LichSuXu::create([
                        'id_khach_hang'  => $khachHang->id,
                        'id_don_hang'    => $don_hang->id,
                        'so_xu'          => $xu_da_dung,
                        'loai_giao_dich' => 3, // 3 = hoàn xu khi hủy đơn
                        'mo_ta'          => 'Hoàn xu do hủy đơn hàng ' . $don_hang->ma_don_hang,
                    ]);

                    Log::info("Hoàn {$xu_da_dung} xu cho khách #{$khachHang->id} (đơn #{$don_hang->ma_don_hang})");
                }
            }
        }

        // ── 2. Hoàn voucher ───────────────────────────────────────
        if ($don_hang->id_voucher) {
            // Xóa bản ghi VoucherUsage của đơn hàng này
            $usage = VoucherUsage::where('id_don_hang', $don_hang->id)
                ->where('id_voucher', $don_hang->id_voucher)
                ->first();

            if ($usage) {
                $usage->delete();

                // Giảm bộ đếm so_luot_da_dung của voucher
                $voucher = Voucher::find($don_hang->id_voucher);
                if ($voucher && $voucher->so_luot_da_dung > 0) {
                    $voucher->decrement('so_luot_da_dung');
                }

                Log::info("Hoàn voucher #{$don_hang->id_voucher} cho đơn #{$don_hang->ma_don_hang}");
            }
        }
    }
}
