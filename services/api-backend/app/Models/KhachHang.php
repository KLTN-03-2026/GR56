<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class KhachHang extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'khach_hangs';
    protected $fillable = [
        'ho_va_ten',
        'so_dien_thoai',
        'email',
        'password',
        'cccd',
        'ngay_sinh',
        'avatar',
        'diem_xu',
        'hash_reset',
        'hash_active',
        'is_active',
        'is_block',
    ];

    protected $appends = ['tong_chi_tieu', 'hang_thanh_vien'];

    public function getTongChiTieuAttribute()
    {
        if (array_key_exists('tong_chi_tieu', $this->attributes)) {
            return $this->attributes['tong_chi_tieu'];
        }
        return $this->donHangs()->where('tinh_trang', 4)->sum('tong_tien');
    }

    public function getHangThanhVienAttribute()
    {
        $tong = $this->tong_chi_tieu;
        if ($tong > 50000000) return 'Kim cương';
        if ($tong >= 10000000) return 'Vàng';
        if ($tong >= 5000000) return 'Bạc';
        if ($tong >= 1000000) return 'Đồng';
        return 'Thành viên';
    }

    public function donHangs()
    {
        return $this->hasMany(DonHang::class, 'id_khach_hang');
    }

    public function reports()
    {
        return $this->morphMany(Report::class, 'reporter');
    }

    public function chatbotSessions()
    {
        return $this->hasMany(ChatbotSession::class, 'id_khach_hang');
    }

    public function customerProfile()
    {
        return $this->hasOne(CustomerProfile::class, 'id_khach_hang');
    }

    public function chatbotAnalytics()
    {
        return $this->hasMany(ChatbotAnalytic::class, 'id_khach_hang');
    }

    /**
     * Get the channels that notification broadcasts should be sent on.
     */
    public function receivesBroadcastNotificationsOn(): string
    {
        return 'khach-hang.'.$this->id;
    }
}
