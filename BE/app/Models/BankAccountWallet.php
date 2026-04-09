<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankAccountWallet extends Model
{
    protected $table = 'bank_accounts_wallet';
    protected $fillable = [
        'loai_chu',
        'id_chu',
        'ten_ngan_hang',
        'so_tai_khoan',
        'chu_tai_khoan',
        'chi_nhanh',
        'is_default',
    ];
}
