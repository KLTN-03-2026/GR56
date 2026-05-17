<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiTrendingDish extends Model
{
    use HasFactory;

    protected $table = 'ai_trending_dishes';
    protected $fillable = [
        'id_mon_an',
        'id_quan_an',
        'score',
        'order_count_7d',
        'conversation_count_7d',
        'is_hot',
        'period_date',
    ];
    protected $casts = [
        'score' => 'float',
        'is_hot' => 'boolean',
        'period_date' => 'date',
    ];

    public function monAn()
    {
        return $this->belongsTo(MonAn::class, 'id_mon_an');
    }

    public function quanAn()
    {
        return $this->belongsTo(QuanAn::class, 'id_quan_an');
    }

    public function computeScore(): float
    {
        $orderWeight = 2.0;
        $conversationWeight = 1.0;
        return ($this->order_count_7d * $orderWeight) + ($this->conversation_count_7d * $conversationWeight);
    }

    public static function markHot(float $threshold = 50.0): void
    {
        static::query()->update(['is_hot' => false]);
        static::query()->where('score', '>=', $threshold)->update(['is_hot' => true]);
    }
}
