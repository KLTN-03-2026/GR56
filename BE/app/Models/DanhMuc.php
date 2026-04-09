<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DanhMuc extends Model
{

    protected $table = 'danh_mucs';
    protected $fillable = [
        'ten_danh_muc',
        'slug_danh_muc',
        'tinh_trang',
        'id_danh_muc_cha',
        'hinh_anh',
    ];
}
