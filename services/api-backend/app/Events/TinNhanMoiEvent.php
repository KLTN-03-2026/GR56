<?php

namespace App\Events;

use App\Models\TinNhan;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TinNhanMoiEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public TinNhan $tin_nhan;

    public function __construct(TinNhan $tin_nhan)
    {
        $this->tin_nhan = $tin_nhan;
    }

    public function broadcastOn(): array
    {
        $don_hang = \App\Models\DonHang::find($this->tin_nhan->id_don_hang);
        $channels = [new PrivateChannel('chat.' . $this->tin_nhan->id_don_hang)];

        if ($don_hang) {
            // Gửi thông báo đến trang cá nhân của người NHẬN
            if ($this->tin_nhan->loai_nguoi_gui === 'khach_hang') {
                $channels[] = new PrivateChannel('shipper.' . $don_hang->id_shipper);
            } else {
                $channels[] = new PrivateChannel('khach-hang.' . $don_hang->id_khach_hang);
            }
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'tin-nhan.moi';
    }

    public function broadcastWith(): array
    {
        return [
            'tin_nhan' => [
                'id'             => $this->tin_nhan->id,
                'id_don_hang'    => $this->tin_nhan->id_don_hang,
                'id_nguoi_gui'   => $this->tin_nhan->id_nguoi_gui,
                'loai_nguoi_gui' => $this->tin_nhan->loai_nguoi_gui,
                'noi_dung'       => $this->tin_nhan->noi_dung,
                'da_doc'         => $this->tin_nhan->da_doc,
                'created_at'     => $this->tin_nhan->created_at?->toISOString(),
            ],
        ];
    }
}
