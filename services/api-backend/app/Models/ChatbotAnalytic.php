<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotAnalytic extends Model
{
    use HasFactory;

    protected $table = 'chatbot_analytics';
    protected $fillable = [
        'id_khach_hang',
        'session_id',
        'intent',
        'entities',
        'response_type',
        'converted',
        'message_preview',
    ];
    protected $casts = [
        'entities' => 'array',
        'converted' => 'boolean',
    ];

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }

    public function session()
    {
        return $this->belongsTo(ChatbotSession::class, 'session_id');
    }
}
