<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GiaoDich extends Model
{
    protected $table = 'giao_diches';
    protected $fillable = [
        'refNo',
        'creditAmount',
        'description',
        'transactionDate',
        'code',
        'loai',
        'id_lien_quan',
    ];
}
