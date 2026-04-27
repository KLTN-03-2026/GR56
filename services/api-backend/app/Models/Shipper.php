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
        'tong_tien',
        'id_dia_chi'
    ];

    const IS_OPEN_CLOSE = 0;
    const IS_OPEN_OPEN = 1;

    const IS_ACTIVE_PENDING = 0;
    const IS_ACTIVE_ACTIVE = 1;

    public function reports()
    {
        return $this->morphMany(Report::class, 'reporter');
    }

    /**
     * Get the channels that notification broadcasts should be sent on.
     */
    public function receivesBroadcastNotificationsOn(): string
    {
        return 'shipper.'.$this->id;
    }
}
