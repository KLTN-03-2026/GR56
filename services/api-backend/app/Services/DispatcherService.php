<?php

namespace App\Services;

use App\Models\DonHang;
use App\Models\Shipper;
use App\Models\ShipperLocation;
use App\Models\Zone;
use App\Models\CauHinh;
use App\Events\DispatchCandidateEvent;
use App\Events\DonHangMoiShipperEvent;
use App\Events\DispatchCancelledEvent;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DispatcherService
{
    // ─── Cấu hình cascade sequential ────────────────────────────────────────
    // Thời gian shipper có để nhận/từ chối (giây) trước khi cascade sang người tiếp theo
    const CASCADE_TIMEOUT_SEC  = 60;
    // Số shipper dự phòng tối đa trong 1 lần dispatch
    const MAX_CASCADE_TRIES    = 5;
    // Bán kính tối đa tìm shipper (km)
    const MAX_RADIUS_KM        = 10;

    // ─── Trọng số điểm ưu tiên shipper ──────────────────────────────────────
    // 1. Khoảng cách (dominant) — shipper gần nhất được ưu tiên nhất
    const WEIGHT_DISTANCE      = 60;   // max 60 điểm cho khoảng cách
    // 2. Kinh nghiệm — số đơn hoàn thành càng nhiều → càng ưu tiên
    const WEIGHT_EXPERIENCE    = 20;   // max 20 điểm cho kinh nghiệm
    // 3. Penalty — trừ điểm nếu có vi phạm gần đây
    const WEIGHT_PENALTY       = 15;   // max 15 điểm trừ
    // 4. Số đơn đang chạy — trừ điểm nếu đang bận nhiều đơn
    const WEIGHT_ACTIVE_ORDER  = 5;    // trừ 5 điểm mỗi đơn đang giao

    /**
     * Entry point: tìm & gửi đơn cho shipper phù hợp nhất.
     * Rule: is_open → gần quán → nhiều kinh nghiệm.
     */
    public function dispatch(DonHang $order): array
    {
        $shippers = $this->findAvailableShippers($order);

        if ($shippers->isEmpty()) {
            Log::warning("[Dispatcher] Không tìm thấy shipper nào cho đơn #{$order->ma_don_hang}");
            return ['ok' => false, 'reason' => 'no_shippers'];
        }

        Log::info("[Dispatcher] Tìm được {$shippers->count()} shipper ứng viên cho đơn #{$order->ma_don_hang}");

        return $this->sequentialCascade($order, $shippers);
    }

    /**
     * Tìm danh sách shipper phù hợp, sắp xếp theo rule:
     * 1. is_open = 1 (required)
     * 2. Gần quán ăn nhất (khoảng cách nhỏ nhất)
     * 3. Nhiều đơn hoàn thành nhất (kinh nghiệm)
     */
    public function findAvailableShippers(DonHang $order): \Illuminate\Support\Collection
    {
        // Lấy tọa độ quán ăn — dùng toa_do_y (lat) & toa_do_x (lng)
        $restaurant = $order->quanAn;
        $restaurantLat = floatval($restaurant->toa_do_y ?? $restaurant->vi_do ?? 0);
        $restaurantLng = floatval($restaurant->toa_do_x ?? $restaurant->vi_tri ?? 0);

        // Auto-swap nếu bị ngược (Lat VN ~ 16, Lng VN ~ 108)
        if ($restaurantLat > 30 && $restaurantLng < 30) {
            $temp = $restaurantLat;
            $restaurantLat = $restaurantLng;
            $restaurantLng = $temp;
        }

        // Lấy tất cả shipper đang hoạt động (is_active=1, is_open=1, không bị penalty cứng)
        $shippers = Shipper::available()->with(['locations', 'penalties'])->get();

        if ($shippers->isEmpty()) {
            return collect();
        }

        // Tính điểm ưu tiên cho từng shipper
        return $shippers
            ->map(function (Shipper $s) use ($restaurantLat, $restaurantLng) {
                $s->priority_score = $this->calculatePriorityScore($s, $restaurantLat, $restaurantLng);
                return $s;
            })
            ->sortByDesc('priority_score')
            ->take(self::MAX_CASCADE_TRIES)
            ->values();
    }

    /**
     * Chấm điểm shipper theo rule:
     * - Khoảng cách (dominant): càng gần càng cao
     * - Kinh nghiệm: số đơn hoàn thành
     * - Trừ điểm nếu có penalty hoặc đang bận nhiều đơn
     */
    public function calculatePriorityScore(Shipper $shipper, float $restaurantLat, float $restaurantLng): float
    {
        // 1. KHOẢNG CÁCH — dominant rule
        $location = ShipperLocation::latestFor($shipper);

        // Lấy tọa độ Shipper và auto-swap nếu bị ngược (Lat VN ~ 16, Lng VN ~ 108)
        $shipperLat = null;
        $shipperLng = null;
        if ($location && $location->lat && $location->lng) {
            $shipperLat = floatval($location->lat);
            $shipperLng = floatval($location->lng);
        } elseif (!empty($shipper->lat) && !empty($shipper->lng)) {
            $shipperLat = floatval($shipper->lat);
            $shipperLng = floatval($shipper->lng);
        }

        // Tự động đảo ngược nếu lat > 30 (vì vĩ độ VN < 30, kinh độ VN > 100)
        if ($shipperLat > 30 && $shipperLng < 30) {
            $temp = $shipperLat;
            $shipperLat = $shipperLng;
            $shipperLng = $temp;
        }

        if ($shipperLat && $shipperLng && $restaurantLat && $restaurantLng) {
            $distanceKm = $this->haversine($shipperLat, $shipperLng, $restaurantLat, $restaurantLng);
            // Trong vòng MAX_RADIUS_KM km mới xét; tuyến tính: 0km=60đ, MAX_RADIUS=0đ
            if ($distanceKm > self::MAX_RADIUS_KM) {
                Log::debug(sprintf("[Dispatcher] Shipper #%d: quá xa (%.1f km > %.0f km), loại", $shipper->id, $distanceKm, self::MAX_RADIUS_KM));
                return 0; // Quá xa → loại
            }
            $distanceScore = max(0, self::WEIGHT_DISTANCE * (1 - $distanceKm / self::MAX_RADIUS_KM));
        } else {
            // Không có GPS → cho điểm thấp (không loại hoàn toàn)
            $distanceScore = self::WEIGHT_DISTANCE * 0.3;
        }

        // 2. KINH NGHIỆM — số đơn hoàn thành (tối đa 20 điểm)
        $completedOrders = DonHang::where('id_shipper', $shipper->id)
            ->where('tinh_trang', DonHang::TINH_TRANG_DA_HOAN_THANH)
            ->count();
        // Logarithmic scaling: 10 đơn = ~6.6đ, 50 đơn = ~11.3đ, 200 đơn = ~15.2đ, 1000 đơn = ~20đ
        $experienceScore = min($completedOrders > 0 ? log($completedOrders + 1) * 4 : 0, self::WEIGHT_EXPERIENCE);

        // 3. PENALTY — trừ điểm (penalty score được tính sẵn)
        $penaltyDeduction = min($shipper->penalty_score * 1.5, self::WEIGHT_PENALTY);

        // 4. ĐƠN ĐANG CHẠY — trừ điểm nếu bận
        $activeOrders = $shipper->activeOrdersCount();
        $activeDeduction = min($activeOrders * self::WEIGHT_ACTIVE_ORDER, 20);

        $score = $distanceScore + $experienceScore - $penaltyDeduction - $activeDeduction;

        Log::debug(sprintf(
            "[Dispatcher] Shipper #%d: distance=%.1f, exp=%.1f, penalty=-%.1f, active=-%.1f → TOTAL=%.1f",
            $shipper->id,
            $distanceScore,
            $experienceScore,
            $penaltyDeduction,
            $activeDeduction,
            $score
        ));

        return max(0, $score);
    }

    /**
     * Sequential Cascade: gửi cho shipper ưu tiên nhất → đợi phản hồi → cascade tiếp.
     * Lưu danh sách ứng viên vào Redis để có thể cascade khi cần.
     */
    public function sequentialCascade(DonHang $order, $shippers): array
    {
        $candidateIds = $shippers->pluck('id')->toArray();

        // Lưu trạng thái cascade vào Cache (TTL 10 phút)
        try {
            \Illuminate\Support\Facades\Cache::put("order:{$order->id}:cascade", json_encode([
                'order_id'      => $order->id,
                'candidate_ids' => $candidateIds,
                'current_index' => 0,
                'started_at'    => now()->toIso8601String(),
            ]), now()->addMinutes(10));
        } catch (\Throwable $e) {
            Log::warning("[Dispatcher] Cache unavailable, cascade state not saved: " . $e->getMessage());
        }

        return $this->tryNextShipper($order, $candidateIds, 0);
    }

    /**
     * Gửi đơn cho shipper tại index trong danh sách ưu tiên.
     * Được gọi từ: sequentialCascade (lần đầu) hoặc tuChoiDonHangShipper/cascadeNext (cascade tiếp).
     */
    public function tryNextShipper(DonHang $order, array $candidateIds, int $index): array
    {
        if ($index >= count($candidateIds)) {
            Log::warning("[Dispatcher] Hết shipper ứng viên cho đơn #{$order->ma_don_hang}");
            // Reset cascade_shipper_id
            $order->update(['cascade_shipper_id' => 0]);
            return ['ok' => false, 'reason' => 'no_more_shippers'];
        }

        $shipperId = $candidateIds[$index];
        $shipper   = Shipper::find($shipperId);

        if (!$shipper || !$shipper->is_open || !$shipper->is_active) {
            $nextTry = $index + 2;
            Log::info("[Dispatcher] Shipper #{$shipperId} không còn sẵn sàng, bỏ qua → thử shipper #{$nextTry}");
            return $this->tryNextShipper($order, $candidateIds, $index + 1);
        }

        // Kiểm tra đơn vẫn còn chưa được nhận
        $order->refresh();
        if ($order->id_shipper != 0 || $order->tinh_trang == DonHang::TINH_TRANG_DA_HUY) {
            Log::info("[Dispatcher] Đơn #{$order->ma_don_hang} đã assign/hủy, bỏ cascade");
            return ['ok' => true, 'reason' => 'already_assigned'];
        }

        // Cập nhật cascade state trong Cache
        try {
            $cascadeJson = \Illuminate\Support\Facades\Cache::get("order:{$order->id}:cascade");
            if ($cascadeJson) {
                $state = json_decode($cascadeJson, true);
                $state['current_index']      = $index;
                $state['current_shipper_id'] = $shipperId;
                $state['expires_at']         = now()->addSeconds(self::CASCADE_TIMEOUT_SEC)->toIso8601String();
                \Illuminate\Support\Facades\Cache::put("order:{$order->id}:cascade", json_encode($state), now()->addMinutes(10));
            }
        } catch (\Throwable $e) {
            Log::warning("[Dispatcher] Cache unavailable, cascade state not updated: " . $e->getMessage());
        }

        // *** GHI cascade_shipper_id vào DB để FE biết đơn này đang chờ shipper nào ***
        $order->update(['cascade_shipper_id' => $shipperId]);

        // Bắn sự kiện đến kênh riêng của shipper được chọn
        try {
            event(new DispatchCandidateEvent($order, $shipper, 'sequential', self::CASCADE_TIMEOUT_SEC));
            Log::info("[Dispatcher] Gửi đơn #{$order->ma_don_hang} → Shipper #{$shipperId} ({$shipper->ho_va_ten}) [ưu tiên #" . ($index + 1) . "]");
        } catch (\Exception $e) {
            Log::warning("[Dispatcher] Lỗi fire DispatchCandidateEvent: " . $e->getMessage());
        }

        return [
            'ok'         => true,
            'method'     => 'sequential_cascade',
            'shipper'    => $shipper,
            'index'      => $index,
            'total'      => count($candidateIds),
            'expires_in' => self::CASCADE_TIMEOUT_SEC,
        ];
    }

    /**
     * Cascade tiếp: gọi khi shipper từ chối HOẶC timeout.
     * Reset cascade_shipper_id hiện tại → gửi cho shipper kế tiếp.
     */
    public function cascadeNext(int $orderId): array
    {
        $cascadeJson = null;
        try {
            $cascadeJson = \Illuminate\Support\Facades\Cache::get("order:{$orderId}:cascade");
        } catch (\Throwable $e) {
            Log::warning("[Dispatcher] Cache unavailable in cascadeNext: " . $e->getMessage());
        }

        if (!$cascadeJson) {
            Log::warning("[Dispatcher] Không tìm thấy cascade state cho đơn #{$orderId}, thử dispatch lại từ đầu");
            $order = DonHang::find($orderId);
            if (!$order) return ['ok' => false, 'reason' => 'order_not_found'];
            return $this->dispatch($order);
        }

        $state        = json_decode($cascadeJson, true);
        $candidateIds = $state['candidate_ids'] ?? [];
        $nextIndex    = ($state['current_index'] ?? 0) + 1;

        $order = DonHang::find($orderId);
        if (!$order) return ['ok' => false, 'reason' => 'order_not_found'];

        if ($order->id_shipper != 0) {
            try { \Illuminate\Support\Facades\Cache::forget("order:{$orderId}:cascade"); } catch (\Throwable $e) {}
            return ['ok' => true, 'reason' => 'already_assigned'];
        }

        if ($order->tinh_trang == DonHang::TINH_TRANG_DA_HUY) {
            try { \Illuminate\Support\Facades\Cache::forget("order:{$orderId}:cascade"); } catch (\Throwable $e) {}
            return ['ok' => false, 'reason' => 'order_cancelled'];
        }

        return $this->tryNextShipper($order, $candidateIds, $nextIndex);
    }

    /**
     * Khi shipper accept → xóa cascade state, reset cascade_shipper_id.
     */
    public function clearCascade(DonHang $order): void
    {
        try {
            \Illuminate\Support\Facades\Cache::forget("order:{$order->id}:cascade");
        } catch (\Throwable $e) {
            Log::warning("[Dispatcher] Cache unavailable in clearCascade: " . $e->getMessage());
        }
        $order->update(['cascade_shipper_id' => 0]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Haversine formula — tính khoảng cách (km) giữa 2 điểm GPS.
     */
    public function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371; // bán kính Trái Đất (km)
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1); // FIX: was $lng2 - $lat1
        $a    = sin($dLat / 2) ** 2
              + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * asin(sqrt(max(0, $a)));
    }

    public function isPeakHour(): bool
    {
        $hour = now()->hour;
        return ($hour >= 11 && $hour <= 13) || ($hour >= 17 && $hour <= 20);
    }

    public function getShipperAvgRating(Shipper $shipper): float
    {
        $avg = \App\Models\DanhGia::where('id_shipper', $shipper->id)->avg('sao_shipper');
        return round(floatval($avg ?? 5), 1);
    }
}
