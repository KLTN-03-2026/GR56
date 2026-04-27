<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonAn extends Model
{
    protected $table = 'mon_ans';
    protected $fillable = [
        'ten_mon_an',
        'slug_mon_an',
        'gia_ban',
        'gia_khuyen_mai',
        'mo_ta',
        'id_quan_an',
        'tinh_trang',
        'hinh_anh',
        'is_combo',
        'list_combo',
        'id_danh_muc',
    ];

    public function sizes()
    {
        return $this->hasMany(MonAnSize::class, 'id_mon_an', 'id');
    }
}
