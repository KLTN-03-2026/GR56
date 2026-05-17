<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipperPenalty extends Model
{
    protected $fillable = [
        'shipper_id', 'loai_penalty', 'mo_ta',
        'don_hang_id', 'diem_tru', 'hieu_luc_den', 'da_giai_quyet',
    ];

    protected $casts = [
        'diem_tru'     => 'integer',
        'da_giai_quyet' => 'boolean',
        'hieu_luc_den'  => 'datetime',
    ];

    const LOAI_REJECT    = 'reject';    // Từ chối đơn
    const LOAI_TIMEOUT   = 'timeout';   // Timeout không phản hồi
    const LOAI_LATE      = 'late';      // Giao trễ > 15 phút
    const LOAI_CANCEL    = 'cancel';    // Hủy giữa chừng
    const LOAI_GPS_FRAUD = 'gps_fraud'; // Gian lận GPS

    const BANG_DIEM = [
        self::LOAI_REJECT    => 5,
        self::LOAI_TIMEOUT   => 3,
        self::LOAI_LATE      => 8,
        self::LOAI_CANCEL    => 15,
        self::LOAI_GPS_FRAUD => 20,
    ];

    public function shipper(): BelongsTo
    {
        return $this->belongsTo(Shipper::class);
    }

    public function donHang(): BelongsTo
    {
        return $this->belongsTo(DonHang::class, 'don_hang_id');
    }

    public static function activePenaltyScore(Shipper $shipper): int
    {
        return static::where('shipper_id', $shipper->id)
            ->where('da_giai_quyet', false)
            ->where(function ($q) {
                $q->whereNull('hieu_luc_den')
                  ->orWhere('hieu_luc_den', '>', now());
            })
            ->sum('diem_tru');
    }
}
