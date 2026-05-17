<?php

namespace App\Services;

use App\Models\Shipper;
use App\Models\ShipperLocation;
use App\Models\ShipperPenalty;
use App\Models\DiaChi;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ShipperLocationService
{
    const GEO_KEY        = 'shippers:geo';
    const GEO_TTL_HOURS = 24;

    // ─── Fraud detection thresholds ──────────────────────────────────────────────
    const MAX_SPEED_KMH    = 150;    // Tốc độ tối đa hợp lệ (km/h)
    const MAX_JUMP_KM      = 5;      // Teleport tối đa trong 10 giây
    const MAX_STATIONARY_MINS = 5;    // Đứng yên quá lâu sau khi nhận đơn

    // ─── Update location (gọi từ DonHangController::capNhatViTriShipper) ──────
    public function updateLocation(
        Shipper $shipper,
        float $lat,
        float $lng,
        ?float $accuracy = null,
        ?string $address = null
    ): array {
        // 1. Fraud detection
        $fraud = $this->detectFraud($shipper, $lat, $lng);
        if ($fraud['flagged']) {
            $this->applyFraudPenalty($shipper, $fraud['reason']);
            return $fraud; // flagged
        }

        // 2. Write to DB
        $location = ShipperLocation::create([
            'shipper_id'   => $shipper->id,
            'lat'          => $lat,
            'lng'          => $lng,
            'accuracy'     => $accuracy,
            'address'       => $address,
            'recorded_at'   => now(),
        ]);

        // 3. Update plain columns on shipper (for backward compat)
        $shipper->update([
            'lat' => $lat,
            'lng' => $lng,
            'last_location_update' => now(),
        ]);

        // 4. Write to Redis GEO
        $this->geoAdd($shipper->id, $lng, $lat);

        return [
            'ok'      => true,
            'lat'     => $lat,
            'lng'     => $lng,
            'flagged' => false,
        ];
    }

    // ─── Redis GEOADD ────────────────────────────────────────────────────────────
    public function geoAdd(int $shipperId, float $lng, float $lat): void
    {
        try {
            Redis::geoadd(self::GEO_KEY, $lng, $lat, $shipperId);
            Redis::expire(self::GEO_KEY, self::GEO_TTL_HOURS * 3600);
        } catch (\Exception $e) {
            Log::warning('Redis GEOADD failed', [
                'shipper_id' => $shipperId,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    // ─── GEORADIUS: tìm shipper trong bán kính ────────────────────────────────
    public function geoRadius(float $lng, float $lat, float $radiusKm): array
    {
        try {
            $results = Redis::command('GEORADIUS', [
                self::GEO_KEY, $lng, $lat, $radiusKm, 'km',
                'WITHDIST', 'ASC',
            ]);

            if (empty($results)) return [];

            return collect($results)->map(function ($item) {
                // $item = [shipper_id, distance]
                return [
                    'shipper_id' => (int) $item[0],
                    'distance_km' => (float) $item[1],
                ];
            })->toArray();
        } catch (\Exception $e) {
            Log::warning('Redis GEORADIUS failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    // ─── Fraud Detection ────────────────────────────────────────────────────────
    public function detectFraud(Shipper $shipper, float $lat, float $lng): array
    {
        $last = ShipperLocation::where('shipper_id', $shipper->id)
            ->latest('recorded_at')
            ->first();

        if (!$last) {
            return ['flagged' => false, 'reason' => null];
        }

        $timeDiffSec = max($last->recorded_at->diffInSeconds(now()), 1);
        $distKm = $this->haversine($last->lat, $last->lng, $lat, $lng);

        // 1. Impossible speed
        $speedKmh = ($distKm / $timeDiffSec) * 3600;
        if ($speedKmh > self::MAX_SPEED_KMH) {
            Log::critical('GPS FRAUD: Impossible speed', [
                'shipper_id' => $shipper->id,
                'speed_kmh'  => round($speedKmh, 1),
                'dist_km'    => round($distKm, 2),
                'time_sec'   => $timeDiffSec,
            ]);
            return [
                'flagged' => true,
                'reason'  => 'impossible_speed',
                'speed_kmh' => round($speedKmh, 1),
                'dist_km'   => round($distKm, 2),
            ];
        }

        // 2. GPS teleport (>5km trong < 10s)
        if ($timeDiffSec <= 10 && $distKm > self::MAX_JUMP_KM) {
            Log::critical('GPS FRAUD: Teleport detected', [
                'shipper_id' => $shipper->id,
                'dist_km'    => round($distKm, 2),
                'time_sec'   => $timeDiffSec,
            ]);
            return [
                'flagged' => true,
                'reason'  => 'gps_teleport',
                'dist_km' => round($distKm, 2),
                'time_sec' => $timeDiffSec,
            ];
        }

        return ['flagged' => false, 'reason' => null];
    }

    // ─── Apply fraud penalty ────────────────────────────────────────────────────
    protected function applyFraudPenalty(Shipper $shipper, string $reason): void
    {
        ShipperPenalty::create([
            'shipper_id'     => $shipper->id,
            'loai_penalty'   => ShipperPenalty::LOAI_GPS_FRAUD,
            'mo_ta'          => "GPS Fraud: {$reason}",
            'diem_tru'       => ShipperPenalty::BANG_DIEM[ShipperPenalty::LOAI_GPS_FRAUD],
            'hieu_luc_den'   => now()->addHours(24),
            'da_giai_quyet'  => false,
        ]);

        Log::critical('Shipper penalized for GPS fraud', [
            'shipper_id' => $shipper->id,
            'reason'     => $reason,
        ]);
    }

    // ─── Sync all online shippers to Redis GEO ─────────────────────────────────
    public function syncAllToRedis(): int
    {
        $count = 0;
        Shipper::online()->chunk(100, function ($shippers) use (&$count) {
            foreach ($shippers as $shipper) {
                if ($shipper->lat && $shipper->lng) {
                    $this->geoAdd($shipper->id, $shipper->lng, $shipper->lat);
                    $count++;
                }
            }
        });
        return $count;
    }

    // ─── Remove shipper from Redis GEO ─────────────────────────────────────────
    public function geoRemove(int $shipperId): void
    {
        try {
            Redis::zrem(self::GEO_KEY, $shipperId);
        } catch (\Exception $e) {
            Log::warning('Redis ZREM failed', ['shipper_id' => $shipperId, 'error' => $e->getMessage()]);
        }
    }

    // ─── Haversine helper ─────────────────────────────────────────────────────
    public function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
           + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * asin(sqrt($a));
    }
}
