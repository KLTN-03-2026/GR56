<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YeuThich extends Model
{
    use HasFactory;

    protected $table = 'yeu_thiches';

    protected $fillable = [
        'id_khach_hang',
        'id_mon_an',
    ];

    public $timestamps = true;
    const UPDATED_AT = null; // Chỉ có created_at

    public function monAn()
    {
        return $this->belongsTo(MonAn::class, 'id_mon_an');
    }

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }
}
