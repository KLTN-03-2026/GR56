<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotSession extends Model
{
    use HasFactory;

    protected $table = 'chatbot_sessions';
    protected $fillable = [
        'id_khach_hang',
        'session_token',
        'messages',
        'trang_thai',
        'started_at',
        'ended_at',
    ];
    protected $casts = [
        'messages' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }

    public function analytics()
    {
        return $this->hasMany(ChatbotAnalytic::class, 'session_id');
    }

    public function addMessage(string $role, string $content, array $meta = []): void
    {
        $messages = $this->messages ?? [];
        $messages[] = array_merge([
            'role' => $role,
            'content' => $content,
            'timestamp' => now()->toIso8601String(),
        ], $meta);
        $this->messages = $messages;
    }

    public function close(): void
    {
        $this->trang_thai = 'closed';
        $this->ended_at = now();
    }
}
