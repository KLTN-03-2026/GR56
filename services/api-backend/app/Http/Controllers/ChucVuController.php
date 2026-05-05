<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChucVu\createChucVuRequest;
use App\Http\Requests\ChucVu\deleteChucVuRequest;
use App\Http\Requests\ChucVu\updateChucVuRequest;
use App\Models\ChucVu;
use App\Models\PhanQuyen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ChucVuController extends Controller
{
    public function getData()
    {
        $id_chuc_nang = 34;
        $user = Auth::guard('sanctum')->user();
        // Nếu là master admin thì bỏ qua kiểm tra quyền
        if ($user->is_master != 1) {
            $id_chuc_nang = 5;
            $id_chuc_vu   = $user->id_chuc_vu;
            $check        = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)->where('id_chuc_nang', $id_chuc_nang)->first();
            if (!$check) {
                return response()->json([
                    'status'    =>  0,
                    'message'   =>  'Bạn không có quyền thực hiện chức năng này!'
                ]);
            }
        }
        $data = ChucVu::all();
        return response()->json([
            'status' => true,
            'data' => $data,
            'message' => "Lấy dữ liệu chức vụ thành công",
        ]);
    }
    public function store(createChucVuRequest $request)
    {
        $id_chuc_nang = 33;
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
        $data = ChucVu::create([
            'ten_chuc_vu' => $request->ten_chuc_vu,
            'slug_chuc_vu' => Str::slug($request->ten_chuc_vu),
        ]);
        return response()->json([
            'status' => true,
            'message' => 'Thêm chức vụ ' . $data->ten_chuc_vu . ' thành công',
            'data' => $data,
        ]);
    }
    public function update(updateChucVuRequest $request)
    {
        $id_chuc_nang = 36;
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
        $data = ChucVu::where('id', $request->id)
            ->update([
                'ten_chuc_vu' => $request->ten_chuc_vu,
                'slug_chuc_vu' => Str::slug($request->ten_chuc_vu),
            ]);
        return response()->json([
            'status' => true,
            'message' => 'Cập nhật chức vụ ' . $request->ten_chuc_vu . ' thành công',
            'data' => $data,
        ]);
    }
    public function destroy(deleteChucVuRequest $request)
    {
        $id_chuc_nang = 37;
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
        $data = ChucVu::where('id', $request->id)->delete();
        return response()->json([
            'status' => true,
            'message' => 'Xóa chức vụ ' . $request->ten_chuc_vu . ' thành công',
            'data' => $data,
        ]);
    }
    public function changeStatus(Request $request)
    {
        $id_chuc_nang = 38;
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
        $data = ChucVu::where('id', $request->id)->update(['tinh_trang' => $request->tinh_trang]);
        return response()->json([
            'status' => true,
            'message' => 'Thay đổi trạng thái chức vụ ' . $request->ten_chuc_vu . ' thành công',
            'data' => $data,
        ]);
    }
    public function searchChucVu(Request $request)
    {
        $id_chuc_nang = 39;
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
        $data = ChucVu::where('id', $request->id)->update(['tinh_trang' => $request->tinh_trang]);
        return response()->json([
            'status' => true,
            'message' => 'Thay đổi trạng thái chức vụ ' . $request->ten_chuc_vu . ' thành công',
            'data' => $data,
        ]);
    }
}
