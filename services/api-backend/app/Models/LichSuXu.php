<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LichSuXu extends Model
{
    protected $table = 'lich_su_xus';

    protected $fillable = [
        'id_khach_hang',
        'id_don_hang',
        'so_xu',
        'loai_giao_dich',
        'mo_ta',
    ];

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }

    public function donHang()
    {
        return $this->belongsTo(DonHang::class, 'id_don_hang');
    }
}
