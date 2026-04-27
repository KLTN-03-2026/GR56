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

class DonHangMoiEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $donHang;

    /**
     * Create a new event instance.
     * Event này được trigger khi khách hàng đặt đơn mới
     */
    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    /**
     * Get the channels the event should broadcast on.
     * Broadcast đến: Quán ăn và tất cả Shipper
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('all-shippers'),
            new PrivateChannel('quan-an.' . $this->donHang->id_quan_an),
        ];
    }

    /**
     * Tên event broadcast
     */
    public function broadcastAs(): string
    {
        return 'don-hang.moi';
    }

    /**
     * Dữ liệu broadcast
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->donHang->id,
            'ma_don_hang' => $this->donHang->ma_don_hang,
            'id_khach_hang' => $this->donHang->id_khach_hang,
            'id_quan_an' => $this->donHang->id_quan_an,
            'tien_hang' => $this->donHang->tien_hang,
            'phi_ship' => $this->donHang->phi_ship,
            'tong_tien' => $this->donHang->tong_tien,
            'tinh_trang' => $this->donHang->tinh_trang,
            'created_at' => $this->donHang->created_at,
            'message' => 'Có đơn hàng mới!',
        ];
    }
}
