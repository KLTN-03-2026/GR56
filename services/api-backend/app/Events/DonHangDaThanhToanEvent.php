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

class DonHangDaThanhToanEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $donHang;

    /**
     * Create a new event instance.
     * Event này được trigger khi khách hàng thanh toán online thành công
     */
    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    /**
     * Get the channels the event should broadcast on.
     * Broadcast đến tất cả Shipper
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('all-shippers'),
        ];
    }

    /**
     * Tên event broadcast
     */
    public function broadcastAs(): string
    {
        return 'don-hang.da-thanh-toan';
    }

    /**
     * Dữ liệu broadcast
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->donHang->id,
            'ma_don_hang' => $this->donHang->ma_don_hang,
            'tong_tien' => $this->donHang->tong_tien,
            'message' => "Đơn hàng {$this->donHang->ma_don_hang} đã được khách thanh toán online thành công!",
        ];
    }
}
