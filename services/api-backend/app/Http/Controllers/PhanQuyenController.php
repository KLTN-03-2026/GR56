<?php

namespace App\Http\Controllers;

use App\Http\Requests\PhanQuyen\deletePhanQuyenRequest;
use App\Http\Requests\PhanQuyen\PhanQuyenRequest;
use App\Models\PhanQuyen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PhanQuyenController extends Controller
{
    public function getData()
    {
        $id_chuc_nang = 41;
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
        $data = PhanQuyen::join('chuc_nangs', 'phan_quyens.id_chuc_nang', 'chuc_nangs.id')
            ->join('chuc_vus', 'phan_quyens.id_chuc_vu', 'chuc_vus.id')
            ->select('phan_quyens.*', 'chuc_nangs.ten_chuc_nang', 'chuc_vus.ten_chuc_vu')
            ->get();
        return response()->json([
            'status' => true,
            'data' => $data,
        ]);
    }

    public function store(PhanQuyenRequest $request)
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
        $data = PhanQuyen::firstOrCreate([
            'id_chuc_vu'  => $request->id_chuc_vu,
            'id_chuc_nang'  => $request->id_chuc_nang,
        ]);
        return response()->json([
            'status'    => true,
            'message'   => 'Đã thêm phân quyền thành công!',
            'data'     => $data
        ]);
    }

    public function destroy(deletePhanQuyenRequest $request)
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
        $data = PhanQuyen::where('id_chuc_vu', $request->id_chuc_vu)
            ->where('id_chuc_nang', $request->id_chuc_nang)
            ->delete();
        return response()->json([
            'status'    => true,
            'message'   => 'Đã xóa phân quyền thành công!',
        ]);
    }
}
