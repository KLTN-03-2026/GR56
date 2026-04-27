<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThongBaoHeThong extends Model
{
    protected $table = 'thong_bao_he_thong';

    protected $fillable = [
        'tieu_de',
        'noi_dung',
        'hinh_anh',
        'duong_dan',
        'loai',
        'so_nguoi_nhan',
        'created_by',
    ];
}
