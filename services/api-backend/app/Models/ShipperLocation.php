<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShipperLocation extends Model
{
    protected $table = 'shipper_locations';

    protected $fillable = [
        'shipper_id', 'lat', 'lng', 'accuracy', 'address', 'recorded_at',
    ];

    protected $casts = [
        'lat'        => 'float',
        'lng'        => 'float',
        'accuracy'   => 'float',
        'recorded_at' => 'datetime',
    ];

    public function shipper(): BelongsTo
    {
        return $this->belongsTo(Shipper::class);
    }

    public static function latestFor(Shipper $shipper): ?self
    {
        return static::where('shipper_id', $shipper->id)
            ->latest('recorded_at')
            ->first();
    }
}
