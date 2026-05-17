<?php

namespace App\Events;

use App\Models\DonHang;
use App\Models\Shipper;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sự kiện gửi đơn cho MỘT shipper cụ thể (sequential cascade).
 * Chỉ broadcast đến kênh riêng: private-shipper.{id}
 * KHÔNG broadcast lên all-shippers (shipper khác không được biết).
 */
class DispatchCandidateEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public DonHang $order;
    public Shipper $shipper;
    public string  $mode;
    public int     $expiresIn;

    public function __construct(DonHang $order, Shipper $shipper, string $mode = 'sequential', int $expiresIn = 60)
    {
        // Lưu order đầy đủ với relations để broadcastWith() có thể dùng
        $this->order     = $order->loadMissing(['quanAn', 'diaChiNhan']);
        $this->shipper   = $shipper;
        $this->mode      = $mode;
        $this->expiresIn = $expiresIn;
    }

    public function broadcastOn(): array
    {
        // Chỉ gửi đến kênh riêng của shipper được chọn
        // Shipper khác sẽ KHÔNG nhận được event này
        return [
            new PrivateChannel('shipper.' . $this->shipper->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'dispatch.candidate';
    }

    public function broadcastWith(): array
    {
        try {
            $restaurant      = $this->order->quanAn ?? \App\Models\QuanAn::find($this->order->id_quan_an);
            $customerAddress = $this->order->diaChiNhan ?? \App\Models\DiaChi::find($this->order->id_dia_chi_nhan);

            $payload = [
                'order_id'    => $this->order->id,
                'ma_don_hang' => $this->order->ma_don_hang,
                'tong_tien'   => $this->order->tong_tien,
                'phi_ship'    => $this->order->phi_ship,
                'phuong_thuc_thanh_toan' => $this->order->phuong_thuc_thanh_toan,
                'is_thanh_toan' => $this->order->is_thanh_toan,
                'restaurant'  => $restaurant ? [
                    'id'       => $restaurant->id,
                    'ten'      => $restaurant->ten_quan_an,
                    'lat'      => $restaurant->toa_do_y ?? $restaurant->vi_do,
                    'lng'      => $restaurant->toa_do_x ?? $restaurant->vi_tri,
                    'dia_chi'  => $restaurant->dia_chi,
                    'hinh_anh' => $restaurant->hinh_anh,
                ] : null,
                'customer_address' => $customerAddress ? [
                    'lat'            => $customerAddress->toa_do_y ?? $customerAddress->vi_do,
                    'lng'            => $customerAddress->toa_do_x ?? $customerAddress->vi_tri,
                    'dia_chi'        => $customerAddress->dia_chi,
                    'ten_nguoi_nhan' => $this->order->ten_nguoi_nhan,
                    'so_dien_thoai'  => $this->order->so_dien_thoai,
                ] : null,
                'mode'       => $this->mode,
                'expires_in' => $this->expiresIn,
                'created_at' => now()->toIso8601String(),
            ];

            Log::info("[DispatchCandidateEvent] Broadcasting to private-shipper.{$this->shipper->id} for order #{$this->order->ma_don_hang}");

            return $payload;
        } catch (\Throwable $e) {
            Log::error("[DispatchCandidateEvent] broadcastWith error: " . $e->getMessage());
            // Trả về payload tối thiểu để event vẫn được gửi
            return [
                'order_id'    => $this->order->id,
                'ma_don_hang' => $this->order->ma_don_hang,
                'tong_tien'   => $this->order->tong_tien,
                'phi_ship'    => $this->order->phi_ship,
                'mode'        => $this->mode,
                'expires_in'  => $this->expiresIn,
                'created_at'  => now()->toIso8601String(),
            ];
        }
    }
}
