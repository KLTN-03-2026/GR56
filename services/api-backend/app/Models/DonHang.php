<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonHang extends Model
{
    protected $table = 'don_hangs';
    protected $fillable = [
        'ma_don_hang',
        'id_khach_hang',
        'id_voucher',
        'id_shipper',
        'id_quan_an',
        'id_dia_chi_nhan',
        'ten_nguoi_nhan',
        'so_dien_thoai',
        'tien_hang',
        'phi_ship',
        'tong_tien',
        'is_thanh_toan',
        'so_tien_nhan',
        'payos_payment_link_id', // PayOS
        'tinh_trang',
        'phuong_thuc_thanh_toan',
        'da_dat_coc',
        'xu_su_dung',
        'tien_giam_tu_xu',
        'xu_tich_luy',
        'anh_giao_hang',
        'refund_status',
        'refund_at',
        'refund_payout_id',
        'refund_note',
        'ly_do',         // Lý do hủy: 'auto_cancel' | 'admin' | 'khach' | null

        // Đối soát tài chính (settlement)
        'chiet_khau_phan_tram',  // % chiết khấu nền tảng
        'tien_chiet_khau',       // Tiền chiết khấu nền tảng
        'tien_quan_an',          // Tiền quán ăn được nhận
        'tien_shipper',          // Tiền shipper được nhận
        'da_doi_soat',           // Đã đối soát chưa?
        'thoi_gian_doi_soat',    // Thời điểm đối soát
    ];

    const TINH_TRANG_CHUA_NHAN      = 0;
    const TINH_TRANG_SHIP_DA_NHAN   = 1;
    const TINH_TRANG_QUAN_DANG_LAM  = 2;
    const TINH_TRANG_DANG_GIAO      = 3;
    const TINH_TRANG_DA_HOAN_THANH  = 4;
    const TINH_TRANG_DA_HUY         = 5;

    const thanh_toan_tien_mat       = 1;
    const thanh_toan_chuyen_khoan     = 2;
    const thanh_toan_payos            = 3; // Thanh toán qua PayOS

    const DA_THANH_TOAN             = 1;
    const CHUA_THANH_TOAN           = 0;

    public function chiTiet()
    {
        return $this->hasMany(ChiTietDonHang::class, 'id_don_hang');
    }

    public function quanAn()
    {
        return $this->belongsTo(QuanAn::class, 'id_quan_an');
    }

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }
}
