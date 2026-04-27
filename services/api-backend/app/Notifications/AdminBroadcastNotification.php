<?php

namespace App\Notifications;

use App\Models\ThongBaoHeThong;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class AdminBroadcastNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public ThongBaoHeThong $thongBao;

    private static array $loaiLabels = [
        'sale' => '🎉 Khuyến mãi',
        'event' => '📢 Sự kiện',
        'news' => '💡 Tin tức',
    ];

    private static array $loaiIcons = [
        'sale' => '🎉',
        'event' => '📢',
        'news' => '💡',
    ];

    public function __construct(ThongBaoHeThong $thongBao)
    {
        $this->thongBao = $thongBao;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $icon = self::$loaiIcons[$this->thongBao->loai] ?? '🔔';
        $label = self::$loaiLabels[$this->thongBao->loai] ?? 'Thông báo';

        return [
            'type' => 'broadcast',
            'thong_bao_id' => $this->thongBao->id,
            'title' => $icon . ' ' . $this->thongBao->tieu_de,
            'message' => $this->thongBao->noi_dung,
            'loai' => $this->thongBao->loai,
            'loai_label' => $label,
            'hinh_anh' => $this->thongBao->hinh_anh,
            'link' => $this->thongBao->duong_dan,
            'created_at' => now()->toDateTimeString(),
        ];
    }
}
