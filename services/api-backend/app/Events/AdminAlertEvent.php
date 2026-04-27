<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event broadcast đến Admin để thông báo các sự kiện quan trọng cần xử lý ngay.
 * Sử dụng public channel "admin-alerts" — tất cả admin đều nhận được.
 */
class AdminAlertEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $loai;    // 'yeu_cau_huy' | 'refund_failed' | 'bao_cao_moi'
    public array  $data;

    public function __construct(string $loai, array $data)
    {
        $this->loai = $loai;
        $this->data = $data;
    }

    public function broadcastOn(): array
    {
        // Public channel — không cần auth, tất cả admin socket đều nhận
        return [new Channel('admin-alerts')];
    }

    public function broadcastAs(): string
    {
        return 'admin.alert';
    }

    public function broadcastWith(): array
    {
        return [
            'loai'     => $this->loai,
            'data'     => $this->data,
            'time'     => now()->toIso8601String(),
        ];
    }
}
