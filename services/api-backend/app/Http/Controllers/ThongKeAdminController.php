<?php

namespace App\Http\Controllers;

use App\Models\DonHang;
use App\Models\MonAn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Termwind\Components\Raw;

class ThongKeAdminController extends Controller
{
    public function thongKeTienKhachHang(Request $request)
    {
        $day_begin = $request->day_begin;
        $day_end = $request->day_end;
        
        $query = DonHang::join('khach_hangs', 'khach_hangs.id', '=', 'don_hangs.id_khach_hang')
            ->where('don_hangs.is_thanh_toan', 1); // Chỉ tính đơn đã thanh toán

        if ($day_begin && $day_end) {
            $query->whereDate('don_hangs.created_at', '>=', $day_begin)
                  ->whereDate('don_hangs.created_at', '<=', $day_end);
        }

        $data = $query->select(
                'khach_hangs.ho_va_ten',
                DB::raw('SUM(tong_tien) as tong_tien_tieu'),
                DB::raw('COUNT(don_hangs.id) as tong_don_hang'),
                DB::raw('MAX(tong_tien) as don_hang_max'),
            )->groupBy('khach_hangs.ho_va_ten')->get();

        $list_ten = [];
        $list_tien = [];
        foreach ($data as $key => $value) {
            array_push($list_ten, $value->ho_va_ten);
            array_push($list_tien, $value->tong_tien_tieu);
        }
        return response()->json([
            'list_ten' => $list_ten,
            'list_tien' => $list_tien,
            'data'  => $data
        ]);
    }

    public function thongKeTienQuanAn(Request $request)
    {
        $day_begin = $request->day_begin;
        $day_end = $request->day_end;

        $query = DB::table('don_hangs')
            ->join('quan_ans', 'quan_ans.id', '=', 'don_hangs.id_quan_an')
            ->join('khach_hangs', 'khach_hangs.id', '=', 'don_hangs.id_khach_hang')
            ->where('don_hangs.is_thanh_toan', 1); // Chỉ tính đơn đã thanh toán

        if ($day_begin && $day_end) {
            $query->whereDate('don_hangs.created_at', '>=', $day_begin)
                  ->whereDate('don_hangs.created_at', '<=', $day_end);
        }

        $data = $query->select(
                'quan_ans.ten_quan_an',
                DB::raw('COUNT(DISTINCT don_hangs.id) as tong_don_hang'),
                DB::raw('COUNT(DISTINCT don_hangs.id_khach_hang) as so_luong_khach_hang'),
                DB::raw('SUM(don_hangs.tong_tien) as tong_tien_ban')
            )
            ->groupBy('quan_ans.ten_quan_an')
            ->get();

        $list_ten = [];
        $list_tien = [];
        foreach ($data as $key => $value) {
            array_push($list_ten, $value->ten_quan_an);
            array_push($list_tien, $value->tong_tien_ban);
        }
        return response()->json([
            'list_ten' => $list_ten,
            'list_tien' => $list_tien,
            'data'  => $data
        ]);
    }

