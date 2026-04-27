<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WithdrawRequest extends Model
{
    protected $table = 'withdraw_requests';
    protected $fillable = [
        'id_wallet',
        'id_bank_account',
        'so_tien_rut',
        'noi_dung_chuyen_khoan',
        'trang_thai',
        'ghi_chu_admin',
        'thoi_gian_chuyen',
        // PayOS Payout fields
        'payos_payout_id',
        'payos_reference',
        'payos_state',
    ];

    protected $casts = [
        'so_tien_rut'     => 'float',
        'thoi_gian_chuyen' => 'datetime',
    ];

    /**
     * Trạng thái:
     *   cho_duyet   → Chờ Admin duyệt
     *   da_duyet    → Đã duyệt (chuyển thủ công)
     *   dang_chuyen → PayOS đang xử lý chuyển tiền
     *   da_chuyen   → Đã chuyển xong
     *   tu_choi     → Bị từ chối
     */
    const TRANG_THAI_CHO_DUYET   = 'cho_duyet';
    const TRANG_THAI_DA_DUYET    = 'da_duyet';
    const TRANG_THAI_DANG_CHUYEN = 'dang_chuyen';
    const TRANG_THAI_DA_CHUYEN   = 'da_chuyen';
    const TRANG_THAI_TU_CHOI     = 'tu_choi';

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'id_wallet');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccountWallet::class, 'id_bank_account');
    }

    /**
     * Kiểm tra xem yêu cầu này có được PayOS xử lý không
     */
    public function daCoPayOS(): bool
    {
        return !empty($this->payos_payout_id);
    }
}
