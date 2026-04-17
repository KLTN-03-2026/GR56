<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonAnSize extends Model
{
    protected $table = 'mon_an_sizes';
    protected $fillable = ['id_mon_an', 'ten_size', 'gia_cong_them'];

    public function monAn()
    {
        return $this->belongsTo(MonAn::class, 'id_mon_an', 'id');
    }
}
