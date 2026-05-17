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
        $channels = [
            new PrivateChannel('khach-hang.' . $this->donHang->id_khach_hang),
            new PrivateChannel('quan-an.' . $this->donHang->id_quan_an),
        ];

        if ($this->donHang->id_shipper) {
            $channels[] = new PrivateChannel('shipper.' . $this->donHang->id_shipper);
        }

        \Illuminate\Support\Facades\Log::info('[DEBUG] DonHangDaNhanEvent::broadcastOn(), channels count=' . count($channels) . ', id_khach_hang=' . $this->donHang->id_khach_hang . ', id_quan_an=' . $this->donHang->id_quan_an . ', id_shipper=' . $this->donHang->id_shipper);
        return $channels;
    }

    /**
     * Tên event broadcast
     */
    public function broadcastAs(): string
    {
        \Illuminate\Support\Facades\Log::info('[DEBUG] DonHangDaNhanEvent::broadcastAs() = don-hang.da-nhan');
        return 'don-hang.da-nhan';
    }

    public function broadcastWith(): array
    {
        try {
            $dh = $this->donHang->fresh();

            // Lấy thông tin shipper an toàn
            $tenShipper = null;
            if ($dh->id_shipper) {
                $shipper = \App\Models\Shipper::select('id', 'ho_va_ten')->find($dh->id_shipper);
                $tenShipper = $shipper?->ho_va_ten;
            }

            return [
                'don_hang' => [
                    'id'           => $dh->id,
                    'ma_don_hang'  => $dh->ma_don_hang,
                    'tinh_trang'   => $dh->tinh_trang,
                    'id_shipper'   => $dh->id_shipper,
                    'id_khach_hang'=> $dh->id_khach_hang,
                    'id_quan_an'   => $dh->id_quan_an,
                    'ho_va_ten_shipper' => $tenShipper ?? 'Shipper',
                    'phi_ship'     => $dh->phi_ship,
                    'tong_tien'    => $dh->tong_tien,
                    'tien_hang'    => $dh->tien_hang,
                    'is_thanh_toan'=> $dh->is_thanh_toan,
                    'updated_at'   => $dh->updated_at,
                ],
                'message' => 'Shipper đã nhận đơn hàng!',
            ];
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('[DonHangDaNhanEvent] broadcastWith lỗi: ' . $e->getMessage());
            return [
                'don_hang' => [
                    'id'          => $this->donHang->id,
                    'ma_don_hang' => $this->donHang->ma_don_hang,
                    'tinh_trang'  => 1,
                ],
                'message' => 'Shipper đã nhận đơn hàng!',
            ];
        }
    }
}
