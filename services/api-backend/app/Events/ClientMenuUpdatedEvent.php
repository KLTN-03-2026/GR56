<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ClientMenuUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct()
    {
        //
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('public-client-events'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'client.menu.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'time' => now()->toIso8601String(),
        ];
    }
}

