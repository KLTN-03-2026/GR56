<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NapTienRequest extends Model
{
    use HasFactory;

    protected $table = 'nap_tien_requests';

    protected $fillable = [
        'id_shipper',
        'so_tien',
        'trang_thai',
        'payos_payment_id',
        'ghi_chu',
    ];

    public function shipper()
    {
        return $this->belongsTo(Shipper::class, 'id_shipper');
    }
}
