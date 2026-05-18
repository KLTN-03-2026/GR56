<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class Shipper extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'shippers';
    protected $fillable = [
        'ho_va_ten',
        'so_dien_thoai',
        'email',
        'password',
        'hinh_anh',
        'cccd',
        'is_active',
        'is_open',
        'is_block',
        'tong_tien',
        'id_dia_chi',
        'zone_id',
        'lat',
        'lng',
    ];

    protected $appends = ['penalty_score', 'tong_chuyen', 'hang_shipper'];

    const IS_OPEN_CLOSE = 0;
    const IS_OPEN_OPEN = 1;

    const IS_ACTIVE_PENDING = 0;
    const IS_ACTIVE_ACTIVE = 1;

    public function reports()
    {
        return $this->morphMany(Report::class, 'reporter');
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    public function locations()
    {
        return $this->hasMany(ShipperLocation::class)->orderByDesc('recorded_at');
    }

    public function penalties()
    {
        return $this->hasMany(ShipperPenalty::class);
    }

    public function getPenaltyScoreAttribute(): int
    {
        return ShipperPenalty::activePenaltyScore($this);
    }

    public function getIsOpenAttribute($v): bool
    {
        return (bool) $v;
    }

    public function getIsActiveAttribute($v): bool
    {
        return (bool) $v;
    }

    public function scopeOnline($query)
    {
        return $query->where('is_active', true)->where('is_open', true);
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_active', true)
            ->where('is_open', true)
            ->whereDoesntHave('penalties', function ($q) {
                $q->where('da_giai_quyet', false)
                  ->where(function ($q2) {
                      $q2->whereNull('hieu_luc_den')
                         ->orWhere('hieu_luc_den', '>', now());
                  });
            })
            // Loại shipper đang có đơn DANG_GIAO — chỉ nhận shipper chưa có đơn active
            ->whereDoesntHave('donHangs', function ($q) {
                $q->whereIn('tinh_trang', [
                    DonHang::TINH_TRANG_DANG_GIAO,
                ]);
            });
    }

    public function donHangs()
    {
        return $this->hasMany(DonHang::class, 'id_shipper');
    }

    public function getTongChuyenAttribute()
    {
        // Sử dụng giá trị đã load từ withCount nếu có để tránh N+1 query
        if (array_key_exists('tong_chuyen', $this->attributes)) {
            return $this->attributes['tong_chuyen'];
        }
        return $this->donHangs()->where('tinh_trang', 4)->count();
    }

    public function getHangShipperAttribute()
    {
        $chuyen = $this->tong_chuyen;
        if ($chuyen < 50) return 'Đồng';
        if ($chuyen < 200) return 'Bạc';
        if ($chuyen < 500) return 'Vàng';
        return 'Kim Cương';
    }

    public function activeOrdersCount(): int
    {
        return DonHang::where('id_shipper', $this->id)
            ->whereIn('tinh_trang', [
                DonHang::TINH_TRANG_SHIP_DA_NHAN,
                DonHang::TINH_TRANG_QUAN_DANG_LAM,
                DonHang::TINH_TRANG_DANG_GIAO,
            ])
            ->count();
    }

    public function receivesBroadcastNotificationsOn(): string
    {
        return 'shipper.'.$this->id;
    }
}
