<?php

namespace App\Http\Controllers;

use App\Http\Requests\Shipper\activeShipperRequest;
use App\Http\Requests\Shipper\CapNhatShipperRequest;
use App\Http\Requests\Shipper\changeShipperRequest;

use App\Http\Requests\Shipper\ShipperDangKyRequest;

use App\Http\Requests\Auth\ShipperLoginRequest;

use App\Http\Requests\Shipper\ThemMoiShipperRequest;
use App\Http\Requests\Shipper\updatePasswordShipperRequest;
use App\Http\Requests\Shipper\updateProFileShipperRequest;
use App\Http\Requests\Shipper\XoaShipperRequest;
use App\Http\Requests\Shipper\UpdateShipperLocationRequest;
use App\Jobs\SendMailJob;
use App\Events\DonHangHoanThanhEvent;
use App\Events\DonHangDaNhanEvent;
use App\Jobs\UpdateShipperStatusJob;
use App\Services\ShipperLocationService;
use App\Jobs\CalculateRevenueJob;
use App\Jobs\SendNotificationJob;

use App\Models\DiaChi;
use App\Models\DonHang;
use App\Models\PhanQuyen;
use App\Models\Shipper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class ShipperController extends Controller
{
    public function search(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data = Shipper::withCount(['donHangs as tong_chuyen' => function ($query) {
                $query->where('tinh_trang', 4);
            }])
            ->leftJoin('dia_chis', 'shippers.id_dia_chi', '=', 'dia_chis.id')
            ->leftJoin('quan_huyens', 'dia_chis.id_quan_huyen', '=', 'quan_huyens.id')
            ->leftJoin('tinh_thanhs', 'quan_huyens.id_tinh_thanh', '=', 'tinh_thanhs.id')
            ->select(
                'shippers.*',
                'dia_chis.dia_chi',
                'dia_chis.id_quan_huyen',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh'
            )
            ->where(function ($query) use ($noi_dung_tim) {
                $query->where('shippers.ho_va_ten', 'like', $noi_dung_tim)
                      ->orWhere('shippers.email', 'like', $noi_dung_tim)
                      ->orWhere('shippers.so_dien_thoai', 'like', $noi_dung_tim)
                      ->orWhere('shippers.cccd', 'like', $noi_dung_tim);
            })
            ->get();
        return response()->json([
            'data'  => $data
        ]);
    }
    public function DangXuat()
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            DB::table('personal_access_tokens')
                ->where('id', $user->currentAccessToken()->id)
                ->delete();
            return response()->json([
                'status'  => 1,
                'message' => "Đăng xuất thành công",
            ]);
        } else {
            return response()->json([
                'status'  => 0,
                'message' => "Có lỗi xảy ra",
            ]);
        }
    }

    public function DangXuatAll()
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $ds_token = $user->tokens;
            foreach ($ds_token as $key => $value) {
                $value->delete();
            }
            return response()->json([
                'status'  => 1,
                'message' => "Đăng xuất thành công",
            ]);
        } else {
            return response()->json([
                'status'  => 0,
                'message' => "Có lỗi xảy ra",
            ]);
        }
    }
    public function checkTokenShipper()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            return response()->json([
                'status'    => 1,
                'ho_ten'    => $user_login->ho_va_ten,
                'shipper'   => $user_login, // Return the full object so .id exists
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function Login(ShipperLoginRequest $request)
    {
        $check = Shipper::where('email', $request->email)->first();
        if ($check && Hash::check($request->password, $check->password)) {
            // Kiểm tra tài khoản đã được admin duyệt chưa
            if ($check->is_active == 0) {
                return response()->json([
                    'status'  => 2,
                    'message' => 'Tài khoản của bạn đang chờ admin duyệt. Vui lòng chờ xác nhận!',
                ]);
            }
            if ($check->is_block == 1) {
                return response()->json([
                    'status'  => 0,
                    'message' => 'Tài khoản của bạn đã bị chặn. Vui lòng liên hệ Admin!',
                ]);
            }
            return response()->json([
                'status' => 1,
                'message' => "Đăng nhập thành công!",
                'token' => $check->createToken('token_shipper')->plainTextToken,
                'shipper' => [
                    'id' => $check->id,
                    'ho_va_ten' => $check->ho_va_ten,
                    'email' => $check->email,
                    'so_dien_thoai' => $check->so_dien_thoai,
                    'cccd' => $check->cccd,
                    'hinh_anh' => $check->hinh_anh,
                    'is_active' => $check->is_active,
                    'is_open' => $check->is_open,
                    'tong_tien' => $check->tong_tien ?? 0,
                    'ten_chuc_vu' => 'Shipper',
                ],
            ]);
        } else {
            return response()->json([
                'status' => 0,
                'message' => "Tài khoản hoặc mật khẩu không đúng.",
            ]);
        }
    }
    public function getData()
    {
        $id_chuc_nang = 6;
        $login = Auth::guard('sanctum')->user();
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
        $shipper = Shipper::withCount(['donHangs as tong_chuyen' => function ($query) {
                $query->where('tinh_trang', 4);
            }])
            ->leftJoin('dia_chis', 'shippers.id_dia_chi', '=', 'dia_chis.id')
            ->leftJoin('quan_huyens', 'dia_chis.id_quan_huyen', '=', 'quan_huyens.id')
            ->leftJoin('tinh_thanhs', 'quan_huyens.id_tinh_thanh', '=', 'tinh_thanhs.id')
            ->select(
                'shippers.*',
                'dia_chis.dia_chi',
                'dia_chis.id_quan_huyen',
                'quan_huyens.ten_quan_huyen',
                'tinh_thanhs.ten_tinh_thanh'
            )
            ->get();
        return response()->json([
            'data' => $shipper
        ]);
    }
    public function store(ThemMoiShipperRequest $request)
    {
        $id_chuc_nang = 7;
        $login = Auth::guard('sanctum')->user();
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
        // Tạo shipper
        $shipper = Shipper::create([
            'ho_va_ten'     => $request->ho_va_ten,
            'so_dien_thoai' => $request->so_dien_thoai,
            'email'         => $request->email,
            'password'      => bcrypt($request->password),
            'cccd'          => $request->cccd,
            'is_active'     => $request->is_active ?? 1,
            'is_open'       => $request->is_open ?? 0,
        ]);

        // Tạo địa chỉ nếu có
        if ($request->dia_chi && $request->id_quan_huyen) {
            $diaChi = DiaChi::create([
                'id_shipper'    => $shipper->id,
                'id_khach_hang' => 0,
                'id_quan_huyen' => $request->id_quan_huyen,
                'dia_chi'       => $request->dia_chi,
                'ten_nguoi_nhan' => $request->ho_va_ten,
                'so_dien_thoai'  => $request->so_dien_thoai,
            ]);
            $shipper->update(['id_dia_chi' => $diaChi->id]);
        }

        return response()->json([
            'status'  => 1,
            'message' => 'Đã thêm mới shipper ' . $request->ho_va_ten . ' thành công.'
        ]);
    }

    public function destroy(XoaShipperRequest $request)
    {
        $id_chuc_nang = 9;
        $login = Auth::guard('sanctum')->user();
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
        Shipper::where('id', $request->id)->delete();
        return response()->json([
            'status'    =>  1,
            'message'   =>  'Đã xóa shipper ' . $request->ho_va_ten . ' thành công'
        ]);
    }

    public function update(CapNhatShipperRequest $request)
    {
        $id_chuc_nang = 8;
        $login = Auth::guard('sanctum')->user();
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
        $shipper = Shipper::find($request->id);

        if (!$shipper) {
            return response()->json([
                'status'  => 0,
                'message' => 'Shipper cần cập nhật không tồn tại.'
            ]);
        }

        $shipper->update([
            'ho_va_ten'     => $request->ho_va_ten,
            'email'         => $request->email,
            'cccd'          => $request->cccd,
            'so_dien_thoai' => $request->so_dien_thoai,
            'is_active'     => $request->is_active ?? $shipper->is_active,
            'is_open'      => $request->is_open ?? $shipper->is_open,
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Đã cập nhật shipper  ' . $request->ho_va_ten . ' thành công.'
        ]);
    }

    public function changeStatus(changeShipperRequest  $request)
    {
        $id_chuc_nang = 10;
        $login = Auth::guard('sanctum')->user();
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
        $shipper = Shipper::where('id', $request->id)->first();

        if ($shipper->is_block == 1) {
            $shipper->is_block = 0;
        } else {
            $shipper->is_block = 1;
            // Nếu bị chặn thì tự động tắt online luôn
            $shipper->is_open = 0;
        }
        $shipper->save();

        return response()->json([
            'status'    =>  true,
            'message'   =>  'Bạn đã cập nhật trạng thái ' . $request->ho_va_ten . ' thành công'
        ]);
    }

    public function active(activeShipperRequest $request)
    {
        $id_chuc_nang = 11;
        $login = Auth::guard('sanctum')->user();
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
        $shipper = Shipper::where('id', $request->id)->first();
        if ($shipper) {
            if ($shipper->is_active) {
                return response()->json([
                    'status'  => 2,
                    'message' => "Tài khoản đã được kích hoạt trước đó ",
                ]);
            } else {
                $shipper->is_active = 1;
                $shipper->save();
                return response()->json([
                    'status'  => 1,
                    'message' => "Kích hoạt tài khoản thành công ",
                ]);
            }
        } else {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản không tồn tại ",
            ]);
        }
    }
    public function dataSP()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            $shipper = Shipper::leftJoin('dia_chis', 'shippers.id_dia_chi', '=', 'dia_chis.id')
                ->where('shippers.id', $user_login->id)
                ->select('shippers.*', 'dia_chis.dia_chi')
                ->first();

            // Tính tổng số chuyến giao thành công (tinh_trang = 4)
            $tong_chuyen = \App\Models\DonHang::where('id_shipper', $user_login->id)
                ->where('tinh_trang', 4)
                ->count();

            // Xác định hạng dựa trên tổng chuyến
            if ($tong_chuyen < 50) $hang = 'Đồng';
            elseif ($tong_chuyen < 200) $hang = 'Bạc';
            elseif ($tong_chuyen < 500) $hang = 'Vàng';
            else $hang = 'Kim Cương';

            $data = $shipper->toArray();
            $data['tong_chuyen'] = $tong_chuyen;
            $data['hang_shipper'] = $hang;

            return response()->json([
                'status'    => 1,
                'data'      => $data
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function updateSP(updateProFileShipperRequest $request)
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            $shipper = Shipper::find($user_login->id);

            // Cập nhật hoặc tạo mới địa chỉ trong bảng dia_chis
            if ($shipper->id_dia_chi) {
                DiaChi::where('id', $shipper->id_dia_chi)->update([
                    'dia_chi' => $request->dia_chi,
                    'ten_nguoi_nhan' => $request->ho_va_ten,
                    'so_dien_thoai' => $request->so_dien_thoai,
                ]);
            } else {
                $newDiaChi = DiaChi::create([
                    'id_shipper' => $shipper->id,
                    'id_khach_hang' => 0,
                    'id_quan_huyen' => 0, // Mặc định hoặc lấy từ đâu đó
                    'dia_chi' => $request->dia_chi,
                    'ten_nguoi_nhan' => $request->ho_va_ten,
                    'so_dien_thoai' => $request->so_dien_thoai,
                ]);
                $shipper->id_dia_chi = $newDiaChi->id;
            }

            $shipper->ho_va_ten = $request->ho_va_ten;
            $shipper->cccd = $request->cccd;
            $shipper->so_dien_thoai = $request->so_dien_thoai;
            $shipper->save();

            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật thông tin thành công!'
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }

    public function toggleStatus(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $shipper = Shipper::find($user->id);
            if ($shipper) {
                // Check if trying to go offline with ongoing orders
                if ($shipper->is_open == 1) {
                    $ongoingOrders = \App\Models\DonHang::where('id_shipper', $shipper->id)
                        ->whereIn('tinh_trang', [1, 2, 3])
                        ->count();
                    if ($ongoingOrders > 0) {
                        return response()->json([
                            'status'  => 0,
                            'message' => 'Bạn không thể tắt hoạt động khi đang có đơn hàng chưa hoàn thành!'
                        ]);
                    }
                }

                // Toggle is_open
                $shipper->is_open = $shipper->is_open == 1 ? 0 : 1;
                $shipper->save();
                
                // If the system has a job to update status (like changeStatus does), we could dispatch it
                // \App\Jobs\UpdateShipperStatusJob::dispatch($shipper->id, $shipper->is_open);
                
                return response()->json([
                    'status'  => 1,
                    'message' => $shipper->is_open == 1 ? 'Đã BẬT hoạt động!' : 'Đã TẮT hoạt động!',
                    'is_open' => $shipper->is_open
                ]);
            }
        }
        return response()->json([
            'status'  => 0,
            'message' => 'Bạn cần đăng nhập hệ thống!'
        ]);
    }

    public function updatePassword(updatePasswordShipperRequest $request)
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            if (Hash::check($request->old_password, $user_login->password)) {
                Shipper::where('id', $user_login->id)->update([
                    'password'  => bcrypt($request->password),
                ]);
                return response()->json([
                    'status'    => 1,
                    'message'   => 'Cập nhật mật khẩu thành công!'
                ]);
            }
            return response()->json([
                'status'    => 0,
                'message'   => 'Mật khẩu cũ không đúng!'
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }
    public function dataDonHangNhan()
    {
        $user = Auth::guard('sanctum')->user();
        $data = DonHang::join('khach_hangs', 'don_hangs.id_khach_hang', '=', 'khach_hangs.id')
            ->join('quan_ans', 'quan_ans.id', '=', 'don_hangs.id_quan_an')
            ->leftJoin('shippers', 'shippers.id', '=', 'don_hangs.id_shipper')
            ->leftJoin('dia_chis', 'dia_chis.id', '=', 'don_hangs.id_dia_chi_nhan')
            ->where('don_hangs.id_shipper', $user->id)
            ->whereIn('don_hangs.tinh_trang', [1, 2, 3])
            ->orderBy('don_hangs.created_at', 'desc')
            ->select(
                'don_hangs.*',
                'khach_hangs.ho_va_ten',
                'quan_ans.ten_quan_an',
                'shippers.ho_va_ten',
                'quan_ans.toa_do_y as restaurant_lat',
                'quan_ans.toa_do_x as restaurant_lng',
                'dia_chis.toa_do_y as customer_lat',
                'dia_chis.toa_do_x as customer_lng'
            )
            ->get();

        return response()->json([
            'data'      => $data
        ]);
    }
    public function dataDaGiao()
    {
        $user = Auth::guard('sanctum')->user();

        if ($user) {
            $data = DonHang::where('don_hangs.id_shipper', $user->id)
                ->where('don_hangs.tinh_trang', 4)
                ->join('quan_ans', 'quan_ans.id', 'don_hangs.id_quan_an')
                ->join('khach_hangs', 'khach_hangs.id', 'don_hangs.id_khach_hang')
                ->leftjoin('shippers', 'shippers.id', 'don_hangs.id_shipper')
                ->select('don_hangs.*', 'khach_hangs.ho_va_ten', 'quan_ans.ten_quan_an', 'quan_ans.hinh_anh', 'shippers.ho_va_ten as ten_shipper')
                ->orderBy('don_hangs.created_at', 'desc')
                ->get();

            return response()->json([
                'user'  => $user->ho_va_ten,
                'data'  => $data,
            ]);
        }
    }
    public function nhanDonHang(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('[DEBUG-SHIPPER] === ShipperController::nhanDonHang ĐƯỢC GỌI, order_id=' . ($request->id ?? 'null') . ' ===');
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $shipper = Shipper::find($user->id);
            if ($shipper && $shipper->is_open == 0) {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Bạn phải BẬT HOẠT ĐỘNG để nhận đơn hàng!'
                ]);
            }

            $donHang = DonHang::find($request->id);
            if ($donHang) {
                if ($donHang->id_shipper == $user->id) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Đơn hàng đã được bạn nhận!'
                    ]);
                } else if ($donHang->id_shipper != null) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Đơn hàng đã được shipper khác nhận!'
                    ]);
                }
                $donHang->id_shipper = $user->id;
                $donHang->tinh_trang = 1; // Cập nhật trạng thái: chờ quán nhận
                $donHang->save();

                // ── Broadcast: thông báo shipper đã nhận đơn cho KH & quán ──
                \Illuminate\Support\Facades\Log::info('[DEBUG-SHIPPER] Đang fire DonHangDaNhanEvent cho đơn #' . $donHang->ma_don_hang);
                try {
                    event(new \App\Events\DonHangDaNhanEvent($donHang->fresh()));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('[DEBUG-SHIPPER] Lỗi DonHangDaNhanEvent: ' . $e->getMessage());
                }

                return response()->json([
                    'status'    => 1,
                    'message'   => 'Nhận đơn hàng thành công!'
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Đơn hàng không tồn tại!'
                ]);
            }
        }
    }
    public function hoanThanhDonHang(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $donHang = DonHang::find($request->id);
            if ($donHang) {
                if ($donHang->id_shipper !== $user->id) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Bạn không thể hoàn thành đơn hàng này!'
                    ]);
                } else if ($donHang->tinh_trang == 4) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Đơn hàng này đã được giao trước đó!'
                    ]);
                } else if ($donHang->tinh_trang != 3) {
                    return response()->json([
                        'status'    => 0,
                        'message'   => 'Đơn hàng chưa được quán chuẩn bị trả hàng!'
                    ]);
                }
                $donHang->tinh_trang    = 4;
                $donHang->is_thanh_toan = 1;
                $donHang->save();
                
                // THỐNG NHẤT: Không cộng tiền trực tiếp ở đây nữa, đẩy hết vào Queue Job
                // CalculateRevenueJob sẽ gọi WalletService::doiSoatDonHang
                CalculateRevenueJob::dispatch($donHang->id);

                // CỘNG XU TÍCH LŨY CHO KHÁCH HÀNG (NẾU CÓ)
                if ($donHang->xu_tich_luy > 0) {
                    $khachHang = \App\Models\KhachHang::find($donHang->id_khach_hang);
                    if ($khachHang) {
                        $khachHang->diem_xu += $donHang->xu_tich_luy;
                        $khachHang->save();

                        \App\Models\LichSuXu::create([
                            'id_khach_hang'     => $khachHang->id,
                            'id_don_hang'       => $donHang->id,
                            'so_xu'             => $donHang->xu_tich_luy,
                            'loai_giao_dich'    => 1, // 1 = Tích lũy mua hàng
                            'mo_ta'             => 'Tích lũy xu từ đơn hàng ' . $donHang->ma_don_hang,
                        ]);
                    }
                }

                // Trigger Broadcasting Event: Thông báo shipper đã giao xong đơn
                try {
                    event(new DonHangHoanThanhEvent($donHang));
                    
                    // THÊM: Tính toán doanh thu qua Queue
            $donHang->refresh(); 
            // WalletService::doiSoatDonHang($donHang); // XÓA: Chuyển sang Queue
            \App\Jobs\CalculateRevenueJob::dispatch($donHang->id);
                    
                    // THÊM: Gửi thông báo hoàn thành đơn hàng cho Khách hàng
                    SendNotificationJob::dispatch(
                        $donHang->id_khach_hang,
                        'khach_hang',
                        'Đơn hàng hoàn thành',
                        'Đơn hàng ' . $donHang->ma_don_hang . ' đã được giao thành công!'
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Lỗi khi phát sự kiện DonHangHoanThanhEvent: ' . $e->getMessage());
                }

                return response()->json([
                    'status'    => 1,
                    'message'   => 'Hoàn thành đơn hàng thành công!'
                ]);
            } else {
                return response()->json([
                    'status'    => 0,
                    'message'   => 'Đơn hàng không tồn tại!'
                ]);
            }
        }
    }


    public function Register(ShipperDangKyRequest $request)
    {
        // Kiểm tra email đã đăng ký làm shipper chưa
        if (Shipper::where('email', $request->email)->exists()) {
            return response()->json([
                'status'  => 0,
                'message' => 'Email này đã được đăng ký làm shipper. Vui lòng dùng email khác!'
            ]);
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        if (Shipper::where('so_dien_thoai', $request->so_dien_thoai)->exists()) {
            return response()->json([
                'status'  => 0,
                'message' => 'Số điện thoại này đã được đăng ký làm shipper!'
            ]);
        }

        // Tạo tài khoản shipper với is_active = 0 (chờ admin duyệt)
        $shipper = Shipper::create([
            'ho_va_ten'     => $request->ho_va_ten,
            'email'         => $request->email,
            'password'      => bcrypt($request->password),
            'cccd'          => $request->cccd,
            'so_dien_thoai' => $request->so_dien_thoai,
            'is_active'     => 0,
        ]);

        // Tạo địa chỉ thường trú nếu shipper điền
        if ($request->dia_chi && $request->id_quan_huyen) {
            $diaChi = DiaChi::create([
                'id_shipper'     => $shipper->id,
                'id_khach_hang'  => 0,
                'id_quan_huyen'  => $request->id_quan_huyen,
                'dia_chi'        => $request->dia_chi,
                'ten_nguoi_nhan' => $request->ho_va_ten,
                'so_dien_thoai'  => $request->so_dien_thoai,
            ]);
            $shipper->update(['id_dia_chi' => $diaChi->id]);
        }

        return response()->json([
            'status'  => 1,
            'message' => 'Đăng ký thành công! Tài khoản của bạn đang chờ admin xét duyệt. Chúng tôi sẽ thông báo khi tài khoản được kích hoạt.'
        ]);
    }

    /**
     * Cập nhật vị trí đơn giản - chỉ cần lat/lng
     * Không cần id_don_hang
     */
    public function capNhatViTri(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        $validated = $request->validate([
            'lat'      => 'required|numeric|between:-90,90',
            'lng'      => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ]);

        $shipper = Shipper::find($user->id);
        $locationService = new ShipperLocationService();
        $result = $locationService->updateLocation(
            $shipper,
            floatval($validated['lat']),
            floatval($validated['lng']),
            isset($validated['accuracy']) ? floatval($validated['accuracy']) : null,
        );

        return response()->json([
            'status'  => $result['flagged'] ? 0 : 1,
            'message' => $result['flagged']
                ? 'Vị trí không hợp lệ và đã được ghi nhận.'
                : 'Đã cập nhật vị trí thành công',
            'flagged' => $result['flagged'],
            'lat'     => $result['lat']  ?? floatval($validated['lat']),
            'lng'     => $result['lng']  ?? floatval($validated['lng']),
        ]);
    }
    public function guiMaQuenMatKhau(Request $request)
    {
        $shipper = Shipper::where('email', $request->email)->first();
        if (!$shipper) {
            return response()->json([
                'status'  => 0,
                'message' => 'Email không tồn tại trong hệ thống!'
            ]);
        }
        $ma_otp = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        \Illuminate\Support\Facades\Cache::put('shipper_quen_mat_khau_' . $request->email, $ma_otp, now()->addMinutes(10));
        $data = ['ho_va_ten' => $shipper->ho_va_ten, 'ma_otp' => $ma_otp];
        SendMailJob::dispatch($request->email, 'Đặt lại mật khẩu FoodBee Shipper', 'quen_mat_khau_otp', $data);
        return response()->json(['status' => 1, 'message' => 'Mã xác nhận đã được gửi tới email!']);
    }

    public function quenMatKhau(Request $request)
    {
        $shipper = Shipper::where('email', $request->email)->first();
        if (!$shipper) 
            return response()->json([
                'status' => 0, 
                'message' => 'Email không tồn tại!']);
        $cache = \Illuminate\Support\Facades\Cache::get('shipper_quen_mat_khau_' . $request->email);
        if (!$cache || $request->ma_otp != $cache) 
            return response()->json([
                'status' => 0, 
                'message' => 'Mã sai hoặc hết hạn!']);
        $shipper->update(['password' => bcrypt($request->new_password)]);
        \Illuminate\Support\Facades\Cache::forget('shipper_quen_mat_khau_' . $request->email);
        return response()->json([
            'status' => 1, 
            'message' => 'Đặt lại mật khẩu thành công!']);
    }

    public function getDanhGiaShipper()
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => 0, 'message' => 'Bạn cần đăng nhập!']);
        }

        // Lấy tất cả đánh giá của shipper kèm thông tin khách hàng
        $danhGias = DB::table('danh_gias')
            ->join('khach_hangs', 'danh_gias.id_khach_hang', '=', 'khach_hangs.id')
            ->join('don_hangs', 'danh_gias.id_don_hang', '=', 'don_hangs.id')
            ->where('danh_gias.id_shipper', $user->id)
            ->whereNotNull('danh_gias.sao_shipper')
            ->select(
                'danh_gias.id',
                'danh_gias.sao_shipper',
                'danh_gias.nhan_xet_shipper',
                'danh_gias.created_at',
                'khach_hangs.ho_va_ten as ten_khach_hang',
                'khach_hangs.avatar as avatar_khach_hang',
                'don_hangs.ma_don_hang'
            )
            ->orderBy('danh_gias.created_at', 'desc')
            ->get();

        // Tính thống kê
        $tongDanhGia = $danhGias->count();
        $trungBinhSao = $tongDanhGia > 0 ? round($danhGias->avg('sao_shipper'), 1) : 0;

        $thongKeSao = [];
        for ($i = 5; $i >= 1; $i--) {
            $so = $danhGias->where('sao_shipper', $i)->count();
            $thongKeSao[$i] = [
                'so_luong' => $so,
                'phan_tram' => $tongDanhGia > 0 ? round(($so / $tongDanhGia) * 100) : 0,
            ];
        }

        return response()->json([
            'status'        => 1,
            'tong_danh_gia' => $tongDanhGia,
            'trung_binh_sao'=> $trungBinhSao,
            'thong_ke_sao'  => $thongKeSao,
            'danh_sach'     => $danhGias,
        ]);
    }
}
