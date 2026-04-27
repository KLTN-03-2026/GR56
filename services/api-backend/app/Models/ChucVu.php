<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChucVu extends Model
{
    protected $table = 'chuc_vus';
    protected $fillable = [
        'ten_chuc_vu',
        'slug_chuc_vu',
        'tinh_trang',
    ];
}

