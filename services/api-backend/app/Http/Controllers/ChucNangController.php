<?php

namespace App\Http\Controllers;

use App\Models\ChucNang;
use App\Support\AdminPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChucNangController extends Controller
{
    public function getData(Request $request)
    {
        $login = Auth::guard('sanctum')->user();
        if (!AdminPermission::can($login, 40)) {
            return AdminPermission::deny();
        }

        $data = ChucNang::all();
        return response()->json([
            'status' => true,
            'message' => "Lấy danh sách chức năng thành công",
            'data' => $data,
        ]);
    }
}
