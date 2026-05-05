<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuanHuyen\changeStatusQuanHuyenRequest;
use App\Http\Requests\QuanHuyen\createQuanHuyenRequest;
use App\Http\Requests\QuanHuyen\deleteQuanHuyenRequest;
use App\Http\Requests\QuanHuyen\updateQuanHuyenRequest;
use App\Models\QuanHuyen;
use Illuminate\Http\Request;

class QuanHuyenController extends Controller
{

    public function getData(Request $request)
    {
        $data = QuanHuyen::where('id_tinh_thanh', $request->id)->get();
        return response()->json([
            'data' => $data
        ]);
    }

    public function getDataOpen()
    {
        $data = QuanHuyen::where('tinh_trang', 1)->get();
        return response()->json([
            'data' => $data
        ]);
    }

    public function store(createQuanHuyenRequest $request)
    {
        $tinhThanh = QuanHuyen::create([
            'ten_quan_huyen'      => $request->ten_quan_huyen,
            'toa_do_x'            => $request->toa_do_x,
            'toa_do_y'            => $request->toa_do_y,
            'tinh_trang'          => $request->tinh_trang,
            'id_tinh_thanh'       => $request->id_tinh_thanh
        ]);
        return response()->json([
            'message' => 'Thêm ' . $request->ten_quan_huyen . ' thành công'
        ]);
    }

    public function update(updateQuanHuyenRequest $request)
    {
        $tinhThanh = QuanHuyen::where('id', $request->id)->update([
            'ten_quan_huyen'      => $request->ten_quan_huyen,
            'toa_do_x'            => $request->toa_do_x,
            'toa_do_y'            => $request->toa_do_y,
            'tinh_trang'          => $request->tinh_trang,
            'id_tinh_thanh'       => $request->id_tinh_thanh
        ]);
        return response()->json([
            'message' => 'Cập nhật ' . $request->ten_quan_huyen . ' thành công'
        ]);
    }

    public function destroy(deleteQuanHuyenRequest $request)
    {
        $tinhThanh = QuanHuyen::where('id', $request->id)->delete();
        return response()->json([
            'message' => 'Xóa ' . $request->ten_quan_huyen . ' thành công'
        ]);
    }

    public function changeStatus(changeStatusQuanHuyenRequest $request)
    {
        $tinhThanh = QuanHuyen::where('id', $request->id)->first();
        if ($tinhThanh->tinh_trang == 1) {
            $tinhThanh->tinh_trang = 0;
            $tinhThanh->save();
        } else {
            $tinhThanh->tinh_trang = 1;
            $tinhThanh->save();
        }
        return response()->json([
            'status'    => 1,
            'message'   => 'Cập nhật trạng thái ' . $request->ten_quan_huyen . ' thành công'
        ]);
    }
}
