<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Topping extends Model
{
    protected $table = 'toppings';

    protected $fillable = [
        'id_quan_an',
        'ten_topping',
        'gia',
        'hinh_anh',
        'mo_ta',
        'loai',
        'tinh_trang',
    ];

    protected $casts = [
        'id_quan_an' => 'integer',
        'gia'        => 'integer',
        'tinh_trang' => 'integer',
    ];

    // Hằng số phân loại
    const LOAI_DRINK = 'drink'; // Dành cho quán đồ uống
    const LOAI_FOOD  = 'food';  // Dành cho quán đồ ăn
    const LOAI_ALL   = 'all';   // Áp dụng cho tất cả

    // Hằng số trạng thái
    const TINH_TRANG_HIEN = 1;
    const TINH_TRANG_AN   = 0;

    /**
     * Quan hệ: một Topping thuộc một QuanAn.
     */
    public function quanAn()
    {
        return $this->belongsTo(QuanAn::class, 'id_quan_an');
    }

    /**
     * Scope lấy topping đang hiển thị.
     */
    public function scopeActive($query)
    {
        return $query->where('tinh_trang', self::TINH_TRANG_HIEN);
    }

    /**
     * Scope lọc theo loại topping.
     */
    public function scopeOfLoai($query, string $loai)
    {
        return $query->where('loai', $loai);
    }

    /**
     * Scope lọc theo quán.
     */
    public function scopeOfQuanAn($query, int $idQuanAn)
    {
        return $query->where('id_quan_an', $idQuanAn);
    }
}
