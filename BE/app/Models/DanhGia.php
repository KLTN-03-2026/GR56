<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DanhGia extends Model
{
    use HasFactory;

    protected $table = 'danh_gias';

    protected $fillable = [
        'id_don_hang',
        'id_khach_hang',
        'id_quan_an',
        'id_shipper',
        'sao_quan_an',
        'nhan_xet_quan_an',
        'sao_shipper',
        'nhan_xet_shipper',
        'is_hidden',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
    ];

    protected $attributes = [
        'is_hidden' => false,
    ];
}
