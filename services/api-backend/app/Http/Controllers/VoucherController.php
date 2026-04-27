<?php

namespace App\Http\Controllers;

use App\Http\Requests\Voucher\CapNhatVoucherRequest;
use App\Http\Requests\Voucher\createQuanAnVoucherRequest;
use App\Http\Requests\Voucher\deleteQuanAnVoucherRequest;
use App\Http\Requests\Voucher\DoiTrangThaiVoucherRequest;
use App\Http\Requests\Voucher\ThemMoiVoucherRequest;
use App\Http\Requests\Voucher\updateQuanAnVoucherRequest;
use App\Http\Requests\Voucher\XoaVoucherRequest;
use App\Models\PhanQuyen;
use App\Models\QuanAn;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use App\Services\VoucherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VoucherController extends Controller
{
    public function getData()
    {
        $id_chuc_nang = 17;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if ($check) {
            $data = Voucher::leftJoin('quan_ans', 'quan_ans.id', 'vouchers.id_quan_an')
                ->select('vouchers.*', 'quan_ans.ten_quan_an')
                ->orderBy('vouchers.created_at', 'desc')
                ->get();
            return response()->json([
                'data' => $data
            ]);
        } else {
            return response()->json([
                'status'  => 0,
                'message' => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }

    public function getDataQuanAnVoucher()
    {
        $user = Auth::guard('sanctum')->user();
        $data = Voucher::where('id_quan_an', $user->id)->get();
        return response()->json([
            'data'      => $data
        ]);
    }

    public function createQuanAnVoucher(createQuanAnVoucherRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            Voucher::create([
                'ma_code'               => $request->ma_code,
                'ten_voucher'           => $request->ten_voucher,
                'hinh_anh'              => $request->hinh_anh,
                'thoi_gian_bat_dau'     => $request->thoi_gian_bat_dau,
                'thoi_gian_ket_thuc'    => $request->thoi_gian_ket_thuc,
                'loai_giam'             => $request->loai_giam,
                'so_giam_gia'           => $request->so_giam_gia,
                'id_quan_an'            => $user->id,
                'so_tien_toi_da'        => $request->so_tien_toi_da,
                'don_hang_toi_thieu'    => $request->don_hang_toi_thieu,
            ]);

            return response()->json([
                'status'    => 1,
                'message'   => 'Thêm voucher thành công!',
            ]);
        }
    }

    public function updateQuanAnVoucher(updateQuanAnVoucherRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            Voucher::find($request->id)->update([
                'ma_code'               => $request->ma_code,
                'ten_voucher'           => $request->ten_voucher,
                'hinh_anh'              => $request->hinh_anh,
                'thoi_gian_bat_dau'     => $request->thoi_gian_bat_dau,
                'thoi_gian_ket_thuc'    => $request->thoi_gian_ket_thuc,
                'loai_giam'             => $request->loai_giam,
                'so_giam_gia'           => $request->so_giam_gia,
                'id_quan_an'            => $user->id,
                'so_tien_toi_da'        => $request->so_tien_toi_da,
                'don_hang_toi_thieu'    => $request->don_hang_toi_thieu,
            ]);

            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật voucher thành công!',
            ]);
        }
    }

    public function deleteQuanAnVoucher(deleteQuanAnVoucherRequest $request)
    {
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::find($request->id);
            if ($data) {
                $data->delete();
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Xóa Voucher thành công!',
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Voucher không tồn tại!',
                ]);
            }
        }
    }

    public function doiTrangThaiQuanAnVoucher(deleteQuanAnVoucherRequest $request)
    {
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::find($request->id);
            if ($data) {
                $data->update([
                    'tinh_trang'    => !$data->tinh_trang,
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Thay đổi trạng thái thành công!',
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Voucher không tồn tại!',
                ]);
            }
        }
    }

    public function store(ThemMoiVoucherRequest $request)
    {
        $id_chuc_nang = 18;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::create([
                'ma_code'            => $request->ma_code,
                'ten_voucher'        => $request->ten_voucher,
                'hinh_anh'           => $request->hinh_anh,
                // id_quan_an = 0: voucher admin áp dụng cho TẤT CẢ các quán
                'id_quan_an'         => 0,
                'loai_voucher'       => 'public',
                'thoi_gian_bat_dau'  => $request->thoi_gian_bat_dau,
                'thoi_gian_ket_thuc' => $request->thoi_gian_ket_thuc,
                'loai_giam'          => $request->loai_giam,
                'so_giam_gia'        => $request->so_giam_gia,
                'so_tien_toi_da'     => $request->so_tien_toi_da,
                'don_hang_toi_thieu' => $request->don_hang_toi_thieu,
                'so_luot_toi_da'     => $request->so_luot_toi_da > 0 ? $request->so_luot_toi_da : null,
                'so_luot_da_dung'    => 0,
                'so_luot_moi_nguoi'  => 1,
                'tinh_trang'         => 1,
            ]);

            return response()->json([
                'status'    => 1,
                'message'   => 'Thêm voucher thành công!',
            ]);
        }
    }
    public function destroy(XoaVoucherRequest $request)
    {
        $id_chuc_nang = 20;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::find($request->id);
            if ($data) {
                $data->delete();
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Xóa Voucher thành công!',
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Voucher không tồn tại!',
                ]);
            }
        }
    }
    public function update(CapNhatVoucherRequest $request)
    {
        $id_chuc_nang = 19;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::find($request->id);
            if ($data) {
                $data->update([
                    'ma_code'            => $request->ma_code,
                    'ten_voucher'        => $request->ten_voucher,
                    'hinh_anh'           => $request->hinh_anh,
                    'thoi_gian_bat_dau'  => $request->thoi_gian_bat_dau,
                    'thoi_gian_ket_thuc' => $request->thoi_gian_ket_thuc,
                    // Giữ id_quan_an = 0: voucher admin luôn là toàn hệ thống
                    'id_quan_an'         => 0,
                    'loai_voucher'       => 'public',
                    'loai_giam'          => $request->loai_giam,
                    'so_giam_gia'        => $request->so_giam_gia,
                    'so_tien_toi_da'     => $request->so_tien_toi_da,
                    'don_hang_toi_thieu' => $request->don_hang_toi_thieu,
                    'so_luot_toi_da'     => $request->so_luot_toi_da > 0 ? $request->so_luot_toi_da : null,
                    'tinh_trang'         => $request->tinh_trang,
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Cập nhật Voucher thành công!',
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Voucher không tồn tại!',
                ]);
            }
        }
    }
    public function changeStatus(DoiTrangThaiVoucherRequest $request)
    {
        $id_chuc_nang = 21;
        $login = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($login->is_master != 1) {
            $id_chuc_vu = $login->id_chuc_vu;
            $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
                ->where('id_chuc_nang', $id_chuc_nang)
                ->first();
            if (!$check_quyen) {
                return response()->json([
                    'data' => false,
                    'message' => "bạn không có quyền thực hiện chức năng này!"
                ]);
            }
        }
        $check = Auth::guard('sanctum')->user();
        if (!$check) {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        } else {
            $data = Voucher::find($request->id);
            if ($data) {
                $data->update([
                    'tinh_trang'    => !$data->tinh_trang,
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Thay đổi trạng thái thành công!',
                    'data'      => $data
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Voucher không tồn tại!',
                ]);
            }
        }
    }

    // ─── VOUCHER THÔNG MINH ───────────────────────────────────────────────────

    /** Đề xuất voucher phù hợp khi đặt hàng */
    public function deXuatVoucher(Request $request)
    {
        $khach          = Auth::guard('sanctum')->user();
        $id_quan_an     = (int) $request->query('id_quan_an', 0);
        $tong_tien_hang = (int) $request->query('tong_tien', 0);

        if ($id_quan_an <= 0) {
            return response()->json(['status' => false, 'message' => 'Thieu id_quan_an']);
        }

        $de_xuat = VoucherService::deXuatVoucher($khach->id, $id_quan_an, $tong_tien_hang);

        return response()->json(['status' => true, 'data' => $de_xuat, 'total' => count($de_xuat)]);
    }

    /** Danh sách voucher cá nhân của khách hàng (private + system dành riêng) */
    public function voucherCuaToi()
    {
        $khach = Auth::guard('sanctum')->user();
        $now   = now()->toDateString();

        $vouchers = Voucher::where('tinh_trang', 1)
            ->where('thoi_gian_bat_dau', '<=', $now)
            ->where('thoi_gian_ket_thuc', '>=', $now)
            ->where(function ($q) use ($khach) {
                // Lấy voucher private hoặc system dành riêng cho khách này
                $q->where(function ($q2) use ($khach) {
                    $q2->where('loai_voucher', Voucher::LOAI_PRIVATE)
                        ->where('id_khach_hang_rieng', $khach->id);
                })->orWhere(function ($q2) use ($khach) {
                    $q2->where('loai_voucher', Voucher::LOAI_SYSTEM)
                        ->where('id_khach_hang_rieng', $khach->id);
                });
            })
            ->get()
            ->filter(fn($v) => $v->khachConDungDuoc($khach->id))
            ->map(fn($v) => array_merge($v->toArray(), [
                'so_tien_giam_mo_ta' => $v->loai_giam == Voucher::GIAM_PHAN_TRAM
                    ? "Giảm {$v->so_giam_gia}% (tối đa " . number_format($v->so_tien_toi_da) . 'đ)'
                    : 'Giảm ' . number_format($v->so_giam_gia) . 'đ',
            ]))
            ->values();

        return response()->json(['status' => true, 'data' => $vouchers]);
    }

    /** Danh sách voucher công khai dành cho tất cả khách hàng */
    public function voucherPublic()
    {
        $khach = Auth::guard('sanctum')->user();
        $now   = now()->toDateString();

        $vouchers = Voucher::where('tinh_trang', 1)
            ->where('loai_voucher', Voucher::LOAI_PUBLIC)
            ->where('thoi_gian_bat_dau', '<=', $now)
            ->where('thoi_gian_ket_thuc', '>=', $now)
            ->get()
            ->filter(fn($v) => $v->khachConDungDuoc($khach->id))
            ->map(fn($v) => array_merge($v->toArray(), [
                'so_tien_giam_mo_ta' => $v->loai_giam == Voucher::GIAM_PHAN_TRAM
                    ? "Giảm {$v->so_giam_gia}% (tối đa " . number_format($v->so_tien_toi_da) . 'đ)'
                    : 'Giảm ' . number_format($v->so_giam_gia) . 'đ',
            ]))
            ->values();

        return response()->json(['status' => true, 'data' => $vouchers]);
    }

    /** Admin: kích hoạt auto-generate thủ công */
    public function autoGenerate()
    {
        $login = Auth::guard('sanctum')->user();
        if ($login->is_master != 1) {
            return response()->json(['status' => false, 'message' => 'Chi master admin moi co quyen nay.']);
        }

        $stats = VoucherService::autoGenerateBanDem();

        return response()->json([
            'status'  => true,
            'message' => "Da tao {$stats['tao_moi']} voucher moi.",
            'data'    => $stats,
        ]);
    }

    /** Admin: thống kê hiệu quả voucher */
    public function thongKeVoucher()
    {
        $login = Auth::guard('sanctum')->user();
        if ($login->is_master != 1) {
            return response()->json(['status' => false, 'message' => 'Khong co quyen.']);
        }

        $top = VoucherUsage::selectRaw('id_voucher, COUNT(*) as so_luot, SUM(so_tien_da_giam) as tong_giam')
            ->with('voucher:id,ma_code,ten_voucher')
            ->groupBy('id_voucher')
            ->orderByDesc('so_luot')
            ->limit(10)
            ->get();

        return response()->json([
            'status' => true,
            'data'   => [
                'top_vouchers'   => $top,
                'tong_giam'      => VoucherUsage::sum('so_tien_da_giam'),
                'tong_luot_dung' => VoucherUsage::count(),
                'dang_hoat_dong' => Voucher::where('tinh_trang', 1)
                    ->where('thoi_gian_ket_thuc', '>=', now()->toDateString())->count(),
            ],
        ]);
    }

    /**
     * Admin: Tạo hàng loạt voucher theo gói định sẵn (đảm bảo có lợi nhuận)
     */
    public function batchGenerate(\Illuminate\Http\Request $request)
    {
        $login = Auth::guard('sanctum')->user();
        if ($login->is_master != 1) {
            return response()->json(['status' => false, 'message' => 'Chỉ master admin mới có quyền này.']);
        }

        $request->validate(['packages' => 'required|array|min:1']);

        $now      = now();
        $tong_tao = 0;
        $chi_tiet = [];

        foreach ($request->packages as $pkg) {
            $key      = $pkg['key']      ?? '';
            $so_luong = (int)($pkg['so_luong'] ?? 10);
            $han_dung = (int)($pkg['han_dung']  ?? 7);
            $bat_dau  = $now->toDateString();
            $ket_thuc = $now->copy()->addDays($han_dung)->toDateString();
            $tao_duoc = 0;

            for ($i = 0; $i < $so_luong; $i++) {
                $rand = strtoupper(\Illuminate\Support\Str::random(4)) . rand(10, 99);
                $base = [
                    'hinh_anh'        => null,
                    'id_quan_an'      => 0,
                    'loai_voucher'    => Voucher::LOAI_PUBLIC,
                    'thoi_gian_bat_dau'  => $bat_dau,
                    'thoi_gian_ket_thuc' => $ket_thuc,
                    'tinh_trang'      => 1,
                    'so_luot_da_dung' => 0,
                    'so_luot_moi_nguoi' => 1,
                ];

                $extra = match ($key) {
                    // 1. FREE SHIP — giảm 30k phí ship, đơn ≥100k → quán nhận đủ 100k+
                    'free_ship' => [
                        'ma_code'            => 'FREESHIP' . $rand,
                        'ten_voucher'        => 'Miễn Phí Vận Chuyển',
                        'mo_ta'              => 'Giảm phí giao hàng lên đến 30.000đ cho đơn từ 100.000đ',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/free-shipping-concept-illustration_114360-2274.jpg?w=800',
                        'loai_giam'          => Voucher::GIAM_TIEN_MAT,
                        'so_giam_gia'        => 30000,
                        'so_tien_toi_da'     => 30000,
                        'don_hang_toi_thieu' => 100000,
                        'so_luot_toi_da'     => 200,
                    ],
                    // 2. FLASH SALE — giảm 15% tối đa 50k, đơn ≥150k → quán nhận ≥100k
                    'flash_sale' => [
                        'ma_code'            => 'FLASH' . $rand,
                        'ten_voucher'        => 'Flash Sale – Giảm 15%',
                        'mo_ta'              => 'Ưu đãi chớp nhoáng! Giảm 15% tối đa 50.000đ cho đơn từ 150.000đ',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/flash-sale-editable-text-style-effect_1150-51784.jpg?w=800',
                        'loai_giam'          => Voucher::GIAM_PHAN_TRAM,
                        'so_giam_gia'        => 15,
                        'so_tien_toi_da'     => 50000,
                        'don_hang_toi_thieu' => 150000,
                        'so_luot_toi_da'     => 100,
                    ],
                    // 3. CUỐI TUẦN — giảm 20% tối đa 60k, đơn ≥200k → quán nhận ≥140k
                    'cuoi_tuan' => [
                        'ma_code'            => 'WEEKEND' . $rand,
                        'ten_voucher'        => 'Ưu Đãi Cuối Tuần',
                        'mo_ta'              => 'Đặt vào cuối tuần, giảm ngay 20% (tối đa 60.000đ) cho đơn từ 200.000đ',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/weekend-vibes-lettering-with-sun-sunglasses_23-2148560086.jpg?w=800',
                        'thoi_gian_bat_dau'  => $now->copy()->next('Friday')->toDateString(),
                        'thoi_gian_ket_thuc' => $now->copy()->next('Sunday')->toDateString(),
                        'loai_giam'          => Voucher::GIAM_PHAN_TRAM,
                        'so_giam_gia'        => 20,
                        'so_tien_toi_da'     => 60000,
                        'don_hang_toi_thieu' => 200000,
                        'so_luot_toi_da'     => 50,
                    ],
                    // 4. ĐƠN LỚN — giảm 50k, đơn ≥300k → quán nhận ≥250k, lợi nhuận cao
                    'don_lon' => [
                        'ma_code'            => 'DONLON' . $rand,
                        'ten_voucher'        => 'Giảm 50K Đơn Lớn',
                        'mo_ta'              => 'Đặt từ 300.000đ, giảm ngay 50.000đ – Càng ăn nhiều càng tiết kiệm!',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/big-sale-banner-template_1055-6629.jpg?w=800',
                        'loai_giam'          => Voucher::GIAM_TIEN_MAT,
                        'so_giam_gia'        => 50000,
                        'so_tien_toi_da'     => 50000,
                        'don_hang_toi_thieu' => 300000,
                        'so_luot_toi_da'     => 150,
                    ],
                    // 5. CHÀO MỪNG — giảm 20k, đơn ≥80k → chuyển đổi khách mới
                    'chao_mung' => [
                        'ma_code'            => 'WELCOME' . $rand,
                        'ten_voucher'        => 'Chào Mừng Bạn Mới!',
                        'mo_ta'              => 'Đơn đầu tiên – giảm ngay 20.000đ cho đơn từ 80.000đ',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/welcome-concept-illustration_114360-4966.jpg?w=800',
                        'loai_giam'          => Voucher::GIAM_TIEN_MAT,
                        'so_giam_gia'        => 20000,
                        'so_tien_toi_da'     => 20000,
                        'don_hang_toi_thieu' => 80000,
                        'so_luot_toi_da'     => 500,
                    ],
                    // 6. GIỜ VÀNG — giảm 10% tối đa 30k, đơn ≥80k → lấp đầy giờ thấp điểm
                    'gio_vang' => [
                        'ma_code'            => 'GIOVANG' . $rand,
                        'ten_voucher'        => 'Giờ Vàng – Giảm 10%',
                        'mo_ta'              => 'Đặt trong giờ vàng (10–11h hoặc 17–19h), giảm 10% tối đa 30.000đ',
                        'hinh_anh'           => 'https://img.freepik.com/free-vector/happy-hour-neon-sign_23-2148169994.jpg?w=800',
                        'loai_giam'          => Voucher::GIAM_PHAN_TRAM,
                        'so_giam_gia'        => 10,
                        'so_tien_toi_da'     => 30000,
                        'don_hang_toi_thieu' => 80000,
                        'so_luot_toi_da'     => 300,
                    ],
                    default => null,
                };

                if ($extra !== null) {
                    Voucher::create(array_merge($base, $extra));
                    $tao_duoc++;
                }
            }

            if ($tao_duoc > 0) {
                $chi_tiet[] = ['loai' => $key, 'so_luong' => $tao_duoc];
                $tong_tao  += $tao_duoc;
            }
        }

        return response()->json([
            'status'  => true,
            'message' => "Đã tạo thành công {$tong_tao} voucher!",
            'data'    => ['tong_tao' => $tong_tao, 'chi_tiet' => $chi_tiet],
        ]);
    }

    /**
     * Admin: Gửi email khuyến mãi cho tất cả khách hàng đang hoạt động
     */
    public function guiEmailKhuyenMai(Request $request)
    {
        $login = Auth::guard('sanctum')->user();
        if ($login->is_master != 1) {
            return response()->json(['status' => false, 'message' => 'Chỉ master admin mới có quyền này.']);
        }

        $request->validate([
            'voucher_ids' => 'required|array|min:1',
        ]);

        $vouchers = Voucher::whereIn('id', $request->voucher_ids)
            ->where('tinh_trang', 1)
            ->get();

        if ($vouchers->isEmpty()) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy voucher hợp lệ!']);
        }

        // Chuẩn bị data voucher cho email
        $voucherData = $vouchers->map(fn($v) => [
            'ma_code'      => $v->ma_code,
            'loai_giam'    => $v->loai_giam,
            'so_giam'      => $v->so_giam_gia,
            'don_toi_thieu' => $v->don_hang_toi_thieu,
            'han_su_dung'  => \Carbon\Carbon::parse($v->thoi_gian_ket_thuc)->format('d/m/Y'),
        ])->toArray();

        // Lấy tất cả khách hàng đang hoạt động
        $khachHangs = \App\Models\KhachHang::where('is_active', 1)
            ->where('is_block', 0)
            ->whereNotNull('email')
            ->get();

        $sent = 0;
        foreach ($khachHangs as $kh) {
            try {
                \App\Jobs\SendMailJob::dispatch(
                    $kh->email,
                    '🎟️ FoodBee dành tặng bạn voucher giảm giá!',
                    'emails.khuyen_mai',
                    [
                        'ho_ten'   => $kh->ho_va_ten,
                        'vouchers' => $voucherData,
                    ]
                );
                $sent++;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Lỗi gửi email KM cho {$kh->email}: " . $e->getMessage());
            }
        }

        return response()->json([
            'status'  => true,
            'message' => "Đã gửi email khuyến mãi cho {$sent}/{$khachHangs->count()} khách hàng!",
        ]);
    }
}
