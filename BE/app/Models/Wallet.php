<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $table = 'wallets';
    protected $fillable = [
        'loai_vi',
        'id_chu_vi',
        'so_du',
        'tong_tien_nhan',
        'tong_tien_rut',
    ];

    protected $casts = [
        'so_du' => 'float',
        'tong_tien_nhan' => 'float',
        'tong_tien_rut' => 'float',
    ];

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'id_wallet');
    }

    public function withdrawRequests()
    {
        return $this->hasMany(WithdrawRequest::class, 'id_wallet');
    }

    public function bankAccounts()
    {
        return $this->hasMany(BankAccountWallet::class, 'id_chu')
            ->where('loai_chu', $this->loai_vi);
    }
}
