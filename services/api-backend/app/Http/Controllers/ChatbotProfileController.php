<?php

namespace App\Http\Controllers;

use App\Models\CustomerProfile;
use App\Models\MonAn;
use App\Models\QuanAn;
use App\Models\DonHang;
use App\Models\ChiTietDonHang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChatbotProfileController extends Controller
{
    public function getProfile(Request $request, $idKhachHang)
    {
        try {
            $profile = CustomerProfile::firstOrCreate(
                ['id_khach_hang' => $idKhachHang],
                [
                    'so_lan_dat' => 0,
                    'dia_chi_thuong_xuyen' => [],
                    'top_categories' => [],
                    'top_mon_an' => [],
                    'top_quan_an' => [],
                    'khau_vi' => 'unknown',
                    'price_range' => 'mid',
                    'tags' => [],
                    'intent_history' => [],
                    'mood_preferences' => [],
                ]
            );

            return response()->json([
                'status' => true,
                'profile' => $profile,
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateProfile(Request $request, $idKhachHang)
    {
        try {
            $validated = $request->validate([
                'intent' => 'nullable|string|max:100',
                'entities' => 'nullable|array',
                'tags' => 'nullable|array',
                'khau_vi' => 'nullable|in:unknown,thanh_dam,cay,ngot,bo_duong',
                'price_range' => 'nullable|in:budget,mid,premium',
                'id_mon_an' => 'nullable|integer',
                'ten_mon_an' => 'nullable|string|max:255',
                'id_quan_an' => 'nullable|integer',
                'ten_quan_an' => 'nullable|string|max:255',
                'id_danh_muc' => 'nullable|integer',
                'ten_danh_muc' => 'nullable|string|max:255',
            ]);

            $profile = CustomerProfile::firstOrCreate(
                ['id_khach_hang' => $idKhachHang],
                [
                    'so_lan_dat' => 0,
                    'dia_chi_thuong_xuyen' => [],
                    'top_categories' => [],
                    'top_mon_an' => [],
                    'top_quan_an' => [],
                    'khau_vi' => 'unknown',
                    'price_range' => 'mid',
                    'tags' => [],
                    'intent_history' => [],
                    'mood_preferences' => [],
                ]
            );

            // Cập nhật khẩu vị
            if (!empty($validated['khau_vi'])) {
                $profile->khau_vi = $validated['khau_vi'];
            }

            // Cập nhật price range
            if (!empty($validated['price_range'])) {
                $profile->price_range = $validated['price_range'];
            }

            // Cập nhật tags
            if (!empty($validated['tags']) && is_array($validated['tags'])) {
                $existingTags = $profile->tags ?? [];
                $profile->tags = array_values(array_unique(array_merge($existingTags, $validated['tags'])));
            }

            // Cập nhật top mon_an
            if (!empty($validated['id_mon_an']) && !empty($validated['ten_mon_an'])) {
                $profile->updateTopList('top_mon_an', $validated['id_mon_an'], $validated['ten_mon_an']);
            }

            // Cập nhật top quan_an
            if (!empty($validated['id_quan_an']) && !empty($validated['ten_quan_an'])) {
                $profile->updateTopList('top_quan_an', $validated['id_quan_an'], $validated['ten_quan_an']);
            }

            // Cập nhật top danh_muc
            if (!empty($validated['id_danh_muc']) && !empty($validated['ten_danh_muc'])) {
                $profile->updateTopList('top_categories', $validated['id_danh_muc'], $validated['ten_danh_muc']);
            }

            // Cập nhật intent history
            if (!empty($validated['intent'])) {
                $profile->recordIntent($validated['intent']);
            }

            $profile->save();

            return response()->json([
                'status' => true,
                'profile' => $profile,
            ]);
        } catch (\Exception $e) {
            Log::error('Update profile error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function recommend(Request $request, $idKhachHang)
    {
        try {
            $intent = $request->input('intent', '');
            $limit = min((int) $request->input('limit', 8), 20);

            $profile = CustomerProfile::where('id_khach_hang', $idKhachHang)->first();

            // Build keywords từ profile
            $keywords = [];
            if ($profile) {
                $keywords = array_merge(
                    $profile->top_categories ? collect($profile->top_categories)->pluck('name')->toArray() : [],
                    $profile->top_mon_an ? collect($profile->top_mon_an)->pluck('name')->toArray() : [],
                    $profile->tags ?? []
                );
            }

            // Thêm intent keyword
            if ($intent) {
                $intentMap = [
                    'healthy' => ['salad', 'rau', 'sinh tố', 'nước ép'],
                    'cay' => ['cay', 'ớt', 'bún bò', 'bún trộn'],
                    'tiết_kiệm' => ['giảm giá', 'khuyến mãi', 'combo'],
                    'mood_vui' => ['bánh', 'trà sữa', 'café'],
                    'mood_buồn' => ['súp', 'cháo', 'thức ăn ấm'],
                ];
                $keywords = array_merge($keywords, $intentMap[$intent] ?? []);
            }

            $keywords = array_values(array_unique(array_filter(array_map('trim', $keywords))));
            $keywords = array_slice($keywords, 0, 10);

            $query = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                ->where('mon_ans.tinh_trang', 1)
                ->where('quan_ans.tinh_trang', 1)
                ->where('quan_ans.is_active', 1)
                ->where('mon_ans.ten_mon_an', 'not like', 'Thêm %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
                ->where('mon_ans.ten_mon_an', 'not like', 'Ly %');

            if (!empty($keywords)) {
                $query->where(function ($q) use ($keywords) {
                    foreach ($keywords as $kw) {
                        $q->orWhere('mon_ans.ten_mon_an', 'like', '%' . $kw . '%')
                            ->orWhere('danh_mucs.ten_danh_muc', 'like', '%' . $kw . '%')
                            ->orWhere('mon_ans.mo_ta', 'like', '%' . $kw . '%');
                    }
                });

                // Tính score
                $scoreExpr = '0';
                foreach ($keywords as $kw) {
                    $safe = addslashes($kw);
                    $scoreExpr .= " + IF(LOWER(mon_ans.ten_mon_an) LIKE LOWER('%{$safe}%'), 2, 0)";
                    $scoreExpr .= " + IF(LOWER(danh_mucs.ten_danh_muc) LIKE LOWER('%{$safe}%'), 1, 0)";
                }
                $query->select(
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
                    DB::raw("({$scoreExpr}) as diem_lien_quan")
                )->orderByDesc(DB::raw("({$scoreExpr})"));
            } else {
                $query->select(
                    'mon_ans.id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'mon_ans.mo_ta',
                    'mon_ans.id_quan_an',
                    'quan_ans.ten_quan_an',
                    'quan_ans.dia_chi',
                    'danh_mucs.ten_danh_muc'
                )->orderByDesc('mon_ans.gia_khuyen_mai');
            }

            $monAn = $query->limit($limit)->get();

            return response()->json([
                'status' => true,
                'keywords' => $keywords,
                'intent' => $intent,
                'mon_an' => $monAn,
            ]);
        } catch (\Exception $e) {
            Log::error('Recommend error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function reorder(Request $request, $idKhachHang)
    {
        try {
            $limit = min((int) $request->input('limit', 3), 10);

            // Lấy top món từ profile hoặc từ lịch sử đơn hàng gần đây
            $profile = CustomerProfile::where('id_khach_hang', $idKhachHang)->first();
            $reorderItems = [];

            if ($profile && !empty($profile->top_mon_an)) {
                $topIds = collect($profile->top_mon_an)->take($limit)->pluck('id')->toArray();
            } else {
                // Fallback: lấy từ đơn hàng gần nhất
                $topIds = ChiTietDonHang::join('don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
                    ->where('don_hangs.id_khach_hang', $idKhachHang)
                    ->where('don_hangs.tinh_trang', 4)
                    ->where('don_hangs.created_at', '>=', now()->subDays(60))
                    ->groupBy('chi_tiet_don_hangs.id_mon_an')
                    ->orderByDesc(DB::raw('SUM(chi_tiet_don_hangs.so_luong)'))
                    ->limit($limit)
                    ->pluck('chi_tiet_don_hangs.id_mon_an')
                    ->toArray();
            }

            if (!empty($topIds)) {
                $reorderItems = MonAn::join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
                    ->leftJoin('danh_mucs', 'danh_mucs.id', '=', 'mon_ans.id_danh_muc')
                    ->whereIn('mon_ans.id', $topIds)
                    ->where('mon_ans.tinh_trang', 1)
                    ->where('quan_ans.tinh_trang', 1)
                    ->where('quan_ans.is_active', 1)
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
                        'danh_mucs.ten_danh_muc'
                    )
                    ->get();
            }

            return response()->json([
                'status' => true,
                'reorder_items' => $reorderItems,
                'has_history' => count($reorderItems) > 0,
            ]);
        } catch (\Exception $e) {
            Log::error('Reorder error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function afterOrder(Request $request, $idKhachHang)
    {
        try {
            $validated = $request->validate([
                'don_hang_id' => 'required|integer',
                'id_mon_an_list' => 'nullable|array',
                'id_quan_an' => 'nullable|integer',
                'ten_quan_an' => 'nullable|string|max:255',
                'id_danh_muc' => 'nullable|integer',
                'ten_danh_muc' => 'nullable|string|max:255',
            ]);

            $profile = CustomerProfile::firstOrCreate(
                ['id_khach_hang' => $idKhachHang],
                [
                    'so_lan_dat' => 0,
                    'dia_chi_thuong_xuyen' => [],
                    'top_categories' => [],
                    'top_mon_an' => [],
                    'top_quan_an' => [],
                    'khau_vi' => 'unknown',
                    'price_range' => 'mid',
                    'tags' => [],
                    'intent_history' => [],
                    'mood_preferences' => [],
                ]
            );

            $profile->incrementOrderCount();

            // Cập nhật top món
            $monAnIds = $validated['id_mon_an_list'] ?? [];
            foreach ($monAnIds as $item) {
                $profile->updateTopList('top_mon_an', $item['id'], $item['name'] ?? '');
            }

            // Cập nhật top quán
            if (!empty($validated['id_quan_an']) && !empty($validated['ten_quan_an'])) {
                $profile->updateTopList('top_quan_an', $validated['id_quan_an'], $validated['ten_quan_an']);
            }

            // Cập nhật top danh mục
            if (!empty($validated['id_danh_muc']) && !empty($validated['ten_danh_muc'])) {
                $profile->updateTopList('top_categories', $validated['id_danh_muc'], $validated['ten_danh_muc']);
            }

            $profile->save();

            return response()->json([
                'status' => true,
                'profile' => $profile,
            ]);
        } catch (\Exception $e) {
            Log::error('After order error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
