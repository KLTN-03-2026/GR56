<?php

namespace App\Notifications;

use App\Models\DonHang;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification gửi cho Khách hàng khi đơn hàng bị hủy (auto hoặc admin).
 */
class OrderCancelledKhachHangNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public DonHang $donHang;
    public string  $message;
    public string  $lyDo;

    public function __construct(DonHang $donHang, string $message, string $lyDo = 'auto_cancel')
    {
        $this->donHang = $donHang;
        $this->message = $message;
        $this->lyDo    = $lyDo;
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
            'ly_do'       => $this->lyDo,
            'created_at'  => now()->toDateTimeString(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
