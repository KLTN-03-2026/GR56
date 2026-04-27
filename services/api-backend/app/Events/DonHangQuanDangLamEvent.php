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

class DonHangQuanDangLamEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $donHang;

    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('khach-hang.' . $this->donHang->id_khach_hang),
            new PrivateChannel('shipper.' . $this->donHang->id_shipper),
        ];
    }

    public function broadcastAs(): string
    {
        return 'don-hang.dang-lam';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->donHang->id,
            'ma_don_hang' => $this->donHang->ma_don_hang,
            'tinh_trang' => $this->donHang->tinh_trang,
            'updated_at' => $this->donHang->updated_at,
            'message' => 'Quán ăn đang chế biến món ăn!',
        ];
    }
}
