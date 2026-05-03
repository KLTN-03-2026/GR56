<?php

namespace App\Http\Controllers;

use App\Models\DanhMuc;
use App\Models\MonAn;
use App\Models\QuanAn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatbotController extends Controller
{
    /**
     * Tìm kiếm món ăn từ database dựa trên từ khóa chatbot
     * Endpoint PUBLIC: /api/chatbot/tim-kiem-mon-an
     */
    public function timKiemMonAn(Request $request)
    {
        try {
            $keyword = trim($request->input('keyword', ''));
            $limit   = (int) $request->input('limit', 8);
            $limit   = min(max($limit, 1), 20);

            if (strlen($keyword) < 1) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Từ khóa không hợp lệ',
                    'mon_an'  => [],
                    'quan_an' => [],
                ]);
            }

            // ── Tìm món ăn ──────────────────────────────────────────────
            $monAn = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where(function ($q) use ($keyword) {
                    $q->where('mon_ans.ten_mon_an', 'like', '%' . $keyword . '%')
                        ->orWhere('danh_mucs.ten_danh_muc', 'like', '%' . $keyword . '%')
                        ->orWhere('mon_ans.mo_ta', 'like', '%' . $keyword . '%');
                })
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
                ->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.mo_ta',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    'quan_ans.dia_chi',
                    'danh_mucs.ten_danh_muc',
                    DB::raw("CASE
                        WHEN LOWER(mon_ans.ten_mon_an) = LOWER('{$keyword}') THEN 1
                        WHEN LOWER(mon_ans.ten_mon_an) LIKE LOWER('{$keyword}%') THEN 2
                        ELSE 3
                    END as relevance")
                )
                ->orderBy('relevance')
                ->orderByDesc('mon_ans.gia_khuyen_mai')
                ->limit($limit)
                ->get();

            // ── Tìm quán ăn ─────────────────────────────────────────────
            $quanAn = QuanAn::where('tinh_trang', 1)
                ->where('is_active', 1)
                ->where(function ($q) use ($keyword) {
                    $q->where('ten_quan_an', 'like', '%' . $keyword . '%')
                        ->orWhere('dia_chi', 'like', '%' . $keyword . '%');
                })
                ->select('id', 'ten_quan_an', 'hinh_anh', 'dia_chi')
                ->limit(4)
                ->get();

            return response()->json([
                'status'  => true,
                'keyword' => $keyword,
                'mon_an'  => $monAn,
                'quan_an' => $quanAn,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
                'mon_an'  => [],
                'quan_an' => [],
            ], 500);
        }
    }

    /**
     * Gợi ý món ăn cá nhân hóa theo danh sách sở thích (keywords) của khách hàng
     * Endpoint PUBLIC: /api/chatbot/goi-y-ca-nhan
     * Body: { "keywords": ["bún", "cơm", "trà sữa"] }
     */
    public function goiYCaNhan(Request $request)
    {
        try {
            $keywords = $request->input('keywords', []);

            // Lọc + giới hạn
            if (!is_array($keywords)) {
                $keywords = [];
            }
            $keywords = array_filter(array_map('trim', $keywords));
            $keywords = array_values(array_unique($keywords));
            $keywords = array_slice($keywords, 0, 10); // tối đa 10 keyword

            if (empty($keywords)) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không có sở thích nào được cung cấp',
                    'mon_an'  => [],
                ]);
            }

            // Build WHERE clause: OR cho tất cả keywords
            $query = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
                ->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('mon_ans.ten_mon_an', 'like', '%' . $kw . '%')
                            ->orWhere('danh_mucs.ten_danh_muc', 'like', '%' . $kw . '%')
                            ->orWhere('mon_ans.mo_ta', 'like', '%' . $kw . '%');
                    }
                });

            // Tính điểm liên quan: mỗi keyword match + 1 điểm
            $scoreExpr = '0';
            foreach ($keywords as $kw) {
                $safe = addslashes($kw);
                $scoreExpr .= " + IF(LOWER(mon_ans.ten_mon_an) LIKE LOWER('%{$safe}%'), 2, 0)";
                $scoreExpr .= " + IF(LOWER(danh_mucs.ten_danh_muc) LIKE LOWER('%{$safe}%'), 1, 0)";
            }

            $monAn = $query->select(
                'mon_ans.id',
                'mon_ans.ten_mon_an',
                'mon_ans.gia_ban',
                'mon_ans.gia_khuyen_mai',
                'mon_ans.hinh_anh',
                'mon_ans.id_quan_an',
                'quan_ans.ten_quan_an',
                'quan_ans.dia_chi',
                'danh_mucs.ten_danh_muc',
                DB::raw("({$scoreExpr}) as diem_lien_quan")
            )
                ->orderByDesc(DB::raw("({$scoreExpr})"))
                ->orderByDesc('mon_ans.gia_khuyen_mai')
                ->limit(12)
                ->get();

            return response()->json([
                'status'   => true,
                'keywords' => $keywords,
                'mon_an'   => $monAn,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
                'mon_an'  => [],
            ], 500);
        }
    }

    /**
     * Món ăn bán chạy nhất (30 ngày gần nhất)
     * GET /api/chatbot/mon-an-ban-chay
     */
    public function monAnBanChay(Request $request)
    {
        try {
            $monAn = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->join('chi_tiet_don_hangs', 'chi_tiet_don_hangs.id_mon_an', '=', 'mon_ans.id')
                ->join('don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where('don_hangs.tinh_trang', 4)
                ->where('don_hangs.created_at', '>=', now()->subDays(30))
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->groupBy(
                    'mon_ans.id', 'mon_ans.ten_mon_an', 'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai', 'mon_ans.hinh_anh',
                    'mon_ans.id_quan_an', 'quan_ans.ten_quan_an', 'quan_ans.dia_chi'
                )
                ->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    'quan_ans.dia_chi',
                    DB::raw('COUNT(chi_tiet_don_hangs.id) as so_luong_ban')
                )
                ->orderByDesc('so_luong_ban')
                ->limit(8)
                ->get();

            return response()->json(['status' => true, 'mon_an' => $monAn]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'mon_an' => []], 500);
        }
    }
}
