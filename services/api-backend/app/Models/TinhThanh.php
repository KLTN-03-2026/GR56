<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TinhThanh extends Model
{
    protected $table = 'tinh_thanhs';
    protected $fillable = [
        'ten_tinh_thanh',
        'toa_do_x',
        'toa_do_y',
        'tinh_trang',
    ];
}
