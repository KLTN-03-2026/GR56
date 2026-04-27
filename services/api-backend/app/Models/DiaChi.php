<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiaChi extends Model
{
    protected $table = 'dia_chis';
    protected $fillable = [
        'id_khach_hang',
        'id_quan_huyen',
        'id_shipper',
        'dia_chi',
        'toa_do_x',
        'toa_do_y',
        'ten_nguoi_nhan',
        'so_dien_thoai',
    ];
}
