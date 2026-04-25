<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'reporter_id',
        'reporter_type',
        'id_don_hang',
        'tieu_de',
        'noi_dung',
        'trang_thai',
        'hinh_anh',
        'ghi_chu_admin',
        'yeu_cau_huy',
        'ly_do_huy',
        'da_duyet_huy',
    ];

    protected $casts = [
        'yeu_cau_huy'  => 'boolean',
        'da_duyet_huy' => 'boolean',
    ];

    public function reporter()
    {
        return $this->morphTo();
    }

    public function donHang()
    {
        return $this->belongsTo(DonHang::class, 'id_don_hang');
    }
}
