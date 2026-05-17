<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zone extends Model
{
    protected $fillable = [
        'ten_zone', 'slug', 'tinh_thanh', 'quan_huyen',
        'lat_center', 'lng_center', 'ban_kinh_km', 'is_active',
    ];

    protected $casts = [
        'lat_center'  => 'float',
        'lng_center'  => 'float',
        'ban_kinh_km' => 'float',
        'is_active'   => 'boolean',
    ];

    public function shippers(): HasMany
    {
        return $this->hasMany(Shipper::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
