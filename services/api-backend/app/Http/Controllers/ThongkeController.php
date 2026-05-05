<?php

namespace App\Http\Controllers;

use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\MonAn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ThongkeController extends Controller
{
    public function thongkeDoanhThu(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $data = DonHang::where('don_hangs.id_quan_an', $user->id)
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5) // Không tính đơn đã huỷ
            ->whereDate('created_at', '>=', $request->day_begin)
            ->whereDate('created_at', '<=', $request->day_end)
            ->select(
                DB::raw("SUM(tong_tien) as tong_tien_hang"),
                DB::raw("COUNT(id) as so_don_hang"),
                DB::raw("DATE(created_at) as ngay_tao"),
                DB::raw("DATE(created_at) as date_value")
            )
            ->groupBy('ngay_tao', 'date_value')
            ->orderBy('date_value', 'asc')
            ->get();

        $list_ngay = [];
        $list_tong_tien_hang = [];

        foreach ($data as $item) {
            array_push($list_ngay, $item->ngay_tao);
            array_push($list_tong_tien_hang, $item->tong_tien_hang);
        }

        return response()->json([
            'data'                  => $data,
            'list_ngay'             => $list_ngay,
            'list_tong_tien_hang'   => $list_tong_tien_hang,
        ]);
    }

    public function thongkeMonAn(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $data = ChiTietDonHang::join('mon_ans', 'mon_ans.id', 'chi_tiet_don_hangs.id_mon_an')
            ->join('don_hangs', 'don_hangs.id', 'chi_tiet_don_hangs.id_don_hang')
            ->where('mon_ans.id_quan_an', $user->id)
            ->where('don_hangs.is_thanh_toan', 1)
            ->where('don_hangs.tinh_trang', '<>', 5)
            ->whereDate('don_hangs.created_at', '>=', $request->day_begin)
            ->whereDate('don_hangs.created_at', '<=', $request->day_end)
            ->select(
                DB::raw("SUM(chi_tiet_don_hangs.so_luong) as so_luong_ban"),
                DB::raw("SUM(chi_tiet_don_hangs.thanh_tien) as tong_tien_hang"),
                'mon_ans.ten_mon_an'
            )
            ->groupBy('mon_ans.ten_mon_an')
            ->orderByDesc('so_luong_ban')
            ->get();

        $list_mon_an = [];
        $list_so_luong = [];
        foreach ($data as $key => $value) {
            array_push($list_mon_an, $value->ten_mon_an);
            array_push($list_so_luong, $value->so_luong_ban);
        }
        return response()->json([
            'data'          => $data,
            'list_mon_an'   => $list_mon_an,
            'list_so_luong' => $list_so_luong,
        ]);
    }


    public function dataThongKeShipper(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $dateFilter = function ($query) use ($request) {
            if ($request->day_begin && $request->day_end) {
                $query->whereDate('don_hangs.created_at', '>=', $request->day_begin)
                      ->whereDate('don_hangs.created_at', '<=', $request->day_end);
            }
        };

        // Đơn hoàn thành
        $data = DonHang::where('don_hangs.id_shipper', $user->id)
            ->where('don_hangs.tinh_trang', 4)
            ->where($dateFilter)
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->select('don_hangs.*', 'dia_chis.dia_chi', 'don_hangs.created_at as ngay_giao')
            ->orderByDESC('don_hangs.created_at')
            ->get();

        // Đơn bị hủy
        $data_huy = DonHang::where('don_hangs.id_shipper', $user->id)
            ->where('don_hangs.tinh_trang', 5)
            ->where($dateFilter)
            ->join('dia_chis', 'dia_chis.id', 'don_hangs.id_dia_chi_nhan')
            ->select('don_hangs.*', 'dia_chis.dia_chi', 'don_hangs.created_at as ngay_huy')
            ->orderByDESC('don_hangs.created_at')
            ->get();

        return response()->json([
            'data'     => $data,
            'data_huy' => $data_huy,
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // TỔNG QUAN Dashboard cho Quán Ăn
    // ══════════════════════════════════════════════════════════
    public function thongKeTongQuan(Request $request)
    {
        $user  = Auth::guard('sanctum')->user();
        $idQA  = $user->id;
        $today = now()->toDateString();

        // ── KPI ────────────────────────────────────────────────
        $base = fn($status = null) => DB::table('don_hangs')
            ->where('id_quan_an', $idQA)
            ->when($status !== null, fn($q) => $q->where('tinh_trang', $status));

        $doanhThuHomNay  = $base(4)->whereDate('created_at', $today)->sum('tong_tien');
        $doanhThuTuanNay = $base(4)->where('created_at', '>=', now()->startOfWeek())->sum('tong_tien');
        $doanhThuThangNay= $base(4)->where('created_at', '>=', now()->startOfMonth())->sum('tong_tien');
        $tongHoanTat     = $base(4)->count();
        $tongHuy         = $base(5)->count();
        $tongDon         = $base()->count();
        $tiLeHuy         = $tongDon > 0 ? round($tongHuy / $tongDon * 100, 1) : 0;

        // Rating trung bình — lấy từ bảng danh_gias (don_hangs không có cột sao_quan_an)
        $avgRating = DB::table('danh_gias')
            ->where('id_quan_an', $idQA)
            ->whereNotNull('sao_quan_an')
            ->avg('sao_quan_an');

        // ── Line chart 30 ngày ─────────────────────────────────
        $raw = DB::table('don_hangs')
            ->where('id_quan_an', $idQA)
            ->where('tinh_trang', 4)
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(created_at) as ngay'), DB::raw('SUM(tong_tien) as dt'), DB::raw('COUNT(*) as don'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->get()->keyBy('ngay');

        $listNgay = $listDT = $listDon = [];
        for ($i = 29; $i >= 0; $i--) {
            $d = now()->subDays($i)->toDateString();
            $listNgay[] = now()->subDays($i)->format('d/m');
            $listDT[]   = $raw[$d]->dt  ?? 0;
            $listDon[]  = $raw[$d]->don ?? 0;
        }

        // ── Top 10 món bán chạy (mọi thời gian) ───────────────
        $topMon = DB::table('chi_tiet_don_hangs as ct')
            ->join('mon_ans as m', 'm.id', '=', 'ct.id_mon_an')
            ->join('don_hangs as dh', 'dh.id', '=', 'ct.id_don_hang')
            ->where('m.id_quan_an', $idQA)
            ->where('dh.tinh_trang', 4)
            ->select(
                'm.ten_mon_an', 'm.hinh_anh',
                DB::raw('SUM(ct.so_luong) as so_luong_ban'),
                DB::raw('SUM(ct.thanh_tien) as tong_doanh_thu')
            )
            ->groupBy('m.id', 'm.ten_mon_an', 'm.hinh_anh')
            ->orderByDesc('so_luong_ban')
            ->limit(10)->get();

        return response()->json([
            'status' => true,
            'data' => [
                'kpi' => [
                    'doanh_thu_hom_nay'   => $doanhThuHomNay ?? 0,
                    'doanh_thu_tuan_nay'  => $doanhThuTuanNay ?? 0,
                    'doanh_thu_thang_nay' => $doanhThuThangNay ?? 0,
                    'tong_hoan_tat'       => $tongHoanTat,
                    'tong_huy'            => $tongHuy,
                    'ti_le_huy'           => $tiLeHuy,
                    'avg_rating'          => round($avgRating ?? 0, 1),
                ],
                'bieu_do' => [
                    'list_ngay' => $listNgay,
                    'list_dt'   => $listDT,
                    'list_don'  => $listDon,
                ],
                'top_mon' => $topMon,
            ],
        ]);
    }
}
