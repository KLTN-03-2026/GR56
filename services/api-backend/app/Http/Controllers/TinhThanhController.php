<?php

namespace App\Http\Controllers;

use App\Http\Requests\TinhThanh\changeStatusTinhThanhRequest;
use App\Http\Requests\TinhThanh\createTinhThanhRequest;
use App\Http\Requests\TinhThanh\deleteTinhThanhRequest;
use App\Http\Requests\TinhThanh\updateTinhThanhRequest;
use App\Models\TinhThanh;
use Illuminate\Http\Request;

class TinhThanhController extends Controller
{
    public function getData()
    {
        $data = TinhThanh::get();
        return response()->json([
            'data' => $data
        ]);
    }

    public function getDataOpen()
    {
        $data = TinhThanh::where('tinh_trang', 1)->get();
        return response()->json([
            'data' => $data
        ]);
    }

    public function store(createTinhThanhRequest $request)
    {
        $tinhThanh = TinhThanh::create([
            'ten_tinh_thanh'    => $request->ten_tinh_thanh,
            'toa_do_x'          => $request->toa_do_x,
            'toa_do_y'          => $request->toa_do_y,
            'tinh_trang'        => $request->tinh_trang
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Thêm ' . $request->ten_tinh_thanh . ' thành công'
        ]);
    }

    public function update(updateTinhThanhRequest $request)
    {
        $tinhThanh = TinhThanh::where('id', $request->id)->update([
            'ten_tinh_thanh'    => $request->ten_tinh_thanh,
            'toa_do_x'          => $request->toa_do_x,
            'toa_do_y'          => $request->toa_do_y,
            'tinh_trang'        => $request->tinh_trang
        ]);
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật ' . $request->ten_tinh_thanh . ' thành công'
        ]);
    }

    public function destroy(deleteTinhThanhRequest $request)
    {
        $tinhThanh = TinhThanh::where('id', $request->id)->delete();
        return response()->json([
            'status'  => 1,
            'message' => 'Xóa ' . $request->ten_tinh_thanh . ' thành công'
        ]);
    }

    public function changeStatus(changeStatusTinhThanhRequest $request)
    {
        $tinhThanh = TinhThanh::where('id', $request->id)->first();
        if($tinhThanh->tinh_trang == 1) {
            $tinhThanh->tinh_trang = 0;
            $tinhThanh->save();
        } else {
            $tinhThanh->tinh_trang = 1;
            $tinhThanh->save();
        }
        return response()->json([
            'status'  => 1,
            'message' => 'Cập nhật trạng thái ' . $request->ten_tinh_thanh . ' thành công'
        ]);
    }
}
