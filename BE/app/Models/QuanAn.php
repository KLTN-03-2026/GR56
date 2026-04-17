<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class QuanAn extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'quan_ans';
    protected $fillable = [
        'email',
        'password',
        'ma_so_thue',
        'ten_quan_an',
        'hinh_anh',
        'id_quan_huyen',
        'dia_chi',
        'so_dien_thoai',
        'gio_mo_cua',
        'gio_dong_cua',
        'tong_tien',
        'is_active',
        'tinh_trang',
        'toa_do_x',
        'toa_do_y',
    ];

    /**
     * Một quán ăn có nhiều topping.
     */
    public function toppings()
    {
        return $this->hasMany(Topping::class, 'id_quan_an')
                    ->where('tinh_trang', 1)
                    ->orderBy('loai')
                    ->orderBy('ten_topping');
    }

    /**
     * Lấy tất cả món ăn của quán.
     */
    public function monAns()
    {
        return $this->hasMany(MonAn::class, 'id_quan_an');
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
        return 'quan-an.'.$this->id;
    }
}

