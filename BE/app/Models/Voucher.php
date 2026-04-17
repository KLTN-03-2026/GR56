<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $table = 'vouchers';
    protected $fillable = [
        'ma_code',
        'thoi_gian_bat_dau',
        'thoi_gian_ket_thuc',
        'loai_giam',
        'id_quan_an',
        'so_giam_gia',
        'so_tien_toi_da',
        'don_hang_toi_thieu',
        'tinh_trang',
        'hinh_anh',
        'ten_voucher',
        'mo_ta',
        // Smart fields
        'so_luot_toi_da',
        'so_luot_da_dung',
        'so_luot_moi_nguoi',
        'loai_voucher',
        'id_khach_hang_rieng',
    ];

    const GIAM_PHAN_TRAM = 1;
    const GIAM_TIEN_MAT  = 0;

    // Loại voucher
    const LOAI_PUBLIC   = 'public';    // Ai cũng dùng được
    const LOAI_PRIVATE  = 'private';   // Chỉ 1 khách hàng cụ thể
    const LOAI_SYSTEM   = 'system';    // Hệ thống tự sinh (quay lại, sinh nhật...)
    const LOAI_REFERRAL = 'referral';  // Giới thiệu bạn

    public function usages()
    {
        return $this->hasMany(VoucherUsage::class, 'id_voucher');
    }

    public function khachHangRieng()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang_rieng');
    }

    /**
     * Kiểm tra voucher còn hợp lệ không (tổng thể)
     */
    public function conHieuLuc(): bool
    {
        if (!$this->tinh_trang) return false;
        $now = now()->toDateString();
        if ($this->thoi_gian_bat_dau > $now) return false;
        if ($this->thoi_gian_ket_thuc < $now) return false;
        // Kiểm tra số lượt tổng thể
        if ($this->so_luot_toi_da !== null && $this->so_luot_da_dung >= $this->so_luot_toi_da) return false;
        return true;
    }

    /**
     * Kiểm tra khách hàng này còn dùng được không
     */
    public function khachConDungDuoc(int $id_khach_hang): bool
    {
        // Nếu so_luot_moi_nguoi là null → không giới hạn lượt dùng mỗi người
        if ($this->so_luot_moi_nguoi === null) return true;

        $da_dung = VoucherUsage::where('id_voucher', $this->id)
            ->where('id_khach_hang', $id_khach_hang)
            ->count();
        return $da_dung < $this->so_luot_moi_nguoi;
    }
}
