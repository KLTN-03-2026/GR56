<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherUsage extends Model
{
    protected $table = 'voucher_usages';
    protected $fillable = [
        'id_voucher',
        'id_khach_hang',
        'id_don_hang',
        'so_tien_da_giam',
    ];

    public function voucher()
    {
        return $this->belongsTo(Voucher::class, 'id_voucher');
    }

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }
}
