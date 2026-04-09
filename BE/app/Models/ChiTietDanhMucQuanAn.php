<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChiTietDanhMucQuanAn extends Model
{
    protected $table = 'chi_tiet_danh_muc_quan_ans';
    protected $fillable = [
        'id_danh_muc',
        'id_quan_an',
    ];
}
