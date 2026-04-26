<?php

namespace App\Events;

use App\Models\DonHang;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DonHangDaNhanEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $donHang;

    /**
     * Create a new event instance.
     * Event này được trigger khi shipper nhận đơn hàng
     */
    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    /**
     * Get the channels the event should broadcast on.
     * Broadcast đến: Khách hàng và Quán ăn
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $id_kh = $this->donHang->id_khach_hang;
        $id_qa = $this->donHang->id_quan_an;
        
        \Illuminate\Support\Facades\Log::info("BroadcastOn: khach-hang.{$id_kh}, quan-an.{$id_qa} (Đơn #{$this->donHang->ma_don_hang})");

        return [
            new PrivateChannel('khach-hang.' . $id_kh),
            new PrivateChannel('quan-an.' . $id_qa),
        ];
    }

    /**
     * Tên event broadcast
     */
    public function broadcastAs(): string
    {
        return 'don-hang.da-nhan';
    }

    public function broadcastWith(): array
    {
        // Tải các quan hệ cần thiết để có đủ dữ liệu render phía frontend
        // Không dùng JOIN phức tạp ở đây để tránh lỗi im lặng (nếu join hụt bản ghi)
        $dh = $this->donHang->refresh(); // Lấy dữ liệu mới nhất từ DB
        
        // Lấy thêm thông tin Shipper và Khách hàng
        $shipper = \App\Models\Shipper::find($dh->id_shipper);
        $khachHang = \App\Models\KhachHang::find($dh->id_khach_hang);
        
        // Tính toán chiết khấu voucher giống logic getDonHangQuanAn
        $chiet_khau = ($dh->tien_hang + $dh->phi_ship - $dh->tong_tien - $dh->tien_giam_tu_xu);

        return [
            'id' => $dh->id,
            'ma_don_hang' => $dh->ma_don_hang,
            'created_at' => $dh->created_at,
            'tien_hang' => $dh->tien_hang,
            'phi_ship' => $dh->phi_ship,
            'tong_tien' => $dh->tong_tien,
            'tien_giam_tu_xu' => $dh->tien_giam_tu_xu,
            'tien_quan_an' => $dh->tien_quan_an,
            'da_doi_soat' => $dh->da_doi_soat,
            'id_voucher' => $dh->id_voucher,
            'is_thanh_toan' => $dh->is_thanh_toan,
            'phuong_thuc_thanh_toan' => $dh->phuong_thuc_thanh_toan,
            'tinh_trang' => 1, // Luôn là 1 khi shipper nhận
            'ten_nguoi_nhan' => $dh->ten_nguoi_nhan,
            'ho_va_ten_shipper' => $shipper->ho_va_ten ?? 'Shipper',
            'ma_voucher' => $dh->voucher->ma_code ?? null,
            'chiet_khau_voucher' => $chiet_khau,
            'message' => 'Shipper đã nhận đơn hàng!'
        ];
    }
}
