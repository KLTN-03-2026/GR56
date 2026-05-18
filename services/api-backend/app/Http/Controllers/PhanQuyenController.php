<?php

namespace App\Http\Controllers;

use App\Http\Requests\PhanQuyen\deletePhanQuyenRequest;
use App\Http\Requests\PhanQuyen\PhanQuyenRequest;
use App\Models\PhanQuyen;
use App\Support\AdminPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PhanQuyenController extends Controller
{
    public function getData()
    {
        $login = Auth::guard('sanctum')->user();
        if (!AdminPermission::can($login, 41)) {
            return AdminPermission::deny();
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
        $login = Auth::guard('sanctum')->user();
        if (!AdminPermission::can($login, 56)) {
            return AdminPermission::deny();
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
        $login = Auth::guard('sanctum')->user();
        if (!AdminPermission::can($login, 57)) {
            return AdminPermission::deny();
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
