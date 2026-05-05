<?php

namespace App\Http\Controllers;


use App\Http\Requests\Admin\AdminLoginRequest;
use App\Http\Requests\NhanVien\createNhanVienRequest;
use App\Http\Requests\NhanVien\deleteNhanVienRequest;
use App\Http\Requests\NhanVien\NhanVienDoiMatKhauRequest;
use App\Http\Requests\NhanVien\NhanVienUpdateProfileRequest;
use App\Http\Requests\NhanVien\updateNhanVienRequest;
use App\Models\NhanVien;
use App\Models\PhanQuyen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class NhanVienController extends Controller
{
    public function search(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data   =  NhanVien::where('ho_va_ten', 'like', $noi_dung_tim)
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

    public function Login(AdminLoginRequest $request)
    {
        $check = NhanVien::where('email', $request->email)->first();

        if (!$check || !Hash::check($request->password, $check->password)) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản hoặc mật khẩu không đúng.",
            ]);
        }

        if ($check->tinh_trang == 0) {
            return response()->json([
                'status'  => 0,
                'message' => "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên!",
            ]);
        }

        return response()->json([
            'status'  => 1,
            'message' => "Đăng nhập thành công!",
            'token'   => $check->createToken('token_nhan_vien')->plainTextToken,
        ]);
    }

    public function profile()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            $nhanVien = NhanVien::where('id', $user_login->id)->first();
            return response()->json([
                'status'    => 1,
                'data'      => $nhanVien
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }

    public function doiMatKhau(NhanVienDoiMatKhauRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = NhanVien::where('id', $user->id)->first();
        if ($data && Hash::check($request->mat_khau_cu, $data->password)) {
            $data->update([
                'password' => bcrypt($request->mat_khau_moi),
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật mật khẩu thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Mật khẩu cũ không đúng!',
            ]);
        }
    }

    public function updateProfile(NhanVienUpdateProfileRequest $request)
    {
        $user = Auth::guard('sanctum')->user();
        $data = NhanVien::find($user->id);
        if ($data) {
            $data->update([
                'ho_va_ten'     => $request->ho_va_ten,
                'so_dien_thoai' => $request->so_dien_thoai,
                'email'         => $request->email,
                'dia_chi'     => $request->dia_chi
            ]);
            return response()->json([
                'status'    => 1,
                'message'   => 'Cập nhật thông tin thành công!',
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Thông tin nhân viên không tồn tại!',
            ]);
        }
    }

    public function checkToken()
    {
        $user_login = Auth::guard('sanctum')->user();
        if ($user_login) {
            return response()->json([
                'status'    => 1,
                'ho_ten'    => $user_login->ho_va_ten
            ]);
        } else {
            return response()->json([
                'status'    => 0,
                'message'   => 'Bạn cần đăng nhập hệ thống!'
            ]);
        }
    }

    public function getData()
    {
        $id_chuc_nang = 1;
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
        $data = NhanVien::join('chuc_vus', 'nhan_viens.id_chuc_vu', 'chuc_vus.id')
            ->select('nhan_viens.*', 'chuc_vus.ten_chuc_vu')
            ->get();
        return response()->json([
            'status' => true,
            'data' => $data,
            'message' => "Lấy dữ liệu nhân viên thành công",
        ]);
    }

    public function store(createNhanVienRequest $request)
    {
        $id_chuc_nang = 2;
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
        $nhanVien = NhanVien::create([
            'email'         => $request->email,
            'ho_va_ten'     => $request->ho_va_ten,
            'password'      => bcrypt($request->password),
            'so_dien_thoai' => $request->so_dien_thoai,
            'dia_chi'       => $request->dia_chi,
            'ngay_sinh'     => $request->ngay_sinh,
            'tinh_trang'    => $request->tinh_trang,
            'id_chuc_vu'    => $request->id_chuc_vu,
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Thêm ' . $request->ho_va_ten . ' thành công',
            'data' => $nhanVien,
        ]);
    }

    public function update(updateNhanVienRequest $request)
    {
        $id_chuc_nang = 3;
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
        $nhanVien = NhanVien::where('id', $request->id)->update([
            'email'         => $request->email,
            'ho_va_ten'     => $request->ho_va_ten,
            'password'      => bcrypt($request->password),
            'so_dien_thoai' => $request->so_dien_thoai,
            'dia_chi'       => $request->dia_chi,
            'ngay_sinh'     => $request->ngay_sinh,
            'tinh_trang'    => $request->tinh_trang,
            'id_chuc_vu'    => $request->id_chuc_vu,
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật ' . $request->ho_va_ten . ' thành công',
            'data' => $nhanVien,
        ]);
    }

    public function destroy(deleteNhanVienRequest $request)
    {
        $id_chuc_nang = 4;
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
        $user = Auth::guard('sanctum')->user();
        $nhanVien = NhanVien::where('id', $request->id)->first();
        if ($nhanVien->is_master == 1) {
            return response()->json([
                'status'  => 0,
                'message' => 'Bạn không thể xóa tài khoản master!!!'
            ]);
        } else if ($nhanVien->id == $user->id) {
            return response()->json([
                'status'  => 0,
                'message' => 'Bạn không thể xóa tài khoản bạn đang đăng nhập'
            ]);
        } else {
            $nhanVien->delete();
            return response()->json([
                'status'  => 1,
                'message' => 'Bạn đã xóa tài khoản nhân viên ' . $request->ho_va_ten . ' thành công!!!',
                'data' => $nhanVien,
            ]);
        }
    }

    public function changeStatus(deleteNhanVienRequest $request)
    {
        $id_chuc_nang = 5;
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
        $nhanVien = NhanVien::where('id', $request->id)->first();
        if ($nhanVien->tinh_trang == 1) {
            $nhanVien->tinh_trang = 0;
            $nhanVien->save();
        } else {
            $nhanVien->tinh_trang = 1;
            $nhanVien->save();
        }
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật trạng thái ' . $request->ho_va_ten . ' thành công',
            'data' => $nhanVien,
        ]);
    }
}