    public function dashboard(Request $request)
    {
        // ==================== THỐNG KÊ TỔNG QUAN ====================
        $tongQuanAn = DB::table('quan_ans')->count();
        $tongMonAn = DB::table('mon_ans')->count();
        $tongKhachHang = DB::table('khach_hangs')->count();
        $tongDonHang = DB::table('don_hangs')->count();

        // ==================== THỐNG KÊ DOANH THU ====================
        // Tổng doanh thu tất cả thời gian (Dựa trên tiền đã thanh toán)
        $tongDoanhThu = DB::table('don_hangs')->where('is_thanh_toan', 1)->where('tinh_trang', '<>', 5)->sum('tong_tien');

        // Doanh thu hôm nay
        $today = now()->toDateString();
        $doanhThuHomNay = DB::table('don_hangs')
            ->whereDate('created_at', $today)
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Doanh thu hôm qua
        $yesterday = now()->subDay()->toDateString();
        $doanhThuHomQua = DB::table('don_hangs')
            ->whereDate('created_at', $yesterday)
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Doanh thu tuần này
        $thisWeekStart = now()->startOfWeek();
        $doanhThuTuanNay = DB::table('don_hangs')
            ->where('created_at', '>=', $thisWeekStart)
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Doanh thu tuần trước
        $lastWeekStart = now()->subWeek()->startOfWeek();
        $lastWeekEnd = now()->subWeek()->endOfWeek();
        $doanhThuTuanTruoc = DB::table('don_hangs')
            ->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Doanh thu tháng này
        $thisMonthStart = now()->startOfMonth();
        $doanhThuThangNay = DB::table('don_hangs')
            ->where('created_at', '>=', $thisMonthStart)
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Doanh thu tháng trước
        $lastMonthStart = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();
        $doanhThuThangTruoc = DB::table('don_hangs')
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum('tong_tien');

        // Tính growth rate
        $growthHomNay = $doanhThuHomQua > 0 ? (($doanhThuHomNay - $doanhThuHomQua) / $doanhThuHomQua) * 100 : 0;
        $growthTuanNay = $doanhThuTuanTruoc > 0 ? (($doanhThuTuanNay - $doanhThuTuanTruoc) / $doanhThuTuanTruoc) * 100 : 0;
        $growthThangNay = $doanhThuThangTruoc > 0 ? (($doanhThuThangNay - $doanhThuThangTruoc) / $doanhThuThangTruoc) * 100 : 0;

        // ==================== TỔNG CHI PHÍ & LỢI NHUẬN HỆ THỐNG ====================
        // Tổng tiền lời (hoa hồng giữ lại từ quán ăn)
        // Với đơn đã giao, hoa hồng = tiền hàng - tiền chi_tra_cho_quan_an. Thường mặc định 15% tiền hàng
        // Do hệ thống đã cập nhật trường tien_quan_an trong đơn hàng, ta có thể tính:
        $tongTienLoi = DB::table('don_hangs')
            ->where('is_thanh_toan', 1)
            ->where('tinh_trang', '<>', 5)
            ->sum(DB::raw('tien_hang * 0.15'));

        // Tổng chi phí hệ thống (Khuyến mãi do Admin tạo + Xu)
        $tongTienChiPhi = DB::table('don_hangs')
            ->leftJoin('vouchers', 'don_hangs.id_voucher', '=', 'vouchers.id')
            ->where('don_hangs.is_thanh_toan', 1)
            ->where('don_hangs.tinh_trang', '<>', 5)
            ->sum(DB::raw('don_hangs.tien_giam_tu_xu + CASE WHEN vouchers.id_quan_an IS NULL OR vouchers.id_quan_an = 0 THEN (don_hangs.tien_hang + don_hangs.phi_ship - don_hangs.tien_giam_tu_xu - don_hangs.tong_tien) ELSE 0 END'));

        // ==================== THỐNG KÊ CALCULATED METRICS ====================
        $tongDonHangThanhCong = DB::table('don_hangs')->where('is_thanh_toan', 1)->where('tinh_trang', '<>', 5)->count();
        $avgOrderValue = $tongDonHangThanhCong > 0 ? $tongDoanhThu / $tongDonHangThanhCong : 0;

        // Đơn hàng đang xử lý (status 0, 1, 2, 3)
        $donHangDangXuLy = DB::table('don_hangs')
            ->whereIn('tinh_trang', [0, 1, 2, 3])
            ->count();

        // Tỷ lệ hoàn thành
        $completionRate = $tongDonHang > 0 ? ($tongDonHangThanhCong / $tongDonHang) * 100 : 0;

        // Khách hàng mới hôm nay
        $khachHangMoiHomNay = DB::table('khach_hangs')
            ->whereDate('created_at', $today)
            ->count();

        // Khách hàng mới hôm qua
        $khachHangMoiHomQua = DB::table('khach_hangs')
            ->whereDate('created_at', $yesterday)
            ->count();

        $growthKhachHang = $khachHangMoiHomQua > 0 ? (($khachHangMoiHomNay - $khachHangMoiHomQua) / $khachHangMoiHomQua) * 100 : 0;

        // ==================== DOANH THU THEO NGÀY (30 NGÀY GẦN NHẤT) ====================
        $doanhThuTheoNgay = DB::table('don_hangs')
            ->select(
                DB::raw('DATE(created_at) as ngay'),
                DB::raw('SUM(CASE WHEN is_thanh_toan = 1 AND tinh_trang <> 5 THEN tong_tien ELSE 0 END) as tong_tien_hang'),
                DB::raw('COUNT(CASE WHEN is_thanh_toan = 1 AND tinh_trang <> 5 THEN 1 END) as so_don_hang')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('ngay')
            ->get();

        // Đảm bảo có đủ 30 ngày
        $doanhThuNgayFull = [];
        $listNgay = [];
        $listTongTien = [];
        $listSoDonHang = [];

        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $found = $doanhThuTheoNgay->firstWhere('ngay', $date);

            $listNgay[] = now()->subDays($i)->format('d/m');
            $listTongTien[] = $found ? ($found->tong_tien_hang ?? 0) : 0;
            $listSoDonHang[] = $found ? ($found->so_don_hang ?? 0) : 0;
        }

        // ==================== BIỂU ĐỒ DOANH THU THEO THÁNG ====================
        $currentYear = now()->year;
        $doanhThuTheoThang = DB::table('don_hangs')
            ->select(
                DB::raw('MONTH(created_at) as thang'),
                DB::raw('SUM(CASE WHEN is_thanh_toan = 1 AND tinh_trang <> 5 THEN tong_tien ELSE 0 END) as doanh_thu'),
                DB::raw('COUNT(CASE WHEN is_thanh_toan = 1 AND tinh_trang <> 5 THEN 1 END) as so_don_hang_thanh_cong')
            )
            ->whereYear('created_at', $currentYear)
            ->groupBy(DB::raw('MONTH(created_at)'))
            ->orderBy('thang')
            ->get()
            ->map(function ($item) {
                $thangNames = [
                    1 => 'Tháng 1',
                    2 => 'Tháng 2',
                    3 => 'Tháng 3',
                    4 => 'Tháng 4',
                    5 => 'Tháng 5',
                    6 => 'Tháng 6',
                    7 => 'Tháng 7',
                    8 => 'Tháng 8',
                    9 => 'Tháng 9',
                    10 => 'Tháng 10',
                    11 => 'Tháng 11',
                    12 => 'Tháng 12'
                ];

                return [
                    'thang' => $item->thang,
                    'ten_thang' => $thangNames[$item->thang] ?? 'Không xác định',
                    'doanh_thu' => $item->doanh_thu ?? 0,
                    'so_don_hang_thanh_cong' => $item->so_don_hang_thanh_cong ?? 0
                ];
            });

        // Đảm bảo có đủ 12 tháng
        $doanhThuFull = [];
        for ($i = 1; $i <= 12; $i++) {
            $found = $doanhThuTheoThang->firstWhere('thang', $i);
            if ($found) {
                $doanhThuFull[] = $found;
            } else {
                $thangNames = [
                    1 => 'Tháng 1',
                    2 => 'Tháng 2',
                    3 => 'Tháng 3',
                    4 => 'Tháng 4',
                    5 => 'Tháng 5',
                    6 => 'Tháng 6',
                    7 => 'Tháng 7',
                    8 => 'Tháng 8',
                    9 => 'Tháng 9',
                    10 => 'Tháng 10',
                    11 => 'Tháng 11',
                    12 => 'Tháng 12'
                ];
                $doanhThuFull[] = [
                    'thang' => $i,
                    'ten_thang' => $thangNames[$i] ?? 'Không xác định',
                    'doanh_thu' => 0,
                    'so_don_hang_thanh_cong' => 0
                ];
            }
        }

        // ==================== TOP QUÁN ĂN THEO DOANH THU ====================
        $topQuanAn = DB::table('quan_ans as qa')
            ->join('don_hangs as dh', 'qa.id', '=', 'dh.id_quan_an')
            ->where('dh.is_thanh_toan', 1)
            ->where('dh.tinh_trang', '<>', 5)
            ->select(
                'qa.id',
                'qa.ten_quan_an',
                'qa.hinh_anh',
                'qa.dia_chi',
                DB::raw('COUNT(dh.id) as tong_don_hang'),
                DB::raw('SUM(dh.tong_tien) as tong_doanh_thu'),
                DB::raw('AVG(dh.tong_tien) as doanh_thu_trung_binh')
            )
            ->groupBy('qa.id', 'qa.ten_quan_an', 'qa.hinh_anh', 'qa.dia_chi')
            ->orderBy('tong_doanh_thu', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'ten_quan_an' => $item->ten_quan_an,
                    'hinh_anh' => $item->hinh_anh ?: '/images/default-restaurant.jpg',
                    'dia_chi' => $item->dia_chi ?: 'Chưa cập nhật',
                    'tong_don_hang' => $item->tong_don_hang ?? 0,
                    'don_hang_thanh_cong' => $item->tong_don_hang ?? 0,
                    'tong_doanh_thu' => $item->tong_doanh_thu ?? 0,
                    'doanh_thu_trung_binh' => $item->doanh_thu_trung_binh ?? 0
                ];
            });

        // ==================== TOP MÓN ĂN BÁN CHẠY ====================
        $topMonAn = MonAn::join('chi_tiet_don_hangs', 'mon_ans.id', '=', 'chi_tiet_don_hangs.id_mon_an')
            ->join('don_hangs', 'chi_tiet_don_hangs.id_don_hang', '=', 'don_hangs.id')
            ->where('don_hangs.is_thanh_toan', 1)
            ->where('don_hangs.tinh_trang', '<>', 5)
            ->select(
                'mon_ans.id',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                DB::raw('SUM(chi_tiet_don_hangs.so_luong) as so_luong_ban'),
                DB::raw('SUM(don_hangs.tong_tien) as tong_tien')
            )
            ->groupBy('mon_ans.id', 'mon_ans.ten_mon_an', 'mon_ans.hinh_anh', 'mon_ans.gia_ban', 'mon_ans.gia_khuyen_mai')
            ->orderBy('so_luong_ban', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'ten_mon_an' => $item->ten_mon_an,
                    'hinh_anh' => $item->hinh_anh ?: '/images/default-food.jpg',
                    'gia_tien' => $item->gia_ban ?? 0,
                    'gia_khuyen_mai' => $item->gia_khuyen_mai ?? 0,
                    'so_luong_ban' => $item->so_luong_ban ?? 0,
                    'tong_tien' => $item->tong_tien ?? 0
                ];
            });

        // ==================== THỐNG KÊ ĐƠN HÀNG THEO TRẠNG THÁI ====================
        $trangThaiMap = [
            0 => 'Chờ xác nhận',
            1 => 'Đã nhận đơn',
            2 => 'Đang nấu',
            3 => 'Đang giao hàng',
            4 => 'Hoàn tất',
            5 => 'Đơn bị hủy',
        ];

        $donHangTheoTrangThai = DonHang::select(
            'tinh_trang',
            DB::raw('COUNT(*) as so_luong'),
            DB::raw('SUM(tong_tien) as tong_tien')
        )
            ->groupBy('tinh_trang')
            ->get()
            ->map(function ($item) use ($trangThaiMap) {
                return [
                    'trang_thai' => $item->tinh_trang,
                    'ten_trang_thai' => $trangThaiMap[$item->tinh_trang] ?? 'Không xác định',
                    'so_luong' => $item->so_luong ?? 0,
                    'tong_tien' => $item->tong_tien ?? 0
                ];
            });

        // Đảm bảo có đủ tất cả trạng thái
        $trangThaiFull = [];
        for ($i = 0; $i <= 5; $i++) {
            $found = $donHangTheoTrangThai->firstWhere('trang_thai', $i);
            if ($found) {
                $trangThaiFull[] = $found;
            } else {
                $trangThaiFull[] = [
                    'trang_thai' => $i,
                    'ten_trang_thai' => $trangThaiMap[$i] ?? 'Không xác định',
                    'so_luong' => 0,
                    'tong_tien' => 0
                ];
            }
        }

        // ==================== ĐƠN HÀNG GẦN ĐÂY ====================
        $donHangGanDay = DonHang::join('khach_hangs', 'don_hangs.id_khach_hang', '=', 'khach_hangs.id')
            ->join('quan_ans', 'don_hangs.id_quan_an', '=', 'quan_ans.id')
            ->select(
                'don_hangs.id',
                'don_hangs.ma_don_hang',
                'don_hangs.tong_tien',
                'don_hangs.tinh_trang',
                'don_hangs.is_thanh_toan',
                'don_hangs.created_at',
                'khach_hangs.ho_va_ten as ten_khach_hang',
                'quan_ans.ten_quan_an'
            )
            ->orderBy('don_hangs.id', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) use ($trangThaiMap) {
                return [
                    'id' => $item->id,
                    'ma_don_hang' => $item->ma_don_hang,
                    'tong_tien' => $item->tong_tien,
                    'tinh_trang' => $item->tinh_trang,
                    'ten_trang_thai' => $trangThaiMap[$item->tinh_trang] ?? 'Không xác định',
                    'is_thanh_toan' => $item->is_thanh_toan,
                    'ten_khach_hang' => $item->ten_khach_hang,
                    'ten_quan_an' => $item->ten_quan_an,
                    'created_at' => $item->created_at
                ];
            });

        // ==================== TỔNG HỢP DỮ LIỆU ====================
        $tongQuan = [
            'tong_quan_an' => $tongQuanAn,
            'tong_mon_an' => $tongMonAn,
            'tong_khach_hang' => $tongKhachHang,
            'tong_don_hang' => $tongDonHang,
            'tong_doanh_thu' => $tongDoanhThu ?? 0,
            'doanh_thu_hom_nay' => $doanhThuHomNay ?? 0,
            'doanh_thu_tuan_nay' => $doanhThuTuanNay ?? 0,
            'doanh_thu_thang_nay' => $doanhThuThangNay ?? 0,
            'growth_hom_nay' => round($growthHomNay, 2),
            'growth_tuan_nay' => round($growthTuanNay, 2),
            'growth_thang_nay' => round($growthThangNay, 2),
            'avg_order_value' => $avgOrderValue ?? 0,
            'don_hang_dang_xu_ly' => $donHangDangXuLy ?? 0,
            'completion_rate' => round($completionRate, 2),
            'khach_hang_moi_hom_nay' => $khachHangMoiHomNay,
            'growth_khach_hang' => round($growthKhachHang, 2),
            'tong_tien_loi' => $tongTienLoi ?? 0,
            'tong_tien_chi_phi' => $tongTienChiPhi ?? 0
        ];

        return response()->json([
            'status' => true,
            'message' => 'Lấy dữ liệu dashboard thành công',
            'data' => [
                'tong_quan' => $tongQuan,
                'doanh_thu_theo_thang' => $doanhThuFull,
                'doanh_thu_theo_ngay' => [
                    'list_ngay' => $listNgay,
                    'list_tong_tien_hang' => $listTongTien,
                    'list_so_don_hang' => $listSoDonHang
                ],
                'top_quan_an' => $topQuanAn,
                'top_mon_an' => $topMonAn,
                'don_hang_theo_trang_thai' => $trangThaiFull,
                'don_hang_gan_day' => $donHangGanDay
            ]
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // THỐNG KÊ ĐƠN HỦY
    // ══════════════════════════════════════════════════════════
    public function thongKeHuyDon(Request $request)
    {
        $dayBegin = $request->day_begin ?? now()->subDays(29)->toDateString();
        $dayEnd   = $request->day_end   ?? now()->toDateString();

        // ── KPI tổng quan ─────────────────────────────────────
        $tongDon    = DB::table('don_hangs')->count();
        $tongHuy    = DB::table('don_hangs')->where('tinh_trang', 5)->count();
        $tiLeHuy    = $tongDon > 0 ? round($tongHuy / $tongDon * 100, 2) : 0;

        // Đơn hủy trong khoảng lọc
        $huyTrongKhoang = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->whereDate('created_at', '>=', $dayBegin)
            ->whereDate('created_at', '<=', $dayEnd)
            ->count();

        // Tổng tiền đã hoàn (đơn online đã thanh toán bị hủy)
        $tongTienHoan = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->where('is_thanh_toan', 1)
            ->whereNotNull('payos_payment_link_id')
            ->whereDate('created_at', '>=', $dayBegin)
            ->whereDate('created_at', '<=', $dayEnd)
            ->sum('tong_tien');

        // ── Phân loại đơn hủy theo dữ liệu thực có ────────────
        // Nhóm 1: Đơn online (có PayOS link) bị hủy
        $huyOnline = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->whereNotNull('payos_payment_link_id')
            ->whereDate('created_at', '>=', $dayBegin)
            ->whereDate('created_at', '<=', $dayEnd)
            ->count();

        // Nhóm 2: Đơn tiền mặt bị hủy
        $huyTienMat = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->whereNull('payos_payment_link_id')
            ->whereDate('created_at', '>=', $dayBegin)
            ->whereDate('created_at', '<=', $dayEnd)
            ->count();

        // Nhóm 3: Đơn chưa thanh toán bị hủy (đặt nhưng không TT)
        $huyKhongThanhToan = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->where('is_thanh_toan', 0)
            ->whereDate('created_at', '>=', $dayBegin)
            ->whereDate('created_at', '<=', $dayEnd)
            ->count();

        // Tương thích với FE (giữ tên biến cũ để không phải sửa FE)
        $huyDoTimeout = $huyOnline;
        $huyDoAdmin   = $huyTienMat;
        $huyDoKhac    = max(0, $huyTrongKhoang - $huyOnline - $huyTienMat);


        // ── Xu hướng hủy 30 ngày ──────────────────────────────
        $huyTheoNgayRaw = DB::table('don_hangs')
            ->where('tinh_trang', 5)
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(created_at) as ngay'), DB::raw('COUNT(*) as so_luong'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('ngay')
            ->get()->keyBy('ngay');

        $listNgay = [];
        $listHuy  = [];
        for ($i = 29; $i >= 0; $i--) {
            $d = now()->subDays($i)->toDateString();
            $listNgay[] = now()->subDays($i)->format('d/m');
            $listHuy[]  = $huyTheoNgayRaw[$d]->so_luong ?? 0;
        }

        // ── Top 10 quán hủy nhiều ─────────────────────────────
        $topQuanHuy = DB::table('don_hangs as dh')
            ->join('quan_ans as qa', 'qa.id', '=', 'dh.id_quan_an')
            ->where('dh.tinh_trang', 5)
            ->whereDate('dh.created_at', '>=', $dayBegin)
            ->whereDate('dh.created_at', '<=', $dayEnd)
            ->select(
                'qa.ten_quan_an',
                'qa.hinh_anh',
                DB::raw('COUNT(dh.id) as so_don_huy'),
                DB::raw('(SELECT COUNT(*) FROM don_hangs WHERE id_quan_an = qa.id
                    AND created_at >= ? AND created_at <= ?) as tong_don')
            )
            ->addBinding([$dayBegin . ' 00:00:00', $dayEnd . ' 23:59:59'], 'select')
            ->groupBy('qa.id', 'qa.ten_quan_an', 'qa.hinh_anh')
            ->orderByDesc('so_don_huy')
            ->limit(10)
            ->get()
            ->map(fn($q) => [
                'ten_quan_an' => $q->ten_quan_an,
                'hinh_anh'   => $q->hinh_anh,
                'so_don_huy' => $q->so_don_huy,
                'tong_don'   => $q->tong_don,
                'ti_le_huy'  => $q->tong_don > 0 ? round($q->so_don_huy / $q->tong_don * 100, 1) : 0,
            ]);

        return response()->json([
            'status' => true,
            'data' => [
                'kpi' => [
                    'tong_huy'        => $tongHuy,
                    'ti_le_huy'       => $tiLeHuy,
                    'huy_trong_khoang'=> $huyTrongKhoang,
                    'tong_tien_hoan'  => $tongTienHoan ?? 0,
                    'huy_do_timeout'  => $huyDoTimeout,
                    'huy_do_admin'    => $huyDoAdmin,
                    'huy_do_khac'     => $huyDoKhac,
                ],
                'xu_huong' => [
                    'list_ngay' => $listNgay,
                    'list_huy'  => $listHuy,
                ],
                'ly_do_chart' => [
                    'labels' => ['Đơn online (PayOS) bị hủy', 'Đơn tiền mặt bị hủy', 'Khác'],
                    'data'   => [$huyDoTimeout, $huyDoAdmin, $huyDoKhac],
                ],
                'top_quan_huy' => $topQuanHuy,
            ],
        ]);
    }
}
