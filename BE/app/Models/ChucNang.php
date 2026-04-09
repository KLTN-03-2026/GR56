<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChucNang extends Model
{
    protected $table = 'chuc_nangs';
    protected $fillable = [
        'ten_chuc_nang',
    ];
}
