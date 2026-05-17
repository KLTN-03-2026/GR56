<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerProfile extends Model
{
    use HasFactory;

    protected $table = 'customer_profiles';
    protected $fillable = [
        'id_khach_hang',
        'so_lan_dat',
        'dia_chi_thuong_xuyen',
        'top_categories',
        'top_mon_an',
        'top_quan_an',
        'khau_vi',
        'price_range',
        'tags',
        'intent_history',
        'mood_preferences',
    ];
    protected $casts = [
        'dia_chi_thuong_xuyen' => 'array',
        'top_categories' => 'array',
        'top_mon_an' => 'array',
        'top_quan_an' => 'array',
        'tags' => 'array',
        'intent_history' => 'array',
        'mood_preferences' => 'array',
    ];

    public function khachHang()
    {
        return $this->belongsTo(KhachHang::class, 'id_khach_hang');
    }

    public function incrementOrderCount(): void
    {
        $this->so_lan_dat = ($this->so_lan_dat ?? 0) + 1;
    }

    public function updateTopList(string $field, int $itemId, string $itemName, int $limit = 10): void
    {
        $list = $this->{$field} ?? [];
        $found = false;
        foreach ($list as &$item) {
            if ($item['id'] === $itemId) {
                $item['count'] = ($item['count'] ?? 0) + 1;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $list[] = ['id' => $itemId, 'name' => $itemName, 'count' => 1];
        }
        usort($list, fn($a, $b) => $b['count'] <=> $a['count']);
        $this->{$field} = array_slice($list, 0, $limit);
    }

    public function addTag(string $tag): void
    {
        $tags = $this->tags ?? [];
        if (!in_array($tag, $tags)) {
            $tags[] = $tag;
            $this->tags = $tags;
        }
    }

    public function recordIntent(string $intent): void
    {
        $history = $this->intent_history ?? [];
        $found = false;
        foreach ($history as &$item) {
            if ($item['intent'] === $intent) {
                $item['count'] = ($item['count'] ?? 0) + 1;
                $item['last_seen'] = now()->toIso8601String();
                $found = true;
                break;
            }
        }
        if (!$found) {
            $history[] = ['intent' => $intent, 'count' => 1, 'last_seen' => now()->toIso8601String()];
        }
        usort($history, fn($a, $b) => $b['count'] <=> $a['count']);
        $this->intent_history = array_slice($history, 0, 20);
    }
}
