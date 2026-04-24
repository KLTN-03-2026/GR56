<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuanHuyen extends Model
{
    protected $table = 'quan_huyens';
    protected $fillable = [
        'ten_quan_huyen',
        'toa_do_x',
        'toa_do_y',
        'tinh_trang',
        'id_tinh_thanh',
    ];

    public function tinhThanh()
    {
        return $this->belongsTo(TinhThanh::class, 'id_tinh_thanh');
    }
}
