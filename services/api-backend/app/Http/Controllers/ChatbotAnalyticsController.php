<?php

namespace App\Http\Controllers;

use App\Models\AiTrendingDish;
use App\Models\ChatbotAnalytic;
use App\Models\ChatbotSession;
use App\Models\CustomerProfile;
use App\Models\MonAn;
use App\Models\QuanAn;
use App\Models\DonHang;
use App\Models\ChiTietDonHang;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ChatbotAnalyticsController extends Controller
{
    public function trendingDishes(Request $request)
    {
        try {
            $period = (int) $request->input('period', 7);
            $limit = min((int) $request->input('limit', 20), 100);
            $categoryId = $request->input('id_danh_muc');

            // Use the same date as CLI: now()->toDateString() (end of period = today)
            // Fallback to most recent record if today hasn't been computed yet
            $periodDate = now()->toDateString();
            $periodDateFallback = AiTrendingDish::where('period_date', '<=', $periodDate)
                ->orderByDesc('period_date')
                ->value('period_date');

            $query = AiTrendingDish::with(['monAn:id,ten_mon_an,gia_ban,gia_khuyen_mai,hinh_anh', 'quanAn:id,ten_quan_an'])
                ->where('period_date', $periodDateFallback ?? $periodDate)
                ->where('id_mon_an', '>', 0)
                ->where('id_quan_an', '>', 0)
                ->orderByDesc('score')
                ->limit($limit);

            if ($categoryId) {
                $query->whereHas('monAn', fn($q) => $q->where('id_danh_muc', $categoryId));
            }

            $dishes = $query->get()->map(fn($item) => [
                'id' => $item->id,
                'mon_an' => $item->monAn ? [
                    'id' => $item->monAn->id,
                    'ten_mon_an' => $item->monAn->ten_mon_an,
                    'gia_ban' => $item->monAn->gia_ban,
                    'gia_khuyen_mai' => $item->monAn->gia_khuyen_mai,
                    'hinh_anh' => $item->monAn->hinh_anh,
                ] : null,
                'quan_an' => $item->quanAn ? [
                    'id' => $item->quanAn->id,
                    'ten_quan_an' => $item->quanAn->ten_quan_an,
                ] : null,
                'score' => $item->score,
                'order_count_7d' => $item->order_count_7d,
                'conversation_count_7d' => $item->conversation_count_7d,
                'is_hot' => $item->is_hot,
            ]);

            $hotCount = $dishes->where('is_hot', true)->count();
            $avgScore = $dishes->avg('score') ?? 0;

            return response()->json([
                'status' => true,
                'period' => $period,
                'period_date' => $periodDateFallback ?? $periodDate,
                'hot_count' => $hotCount,
                'avg_score' => round($avgScore, 1),
                'dishes' => $dishes,
            ]);
        } catch (\Exception $e) {
            Log::error('Trending dishes error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function liveTrending(Request $request)
    {
        try {
            $period = (int) $request->input('period', 7);
            $limit = min((int) $request->input('limit', 20), 100);

            $dateFrom = now()->subDays($period);

            // Top món từ đơn hàng chatbot đã hoàn thành
            $topDishes = DB::table('don_hangs')
                ->join('chi_tiet_don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
                ->join('mon_ans', 'chi_tiet_don_hangs.id_mon_an', '=', 'mon_ans.id')
                ->join('quan_ans', 'don_hangs.id_quan_an', '=', 'quan_ans.id')
                ->where('don_hangs.created_at', '>=', $dateFrom)
                ->where('don_hangs.tinh_trang', 4)
                ->where('don_hangs.is_chatbot', 1)
                ->select(
                    'mon_ans.id as mon_an_id',
                    'mon_ans.ten_mon_an',
                    'mon_ans.gia_ban',
                    'mon_ans.gia_khuyen_mai',
                    'mon_ans.hinh_anh',
                    'quan_ans.id as quan_an_id',
                    'quan_ans.ten_quan_an',
                    DB::raw('SUM(chi_tiet_don_hangs.so_luong) as total_ordered'),
                    DB::raw('COUNT(DISTINCT don_hangs.id) as order_count')
                )
                ->groupBy('mon_ans.id')
                ->orderByDesc('total_ordered')
                ->limit($limit)
                ->get();

            $totalOrders = DB::table('don_hangs')
                ->where('created_at', '>=', $dateFrom)
                ->where('tinh_trang', 4)
                ->where('is_chatbot', 1)
                ->count();

            $dishesWithScore = $topDishes->map(fn($d) => [
                'id' => $d->mon_an_id,
                'mon_an' => [
                    'id' => $d->mon_an_id,
                    'ten_mon_an' => $d->ten_mon_an,
                    'gia_ban' => $d->gia_ban,
                    'gia_khuyen_mai' => $d->gia_khuyen_mai,
                    'hinh_anh' => $d->hinh_anh,
                ],
                'quan_an' => [
                    'id' => $d->quan_an_id,
                    'ten_quan_an' => $d->ten_quan_an,
                ],
                'score' => (int) $d->total_ordered,
                'total_ordered' => (int) $d->total_ordered,
                'order_count' => (int) $d->order_count,
            ]);

            return response()->json([
                'status' => true,
                'period' => $period,
                'from' => $dateFrom->toDateString(),
                'to' => now()->toDateString(),
                'total_orders' => $totalOrders,
                'dishes' => $dishesWithScore,
            ]);
        } catch (\Exception $e) {
            Log::error('Live trending error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function chatbotAnalytics(Request $request)
    {
        try {
            $from = $request->input('from', now()->subDays(7)->toDateString());
            $to = $request->input('to', now()->toDateString());

            $fromDate = \Carbon\Carbon::parse($from)->startOfDay();
            $toDate = \Carbon\Carbon::parse($to)->endOfDay();

            // Intent distribution
            $intentStats = ChatbotAnalytic::whereBetween('created_at', [$fromDate, $toDate])
                ->select('intent', DB::raw('COUNT(*) as count'))
                ->groupBy('intent')
                ->orderByDesc('count')
                ->get();

            // Conversation volume by day
            $volumeByDay = ChatbotSession::whereBetween('created_at', [$fromDate, $toDate])
                ->select(
                    DB::raw("DATE(created_at) as date"),
                    DB::raw("COUNT(*) as sessions"),
                    DB::raw("SUM(JSON_LENGTH(messages)) as total_messages")
                )
                ->groupBy(DB::raw("DATE(created_at)"))
                ->orderBy('date')
                ->get();

            // Conversion rate: session có ít nhất 1 đơn hàng chatbot
            $totalSessions = ChatbotSession::whereBetween('created_at', [$fromDate, $toDate])->count();
            $convertedSessions = DB::table('don_hangs')
                ->join('chatbot_sessions', 'chatbot_sessions.id_khach_hang', '=', 'don_hangs.id_khach_hang')
                ->whereBetween('don_hangs.created_at', [$fromDate, $toDate])
                ->where('don_hangs.is_chatbot', 1)
                ->distinct('chatbot_sessions.id')
                ->count('chatbot_sessions.id');

            $conversionRate = $totalSessions > 0 ? round(($convertedSessions / $totalSessions) * 100, 1) : 0;

            // Top món ăn được hỏi nhiều nhất (từ analytics entities)
            $topMonAn = ChatbotAnalytic::whereBetween('created_at', [$fromDate, $toDate])
                ->whereNotNull('entities')
                ->get()
                ->flatMap(fn($a) => $a->entities['mon_an'] ?? [])
                ->filter(fn($e) => isset($e['id']))
                ->countBy('id')
                ->sortDesc()
                ->take(10);

            $topQuanAn = ChatbotAnalytic::whereBetween('created_at', [$fromDate, $toDate])
                ->whereNotNull('entities')
                ->get()
                ->flatMap(fn($a) => $a->entities['quan_an'] ?? [])
                ->filter(fn($e) => isset($e['id']))
                ->countBy('id')
                ->sortDesc()
                ->take(10);

            $topDishIds = $topMonAn->keys()->toArray();
            $topDishes = $topDishIds
                ? MonAn::whereIn('id', $topDishIds)->get()->map(fn($m) => [
                    'id' => $m->id,
                    'ten_mon_an' => $m->ten_mon_an,
                    'hinh_anh' => $m->hinh_anh,
                    'gia_ban' => $m->gia_ban,
                    'gia_khuyen_mai' => $m->gia_khuyen_mai,
                    'ask_count' => $topMonAn->get($m->id, 0),
                ])->sortByDesc('ask_count')->values()->toArray()
                : [];

            // Response type distribution
            $responseTypeStats = ChatbotAnalytic::whereBetween('created_at', [$fromDate, $toDate])
                ->select('response_type', DB::raw('COUNT(*) as count'))
                ->groupBy('response_type')
                ->get();

            $topQuanAnIds = $topQuanAn->keys()->toArray();
            $topRestaurants = $topQuanAnIds
                ? QuanAn::whereIn('id', $topQuanAnIds)->get()->map(fn($q) => [
                    'id' => $q->id,
                    'ten_quan_an' => $q->ten_quan_an,
                    'dia_chi' => $q->dia_chi,
                    'hinh_anh' => $q->hinh_anh ?? null,
                    'ask_count' => $topQuanAn->get($q->id, 0),
                ])->sortByDesc('ask_count')->values()->toArray()
                : [];

            // Top đơn hàng theo món (dishes ordered most from chatbot sessions)
            $topOrderedDishes = DB::table('don_hangs')
                ->join('chi_tiet_don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
                ->join('mon_ans', 'chi_tiet_don_hangs.id_mon_an', '=', 'mon_ans.id')
                ->whereBetween('don_hangs.created_at', [$fromDate, $toDate])
                ->where('don_hangs.tinh_trang', 4)
                ->where('don_hangs.is_chatbot', 1)
                ->select('mon_ans.id', 'mon_ans.ten_mon_an', 'mon_ans.hinh_anh', 'mon_ans.gia_ban',
                         DB::raw('SUM(chi_tiet_don_hangs.so_luong) as total_qty'),
                         DB::raw('COUNT(DISTINCT don_hangs.id) as order_count'))
                ->groupBy('mon_ans.id')
                ->orderByDesc('total_qty')
                ->limit(10)
                ->get();

            // Top đơn hàng theo quán
            $topOrderedRestaurants = DB::table('don_hangs')
                ->join('quan_ans', 'don_hangs.id_quan_an', '=', 'quan_ans.id')
                ->whereBetween('don_hangs.created_at', [$fromDate, $toDate])
                ->where('don_hangs.tinh_trang', 4)
                ->where('don_hangs.is_chatbot', 1)
                ->select('quan_ans.id', 'quan_ans.ten_quan_an', 'quan_ans.dia_chi', 'quan_ans.hinh_anh',
                         DB::raw('COUNT(*) as order_count'),
                         DB::raw('SUM(don_hangs.tong_tien) as total_revenue'))
                ->groupBy('quan_ans.id')
                ->orderByDesc('order_count')
                ->limit(10)
                ->get();

            return response()->json([
                'status' => true,
                'from' => $from,
                'to' => $to,
                'total_sessions' => $totalSessions,
                'converted_sessions' => $convertedSessions,
                'conversion_rate' => $conversionRate,
                'intent_distribution' => $intentStats,
                'volume_by_day' => $volumeByDay,
                'top_asked_dishes' => $topDishes,
                'top_asked_restaurants' => $topRestaurants,
                'top_ordered_dishes' => $topOrderedDishes,
                'top_ordered_restaurants' => $topOrderedRestaurants,
                'response_type_distribution' => $responseTypeStats,
            ]);
        } catch (\Exception $e) {
            Log::error('Chatbot analytics error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function customerInsights(Request $request, $idKhachHang)
    {
        try {
            $profile = CustomerProfile::where('id_khach_hang', $idKhachHang)->first();
            $recentSessions = ChatbotSession::where('id_khach_hang', $idKhachHang)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'session_token', 'trang_thai', 'messages', 'started_at', 'ended_at']);

            $recentAnalytics = ChatbotAnalytic::where('id_khach_hang', $idKhachHang)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            $totalOrders = DonHang::where('id_khach_hang', $idKhachHang)
                ->where('tinh_trang', 4)
                ->count();

            $totalSpent = DonHang::where('id_khach_hang', $idKhachHang)
                ->where('tinh_trang', 4)
                ->sum('tong_tien');

            $chatbotOrders = DonHang::where('id_khach_hang', $idKhachHang)
                ->where('is_chatbot', 1)
                ->where('tinh_trang', 4)
                ->count();

            return response()->json([
                'status' => true,
                'profile' => $profile,
                'recent_sessions' => $recentSessions,
                'recent_analytics' => $recentAnalytics,
                'total_orders' => $totalOrders,
                'total_spent' => $totalSpent,
                'chatbot_orders' => $chatbotOrders,
            ]);
        } catch (\Exception $e) {
            Log::error('Customer insights error: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function markConverted($analyticId)
    {
        try {
            $analytic = ChatbotAnalytic::find($analyticId);
            if (!$analytic) {
                return response()->json(['status' => false, 'message' => 'Not found'], 404);
            }
            $analytic->converted = true;
            $analytic->save();

            return response()->json(['status' => true]);
        } catch (\Exception $e) {
            return response()->json(['status' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
