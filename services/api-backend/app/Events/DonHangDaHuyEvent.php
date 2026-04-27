<?php

namespace App\Events;

use App\Models\DonHang;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DonHangDaHuyEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $donHang;

    /**
     * Event này được trigger khi admin duyệt hủy đơn hàng từ report
     */
    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    /**
     * Broadcast đến: Khách hàng, Quán ăn, và Shipper (nếu có)
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('khach-hang.' . $this->donHang->id_khach_hang),
            new PrivateChannel('quan-an.' . $this->donHang->id_quan_an),
        ];

        if ($this->donHang->id_shipper) {
            $channels[] = new PrivateChannel('shipper.' . $this->donHang->id_shipper);
        }

        return $channels;
    }

    /**
     * Tên event broadcast
     */
    public function broadcastAs(): string
    {
        return 'don-hang.da-huy';
    }

    /**
     * Dữ liệu broadcast
     */
    public function broadcastWith(): array
    {
        return [
            'id'            => $this->donHang->id,
            'ma_don_hang'   => $this->donHang->ma_don_hang,
            'tinh_trang'    => $this->donHang->tinh_trang, // 5 = Đã hủy
            'id_khach_hang' => $this->donHang->id_khach_hang,
            'id_quan_an'    => $this->donHang->id_quan_an,
            'id_shipper'    => $this->donHang->id_shipper,
            'tong_tien'     => $this->donHang->tong_tien,
            'ly_do'         => $this->donHang->ly_do ?? 'auto_cancel', // 'auto_cancel' | 'admin' | 'khach'
            'updated_at'    => $this->donHang->updated_at,
            'message'       => $this->donHang->ly_do ?? 'auto_cancel',
        ];
    }
}
