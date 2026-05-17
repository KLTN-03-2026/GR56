<?php

namespace App\Events;

use App\Models\DonHang;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DispatchCancelledEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $orderId;
    public ?int $shipperId; // shipper bị huỷ (không còn được nhận)
    public string $reason;   // 'declined' | 'timeout' | 'taken_by_other'

    public function __construct(int $orderId, ?int $shipperId = null, string $reason = 'declined')
    {
        $this->orderId   = $orderId;
        $this->shipperId = $shipperId;
        $this->reason    = $reason;
    }

    public function broadcastOn(): array
    {
        $channels = [];

        // Gửi đến tất cả shipper đang có đơn này trong danh sách
        if ($this->shipperId) {
            $channels[] = new PrivateChannel('shipper.' . $this->shipperId);
        }

        // Luôn gửi đến all-shippers (trong case nhiều shipper đã nhận thông báo)
        $channels[] = new PrivateChannel('all-shippers');

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'dispatch.cancelled';
    }

    public function broadcastWith(): array
    {
        $order = DonHang::find($this->orderId);

        return [
            'order_id'  => $this->orderId,
            'ma_don_hang' => $order?->ma_don_hang,
            'reason'   => $this->reason,
            'message'  => $this->reason === 'taken_by_other'
                ? 'Đơn đã có người nhận'
                : ($this->reason === 'declined'
                    ? 'Đơn không còn khả dụng'
                    : 'Đơn đã hết hạn'),
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
