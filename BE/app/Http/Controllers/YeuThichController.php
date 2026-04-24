<?php

namespace App\Http\Controllers;

use App\Models\YeuThich;
use App\Models\MonAn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class YeuThichController extends Controller
{
    /**
     * Lấy danh sách món ăn yêu thích của khách hàng đang đăng nhập
     */
    public function getYeuThich()
    {
        $user = Auth::guard('sanctum')->user();

        $data = YeuThich::where('yeu_thiches.id_khach_hang', $user->id)
            ->join('mon_ans', 'mon_ans.id', 'yeu_thiches.id_mon_an')
            ->join('quan_ans', 'quan_ans.id', 'mon_ans.id_quan_an')
            ->leftJoin('danh_mucs', 'danh_mucs.id', 'mon_ans.id_danh_muc')
            ->select(
                'yeu_thiches.id',
                'yeu_thiches.created_at',
                'mon_ans.id as id_mon_an',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                'mon_ans.mo_ta',
                'mon_ans.tinh_trang',
                'quan_ans.id as id_quan_an',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh as hinh_anh_quan',
                'danh_mucs.ten_danh_muc'
            )
            ->orderBy('yeu_thiches.id', 'desc')
            ->get();

        $ids = $data->pluck('id_mon_an')->toArray();

        return response()->json([
            'status' => true,
            'data'   => $data,
            'ids'    => $ids,
        ]);
    }

    /**
     * Toggle yêu thích món ăn: nếu đã có → xóa, nếu chưa có → thêm
     */
    public function toggleYeuThich(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $request->validate(['id_mon_an' => 'required|integer|exists:mon_ans,id']);

        $idMonAn = $request->id_mon_an;

        $existing = YeuThich::where('id_khach_hang', $user->id)
            ->where('id_mon_an', $idMonAn)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json([
                'status'    => true,
                'action'    => 'removed',
                'message'   => 'Đã xóa khỏi danh sách yêu thích',
                'id_mon_an' => $idMonAn,
            ]);
        }

        YeuThich::create([
            'id_khach_hang' => $user->id,
            'id_mon_an'     => $idMonAn,
        ]);

        return response()->json([
            'status'    => true,
            'action'    => 'added',
            'message'   => 'Đã thêm vào danh sách yêu thích ❤️',
            'id_mon_an' => $idMonAn,
        ]);
    }

    /**
     * Lấy danh sách id_mon_an yêu thích (dùng trên HomePage để highlight ngay khi load)
     */
    public function getYeuThichIds()
    {
        $user = Auth::guard('sanctum')->user();

        $ids = YeuThich::where('id_khach_hang', $user->id)
            ->pluck('id_mon_an')
            ->toArray();

        return response()->json([
            'status' => true,
            'ids'    => $ids,
        ]);
    }
}
