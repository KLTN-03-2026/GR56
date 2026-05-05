<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DanhGia;
use App\Models\QuanAn;
use App\Models\Shipper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DanhGiaController extends Controller
{
    /**
     * Admin: Lấy danh sách đánh giá với filter (quán, shipper, số sao, hidden)
     * GET /api/admin/danh-gia/data
     */
    public function getAdminDanhGia(Request $request)
    {
        $query = DanhGia::query()
            ->leftJoin('don_hangs', 'danh_gias.id_don_hang', '=', 'don_hangs.id')
            ->leftJoin('khach_hangs', 'danh_gias.id_khach_hang', '=', 'khach_hangs.id')
            ->leftJoin('quan_ans', 'danh_gias.id_quan_an', '=', 'quan_ans.id')
            ->leftJoin('shippers', 'danh_gias.id_shipper', '=', 'shippers.id')
            ->select([
                'danh_gias.id',
                'danh_gias.id_don_hang',
                'danh_gias.id_khach_hang',
                'danh_gias.id_quan_an',
                'danh_gias.id_shipper',
                'danh_gias.sao_quan_an',
                'danh_gias.nhan_xet_quan_an',
                'danh_gias.sao_shipper',
                'danh_gias.nhan_xet_shipper',
                'danh_gias.is_hidden',
                'danh_gias.created_at',
                'khach_hangs.ho_va_ten as ten_khach_hang',
                'khach_hangs.so_dien_thoai as sdt_khach_hang',
                'quan_ans.ten_quan_an',
                'shippers.ho_va_ten as ten_shipper',
                'don_hangs.ma_don_hang',
            ]);

        // Filter theo quán
        if ($request->filled('id_quan_an') && $request->id_quan_an !== 'all') {
            $query->where('danh_gias.id_quan_an', $request->id_quan_an);
        }

        // Filter theo shipper
        if ($request->filled('id_shipper') && $request->id_shipper !== 'all') {
            $query->where('danh_gias.id_shipper', $request->id_shipper);
        }

        // Filter theo số sao quán
        if ($request->filled('sao_quan_an') && $request->sao_quan_an !== 'all') {
            $query->where('danh_gias.sao_quan_an', (int) $request->sao_quan_an);
        }

        // Filter theo trạng thái ẩn
        if ($request->filled('is_hidden') && $request->is_hidden !== 'all') {
            $query->where('danh_gias.is_hidden', (bool)(int) $request->is_hidden);
        }

        // Tìm kiếm theo nội dung
        if ($request->filled('search')) {
            $kw = '%' . $request->search . '%';
            $query->where(function ($q) use ($kw) {
                $q->where('danh_gias.nhan_xet_quan_an', 'like', $kw)
                  ->orWhere('danh_gias.nhan_xet_shipper', 'like', $kw)
                  ->orWhere('khach_hangs.ho_va_ten', 'like', $kw)
                  ->orWhere('quan_ans.ten_quan_an', 'like', $kw);
            });
        }

        $data = $query->orderBy('danh_gias.created_at', 'desc')->get();

        // Thống kê
        $stats = [
            'tong'        => $data->count(),
            'bi_an'       => $data->where('is_hidden', true)->count(),
            'sao_1'       => $data->where('sao_quan_an', 1)->count(),
            'sao_2'       => $data->where('sao_quan_an', 2)->count(),
            'sao_3'       => $data->where('sao_quan_an', 3)->count(),
            'sao_4'       => $data->where('sao_quan_an', 4)->count(),
            'sao_5'       => $data->where('sao_quan_an', 5)->count(),
            'tb_sao_quan' => round($data->avg('sao_quan_an') ?? 0, 1),
        ];

        return response()->json([
            'status' => true,
            'data'   => $data,
            'stats'  => $stats,
        ]);
    }

    /**
     * Admin: Xóa đánh giá vi phạm
     * POST /api/admin/danh-gia/delete
     */
    public function deleteDanhGia(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|exists:danh_gias,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => false, 'message' => $validator->errors()->first()], 400);
        }

        DanhGia::destroy($request->id);

        return response()->json([
            'status'  => true,
            'message' => 'Đã xóa đánh giá #' . $request->id . ' thành công!',
        ]);
    }

    /**
     * Admin: Ẩn / hiện đánh giá (toggle)
     * POST /api/admin/danh-gia/hide
     */
    public function hideDanhGia(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id'        => 'required|exists:danh_gias,id',
            'is_hidden' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => false, 'message' => $validator->errors()->first()], 400);
        }

        $dg = DanhGia::findOrFail($request->id);
        $dg->is_hidden = (bool) $request->is_hidden;
        $dg->save();

        $action = $dg->is_hidden ? 'Đã ẩn' : 'Đã hiện';

        return response()->json([
            'status'    => true,
            'message'   => "$action đánh giá #{$request->id} thành công!",
            'is_hidden' => $dg->is_hidden,
        ]);
    }

    /**
     * Admin: Lấy danh sách quán + shipper để filter dropdown
     * GET /api/admin/danh-gia/filter-data
     */
    public function getFilterData()
    {
        $quanAns  = QuanAn::where('tinh_trang', 1)->select('id', 'ten_quan_an')->orderBy('ten_quan_an')->get();
        $shippers = Shipper::where('tinh_trang', 1)->select('id', 'ho_va_ten')->orderBy('ho_va_ten')->get();

        return response()->json([
            'status'   => true,
            'quan_ans' => $quanAns,
            'shippers' => $shippers,
        ]);
    }
}
