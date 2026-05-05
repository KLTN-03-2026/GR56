<?php

namespace App\Http\Controllers;

use App\Models\ChucNang;
use App\Models\PhanQuyen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChucNangController extends Controller
{
    public function getData(Request $request)
    {
        // $id_chuc_nang = 40;
        // $login = Auth::guard('sanctum')->user();
        // // Nếu là master admin thì bỏ qua kiểm tra quyền
        // if ($login->is_master != 1) {
        //     $id_chuc_vu = $login->id_chuc_vu;
        //     $check_quyen = PhanQuyen::where('id_chuc_vu', $id_chuc_vu)
        //         ->where('id_chuc_nang', $id_chuc_nang)
        //         ->first();
        //     if (!$check_quyen) {
        //         return response()->json([
        //             'data' => false,
        //             'message' => "bạn không có quyền thực hiện chức năng này!"
        //         ]);
        //     }
        // }
        $data = ChucNang::all();
        return response()->json([
            'status' => true,
            'message' => "Lấy danh sách chức năng thành công",
            'data' => $data,
        ]);
    }
}
