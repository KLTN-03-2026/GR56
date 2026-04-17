<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
class NhanVien extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'nhan_viens';
    protected $fillable = [
        'email',
        'ho_va_ten',
        'password',
        'so_dien_thoai',
        'dia_chi',
        'ngay_sinh',
        'avatar',
        'tinh_trang',
        'id_chuc_vu',
        'is_master',
    ];
}
