<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonAn\changeStatusMonAnRequest;
use App\Http\Requests\MonAn\createMonAnRequest;
use App\Http\Requests\MonAn\deleteMonAnRequest;
use App\Http\Requests\MonAn\updateMonAnRequest;
use App\Models\MonAn;
use App\Models\QuanAn;
use Illuminate\Http\Request;

class MonAnController extends Controller
{
    public function searchNguoiDung(Request $request)
    {
        $noi_dung_tim = '%' . $request->noi_dung_tim . '%';
        $data_mon_an   =  MonAn::where('ten_mon_an', 'like', $noi_dung_tim)
            ->join('quan_ans', 'quan_ans.id', 'mon_ans.id_quan_an')
            ->select('mon_ans.*', 'quan_ans.ten_quan_an')
            ->orderBy('mon_ans.gia_khuyen_mai')
            ->get();

        $data_quan_an = QuanAn::where('ten_quan_an', 'like', $noi_dung_tim)
            ->select('quan_ans.id', 'quan_ans.ten_quan_an', 'quan_ans.hinh_anh', 'quan_ans.dia_chi')
            ->get();
        return response()->json([
            'mon_an'  => $data_mon_an,
            'quan_an'  => $data_quan_an,
        ]);
    }
    public function getData()
    {
        $data = MonAn::leftJoin('quan_ans', 'mon_ans.id_quan_an', '=', 'quan_ans.id')
            ->leftJoin('danh_mucs', 'mon_ans.id_danh_muc', '=', 'danh_mucs.id')
            ->select(
                'mon_ans.*',
                'quan_ans.ten_quan_an',
                'quan_ans.dia_chi as dia_chi_quan_an',
                'danh_mucs.ten_danh_muc'
            )
            ->get();

        $quan_an = QuanAn::where('tinh_trang', 1)->where('is_active', 1)->get(['id', 'ten_quan_an']);
        $danh_muc = \App\Models\DanhMuc::where('tinh_trang', 1)->get(['id', 'ten_danh_muc']);

        return response()->json([
            'data'     => $data,
            'quan_an'  => $quan_an,
            'danh_muc' => $danh_muc,
        ]);
    }

    public function store(createMonAnRequest $request)
    {
        $monAn = MonAn::create([
            'ten_mon_an'        => $request->ten_mon_an,
            'slug_mon_an'       => $request->slug_mon_an,
            'gia_ban'           => $request->gia_ban,
            'gia_khuyen_mai'    => $request->gia_khuyen_mai,
            'id_quan_an'        => $request->id_quan_an,
            'tinh_trang'        => $request->tinh_trang,
            'hinh_anh'          => $request->hinh_anh,
            'id_danh_muc'       => $request->id_danh_muc,
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Thêm ' . $request->ten_mon_an . ' thành công'
        ]);
    }

    public function update(Request $request)
    {
        $monAn = MonAn::where('id', $request->id)->update([
            'ten_mon_an'        => $request->ten_mon_an,
            'slug_mon_an'       => $request->slug_mon_an,
            'gia_ban'           => $request->gia_ban,
            'gia_khuyen_mai'    => $request->gia_khuyen_mai,
            'id_quan_an'        => $request->id_quan_an,
            'tinh_trang'        => $request->tinh_trang,
            'hinh_anh'          => $request->hinh_anh,
            'id_danh_muc'       => $request->id_danh_muc,
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật ' . $request->ten_mon_an . ' thành công'
        ]);
    }

    public function destroy(deleteMonAnRequest $request)
    {
        $monAn = MonAn::where('id', $request->id)->delete();
        return response()->json([
            'status'  => 1,
            'message' => 'Xóa ' . $request->ten_mon_an . ' thành công'
        ]);
    }

    public function changeStatus(changeStatusMonAnRequest $request)
    {
        $monAn = MonAn::where('id', $request->id)->first();
        if ($monAn->tinh_trang == 1) {
            $monAn->tinh_trang = 0;
            $monAn->save();
        } else {
            $monAn->tinh_trang = 1;
            $monAn->save();
        }
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật trạng thái thành công'
        ]);
    }
}
