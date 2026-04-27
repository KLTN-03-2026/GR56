<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShipperLocationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $orderId;
    public $shipperId;
    public $lat;
    public $lng;
    public $timestamp;

    /**
     * Create a new event instance.
     */
    public function __construct($orderId, $shipperId, $lat, $lng)
    {
        $this->orderId = $orderId;
        $this->shipperId = $shipperId;
        $this->lat = $lat;
        $this->lng = $lng;
        $this->timestamp = now()->toIso8601String();
    }

    /**
     * Channel riêng cho mỗi đơn hàng để khách hàng theo dõi
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('order.' . $this->orderId),
        ];
    }

    /**
     * Tên event khi broadcast
     */
    public function broadcastAs(): string
    {
        return 'shipper.location.updated';
    }
}
