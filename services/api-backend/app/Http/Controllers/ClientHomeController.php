<?php

namespace App\Http\Controllers;

use App\Models\DanhMuc;
use App\Models\DonHang;
use App\Models\MonAn;
use App\Models\QuanAn;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientHomeController extends Controller
{
    //bahahha
    public function getDataHome()
    {
        $mon_an = MonAn::where('mon_ans.tinh_trang', 1)
            ->where('mon_ans.gia_khuyen_mai', '>', 0)
            ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Nước Ép%')
            ->join('quan_ans', 'quan_ans.id', 'mon_ans.id_quan_an')
            ->select('mon_ans.*', 'quan_ans.ten_quan_an')
            ->orderBy('mon_ans.gia_khuyen_mai')
            ->get();

        $quan_an_yeu_thich = QuanAn::where('quan_ans.tinh_trang', 1)
            ->where('quan_ans.is_active', 1)
            ->select('quan_ans.id', 'quan_ans.ten_quan_an', 'quan_ans.hinh_anh', 'quan_ans.dia_chi', DB::raw('(SELECT COALESCE(ROUND(AVG(sao_quan_an), 1), 5.0) FROM danh_gias WHERE danh_gias.id_quan_an = quan_ans.id) as sao_trung_binh'))
            ->get();

        $voucher = Voucher::where('vouchers.tinh_trang', 1)
            ->where('vouchers.thoi_gian_bat_dau', '<=', now()->toDateString())
            ->where('vouchers.thoi_gian_ket_thuc', '>=', now()->toDateString())
            ->whereIn('vouchers.loai_voucher', ['public', 'system'])
            ->leftJoin('quan_ans', 'quan_ans.id', 'vouchers.id_quan_an')
            ->select('vouchers.*', 'quan_ans.ten_quan_an')
            ->get();

        $phan_loai = DanhMuc::where('danh_mucs.tinh_trang', 1)
            ->join('mon_ans', 'mon_ans.id_danh_muc', 'danh_mucs.id')
            ->where('mon_ans.tinh_trang', 1)
            ->select('danh_mucs.id', 'danh_mucs.ten_danh_muc', 'danh_mucs.slug_danh_muc', 'danh_mucs.hinh_anh', 'danh_mucs.id_danh_muc_cha')
            ->distinct()
            ->get();

        $quan_an_sale = QuanAn::leftjoin('mon_ans', 'mon_ans.id_quan_an', 'quan_ans.id')
            ->where('quan_ans.tinh_trang', 1)
            ->where('quan_ans.is_active', 1)
            ->where('mon_ans.tinh_trang', 1)
            ->where('mon_ans.gia_khuyen_mai', '>', 0) // Chỉ lấy quán có món khuyến mãi
            ->select(
                'quan_ans.id',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi'
            )
            ->groupBy('quan_ans.id', 'quan_ans.ten_quan_an', 'quan_ans.hinh_anh', 'quan_ans.dia_chi')
            ->inRandomOrder()
            ->get();
        $top_mon_an_tuan = $this->monAnBanChayTuan();

        return response()->json([
            'mon_an'                => $mon_an,
            'voucher'               => $voucher,
            'quan_an_yeu_thich'     => $quan_an_yeu_thich,
            'phan_loai'             => $phan_loai,
            'quan_an_sale'          => $quan_an_sale,
            'top_mon_an_tuan'       => $top_mon_an_tuan,
        ]);
    }

    /**
     * Lấy top món ăn bán chạy nhất trong tuần hiện tại
     * Tính theo số lượng bán (SUM chi_tiet_don_hangs.so_luong) của đơn tinh_trang=3
     */
    private function monAnBanChayTuan(): \Illuminate\Support\Collection
    {
        $startOfWeek = now()->startOfWeek(); // Thứ 2 tuần này
        $endOfWeek   = now()->endOfWeek();   // Chủ nhật tuần này

        return MonAn::join('chi_tiet_don_hangs', 'chi_tiet_don_hangs.id_mon_an', '=', 'mon_ans.id')
            ->join('don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
            ->join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
            ->where('don_hangs.tinh_trang', 4)                          // Chỉ đơn giao thành công
            ->where('don_hangs.created_at', '>=', $startOfWeek)
            ->where('don_hangs.created_at', '<=', $endOfWeek)
            ->where('mon_ans.tinh_trang', 1)                            // Món đang bán
            ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Nước Ép%')
            ->where('quan_ans.tinh_trang', 1)                           // Quán đang mở
            ->where('quan_ans.is_active', 1)
            ->select(
                'mon_ans.id',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                'mon_ans.id_quan_an',
                'quan_ans.ten_quan_an',
                DB::raw('SUM(chi_tiet_don_hangs.so_luong) as tong_so_luong_ban'),
                DB::raw('COUNT(DISTINCT don_hangs.id) as tong_don_ban')
            )
            ->groupBy(
                'mon_ans.id',
                'mon_ans.ten_mon_an',
                'mon_ans.hinh_anh',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                'mon_ans.id_quan_an',
                'quan_ans.ten_quan_an'
            )
            ->orderByDesc('tong_so_luong_ban')
            ->limit(12)
            ->get();
    }



    public function getDataQuanAn()
    {
        $quan_an_yeu_thich = QuanAn::leftJoin('don_hangs', 'don_hangs.id_quan_an', 'quan_ans.id')
            ->leftjoin('mon_ans', 'mon_ans.id_quan_an', 'quan_ans.id')
            ->select(
                'quan_ans.id',
                'quan_ans.ten_quan_an',
                'quan_ans.hinh_anh',
                'quan_ans.dia_chi',
                DB::raw('MIN(CASE WHEN mon_ans.gia_khuyen_mai > 0 THEN mon_ans.gia_khuyen_mai ELSE mon_ans.gia_ban END) as gia_min'),
                DB::raw('MAX(CASE WHEN mon_ans.gia_khuyen_mai > 0 THEN mon_ans.gia_khuyen_mai ELSE mon_ans.gia_ban END) as gia_max'),
                DB::raw('(SELECT COALESCE(ROUND(AVG(sao_quan_an), 1), 5.0) FROM danh_gias WHERE danh_gias.id_quan_an = quan_ans.id) as sao_trung_binh')
            )
            ->groupBy('quan_ans.id', 'quan_ans.ten_quan_an', 'quan_ans.hinh_anh', 'quan_ans.dia_chi') // Cần groupBy khi dùng aggregate
            ->get();


        return response()->json([
            'quan_an_yeu_thich'     => $quan_an_yeu_thich,
        ]);
    }
    public function timKiemGoiY(Request $request)
    {
        try {
            $keyword = $request->input('keyword', '');
            // Validate keyword
            if (strlen($keyword) < 2) {
                return response()->json([
                    'status' => false,
                    'message' => 'Từ khóa phải có ít nhất 2 ký tự',
                    'mon_an' => [],
                    'quan_an' => []
                ]);
            }

            // Tìm kiếm món ăn với sắp xếp theo độ liên quan
            $monAn = MonAn::where('mon_ans.tinh_trang', 1)
                ->join('quan_ans', 'quan_ans.id', 'mon_ans.id_quan_an')
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where(function ($query) use ($keyword) {
                    $query->where('mon_ans.ten_mon_an', 'like', '%' . $keyword . '%');
                })
                ->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    // Sắp xếp theo độ liên quan: khớp chính xác > bắt đầu bằng > chứa
                    DB::raw("CASE
                        WHEN LOWER(mon_ans.ten_mon_an) = LOWER('{$keyword}') THEN 1
                        WHEN LOWER(mon_ans.ten_mon_an) LIKE LOWER('{$keyword}%') THEN 2
                        ELSE 3
                    END as relevance")
                )
                ->orderBy('relevance', 'asc')
                ->orderBy('mon_ans.ten_mon_an', 'asc')
                ->get();

            // Tìm kiếm quán ăn với sắp xếp theo độ liên quan
            $quanAn = QuanAn::where('tinh_trang', 1)
                ->where('is_active', 1)
                ->where(function ($query) use ($keyword) {
                    $query->where('ten_quan_an', 'like', '%' . $keyword . '%')
                        ->orWhere('dia_chi', 'like', '%' . $keyword . '%');
                })
                ->select(
                    'id',
                    'ten_quan_an',
                    'hinh_anh',
                    'dia_chi',
                    // Sắp xếp theo độ liên quan
                    DB::raw("CASE
                        WHEN LOWER(ten_quan_an) = LOWER('{$keyword}') THEN 1
                        WHEN LOWER(ten_quan_an) LIKE LOWER('{$keyword}%') THEN 2
                        WHEN LOWER(dia_chi) LIKE LOWER('%{$keyword}%') THEN 4
                        ELSE 3
                    END as relevance")
                )
                ->orderBy('relevance', 'asc')
                ->orderBy('ten_quan_an', 'asc')
                ->get();
            return response()->json([
                'status' => true,
                'mon_an' => $monAn,
                'quan_an' => $quanAn
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
                'mon_an' => [],
                'quan_an' => []
            ], 500);
        }
    }
}
