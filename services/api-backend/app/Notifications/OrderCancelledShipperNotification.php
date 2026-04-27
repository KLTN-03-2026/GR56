<?php

namespace App\Notifications;

use App\Models\DonHang;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification gửi cho Shipper khi đơn hàng bị hủy (auto hoặc admin).
 *
 * Nội dung thông báo có hai trường hợp:
 *  - Đơn đã đặt cọc COD → thông báo đã hoàn tiền vào ví.
 *  - Đơn chưa đặt cọc   → chỉ thông báo đơn bị hủy.
 */
class OrderCancelledShipperNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public DonHang $donHang;
    public string  $message;

    public function __construct(DonHang $donHang, string $message)
    {
        $this->donHang = $donHang;
        $this->message = $message;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'loai'        => 'order_cancelled',
            'title'       => '🚫 Đơn hàng bị hủy',
            'message'     => $this->message,
            'id_don_hang' => $this->donHang->id,
            'ma_don_hang' => $this->donHang->ma_don_hang,
            'tong_tien'   => $this->donHang->tong_tien,
            'da_dat_coc'  => (bool) $this->donHang->da_dat_coc,
            'created_at'  => now()->toDateTimeString(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
