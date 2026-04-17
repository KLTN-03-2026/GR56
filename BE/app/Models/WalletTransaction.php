<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $table = 'wallet_transactions';
    protected $fillable = [
        'id_wallet',
        'id_don_hang',
        'loai_giao_dich',
        'so_tien',
        'so_du_truoc',
        'so_du_sau',
        'mo_ta',
    ];

    protected $casts = [
        'so_tien' => 'float',
        'so_du_truoc' => 'float',
        'so_du_sau' => 'float',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'id_wallet');
    }
}
