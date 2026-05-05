<?php

namespace App\Http\Controllers;

use App\Http\Requests\DanhMuc\CapNhatDanhMucRequest;
use App\Http\Requests\DanhMuc\ThemMoiDanhMucRequest;
use App\Http\Requests\DanhMuc\XoaDanhMucRequest;
use App\Models\DanhMuc;
use App\Models\PhanQuyen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DanhMucController extends Controller
{
    public function search(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data   =  DanhMuc::where('ten_danh_muc', 'like', $noi_dung_tim)
            ->get();
        return response()->json([
            'data'  => $data
        ]);
    }
    public function getData()
    {
        $id_chuc_nang = 22;
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
        $data = DanhMuc::join('danh_mucs as A', 'A.id', 'danh_mucs.id_danh_muc_cha')
            ->select('danh_mucs.*', 'A.ten_danh_muc as ten_danh_muc_cha')
            ->get();
        return response()->json([
            'status' => 1,
            'data' => $data
        ]);
    }
    public function store(ThemMoiDanhMucRequest $request)
    {
        $id_chuc_nang = 23;
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
        $data = DanhMuc::create($request->all());
        return response()->json([
            'status' => 1,
            'message' => 'Thêm danh mục thành công'
        ]);
    }
    public function destroy(XoaDanhMucRequest $request)
    {
        $id_chuc_nang = 25;
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
        $data = DanhMuc::find($request->id);
        $data->delete();
        return response()->json([
            'status' => 1,
            'message' => 'Xóa danh mục thành công'
        ]);
    }
    public function update(CapNhatDanhMucRequest $request)
    {
        $id_chuc_nang = 24;
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
        $data = DanhMuc::find($request->id);
        $data->update($request->all());
        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật danh mục thành công'
        ]);
    }
    public function changeStatus(XoaDanhMucRequest $request)
    {
        $id_chuc_nang = 26;
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
        $data = DanhMuc::find($request->id);
        if ($data->tinh_trang == 1) {
            $data->tinh_trang = 0;
        } else {
            $data->tinh_trang = 1;
        }
        $data->save();
        return response()->json([
            'status' => 1,
            'message' => 'Cập nhật trạng thái danh mục thành công'
        ]);
    }
}
