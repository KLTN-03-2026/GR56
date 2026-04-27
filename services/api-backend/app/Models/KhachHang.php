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

    public function donHangs()
    {
        return $this->hasMany(DonHang::class, 'id_khach_hang');
    }

    public function reports()
    {
        return $this->morphMany(Report::class, 'reporter');
    }

    /**
     * Get the channels that notification broadcasts should be sent on.
     */
    public function receivesBroadcastNotificationsOn(): string
    {
        return 'khach-hang.'.$this->id;
    }
}
