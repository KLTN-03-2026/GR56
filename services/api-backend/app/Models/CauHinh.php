<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CauHinh extends Model
{
    protected $table = 'cau_hinhs';

    protected $fillable = [
        'ma_cau_hinh',
        'gia_tri',
        'mo_ta',
    ];

    /**
     * Helper to get a config value by key, with optional default
     */
    public static function getVal($key, $default = null)
    {
        $config = self::where('ma_cau_hinh', $key)->first();
        return $config ? $config->gia_tri : $default;
    }
}
