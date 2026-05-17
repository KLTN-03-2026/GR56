<?php

namespace App\Events;

use App\Models\DonHang;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DonHangMoiShipperEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public DonHang $donHang;

    public function __construct(DonHang $donHang)
    {
        $this->donHang = $donHang;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('all-shippers'),
        ];
    }

    public function broadcastAs(): string
    {
        \Illuminate\Support\Facades\Log::info('[DEBUG] DonHangMoiShipperEvent::broadcastAs() = dispatch.candidate');
        return 'dispatch.candidate';
    }

    public function broadcastWith(): array
    {
        \Illuminate\Support\Facades\Log::info('[DEBUG] DonHangMoiShipperEvent::broadcastWith() bắt đầu, id=' . $this->donHang->id);
        $restaurant = $this->donHang->quanAn;
        $customerAddress = $this->donHang->diaChiNhan;

        // Wrapper 'order' giống DispatchCandidateEvent để FE đồng nhất
        return [
            'order' => [
                'id'                  => $this->donHang->id,
                'ma_don_hang'        => $this->donHang->ma_don_hang,
                'tong_tien'          => $this->donHang->tong_tien,
                'phi_ship'           => $this->donHang->phi_ship,
                'restaurant'         => $restaurant ? [
                    'id'       => $restaurant->id,
                    'ten'      => $restaurant->ten_quan_an,
                    'lat'      => $restaurant->vi_do,
                    'lng'      => $restaurant->vi_tri,
                    'dia_chi'  => $restaurant->dia_chi,
                ] : null,
                'customer_address'   => $customerAddress ? [
                    'lat'       => $customerAddress->vi_do,
                    'lng'       => $customerAddress->vi_tri,
                    'dia_chi'   => $customerAddress->dia_chi,
                    'ten_nguoi_nhan'  => $this->donHang->ten_nguoi_nhan,
                    'so_dien_thoai'    => $this->donHang->so_dien_thoai,
                ] : null,
                'created_at'         => $this->donHang->created_at->toIso8601String(),
            ],
            'order_id'  => $this->donHang->id,
            'ma_don_hang' => $this->donHang->ma_don_hang,
            'tong_tien'  => $this->donHang->tong_tien,
            'phi_ship'   => $this->donHang->phi_ship,
            'mode'       => 'broadcast',
            'expires_in' => 300,
            'created_at' => $this->donHang->created_at->toIso8601String(),
        ];
    }
}
