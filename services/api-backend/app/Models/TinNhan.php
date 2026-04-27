<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TinNhan extends Model
{
    protected $table = 'tin_nhans';

    protected $fillable = [
        'id_don_hang',
        'id_nguoi_gui',
        'loai_nguoi_gui',
        'noi_dung',
        'da_doc',
    ];

    protected $casts = [
        'da_doc' => 'boolean',
    ];

    public function donHang()
    {
        return $this->belongsTo(DonHang::class, 'id_don_hang');
    }
}
