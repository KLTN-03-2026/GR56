<?php

namespace App\Notifications;

use App\Models\BankAccountWallet;
use App\Models\DonHang;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class RefundSuccessNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public DonHang           $order;
    public int               $amount;
    public BankAccountWallet $bank;

    public function __construct(DonHang $order, int $amount, BankAccountWallet $bank)
    {
        $this->order  = $order;
        $this->amount = $amount;
        $this->bank   = $bank;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'        => 'refund_success',
            'title'       => '✅ Hoàn tiền thành công',
            'message'     => "Đã hoàn " . number_format($this->amount, 0, ',', '.') . "đ vào tài khoản {$this->bank->ten_ngan_hang} - {$this->bank->so_tai_khoan} cho đơn hàng #{$this->order->ma_don_hang}.",
            'id_don_hang' => $this->order->id,
            'ma_don_hang' => $this->order->ma_don_hang,
            'so_tien'     => $this->amount,
            'ngan_hang'   => $this->bank->ten_ngan_hang,
            'so_tai_khoan'=> $this->bank->so_tai_khoan,
            'url'         => '/khach-hang/don-hang',
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
