<?php

namespace App\Console\Commands;

use App\Models\AiTrendingDish;
use App\Models\ChatbotAnalytic;
use App\Models\MonAn;
use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ComputeTrendingDishes extends Command
{
    protected $signature = 'chatbot:compute-trending {--days=7 : So ngay tinh trending} {--threshold=50 : Nguong diem de danh dau hot}';
    protected $description = 'Tinh toan AI trending dishes va danh dau mon hot';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $threshold = (float) $this->option('threshold');
        $periodDate = now()->toDateString();
        $dateFrom = now()->subDays($days)->startOfDay();
        $dateTo = now()->endOfDay();

        $this->info("Bat dau tinh trending dishes | {days} ngay | nguong hot: {$threshold}");
        $this->info("Period: {$dateFrom} → {$dateTo}");

        // ── Dem so lan order moi mon trong {days} ngay ──────
        $orderCounts = DB::table('chi_tiet_don_hangs')
            ->join('don_hangs', 'don_hangs.id', '=', 'chi_tiet_don_hangs.id_don_hang')
            ->whereIn('don_hangs.tinh_trang', [3, 4])
            ->whereBetween('don_hangs.created_at', [$dateFrom, $dateTo])
            ->where('chi_tiet_don_hangs.id_mon_an', '>', 0)
            ->groupBy('chi_tiet_don_hangs.id_mon_an', 'don_hangs.id_quan_an')
            ->select(
                'chi_tiet_don_hangs.id_mon_an',
                'don_hangs.id_quan_an',
                DB::raw('SUM(chi_tiet_don_hangs.so_luong) as order_count')
            )
            ->get()
            ->keyBy(fn($r) => $r->id_mon_an . '_' . $r->id_quan_an);

        // ── Dem so lan hoi chatbot ve mon an ─────────────────
        $conversationCounts = DB::table('chatbot_analytics')
            ->whereBetween('created_at', [$dateFrom, $dateTo])
            ->get()
            ->flatMap(function ($a) {
                $entities = is_array($a->entities) ? $a->entities : json_decode($a->entities ?? '{}', true);
                $monAns = $entities['mon_an'] ?? [];
                return collect($monAns)->map(fn($m) => $m['id'] ?? 0);
            })
            ->filter(fn($id) => $id > 0)
            ->countBy()
            ->toArray();

        // ── Lay tat ca mon an hop le ──────────────────────────
        $validDishes = DB::table('mon_ans')
            ->join('quan_ans', 'quan_ans.id', '=', 'mon_ans.id_quan_an')
            ->where('mon_ans.tinh_trang', 1)
            ->where('quan_ans.tinh_trang', 1)
            ->where('quan_ans.is_active', 1)
            ->where('mon_ans.ten_mon_an', 'not like', 'Them %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Lon %')
            ->where('mon_ans.ten_mon_an', 'not like', 'Ly %')
            ->select('mon_ans.id', 'mon_ans.id_quan_an')
            ->get()
            ->keyBy(fn($r) => $r->id . '_' . $r->id_quan_an);

        // ── Tinh score va insert/update ────────────────────────
        $upsertData = [];
        $orderWeight = 2.0;
        $conversationWeight = 1.0;

        foreach ($validDishes as $key => $dish) {
            $orderCount = $orderCounts->get($key)?->order_count ?? 0;
            $convCount = $conversationCounts[$dish->id] ?? 0;
            $score = ($orderCount * $orderWeight) + ($convCount * $conversationWeight);

            if ($orderCount > 0 || $convCount > 0) {
                $upsertData[] = [
                    'id_mon_an' => $dish->id,
                    'id_quan_an' => $dish->id_quan_an,
                    'score' => $score,
                    'order_count_7d' => $orderCount,
                    'conversation_count_7d' => $convCount,
                    'is_hot' => $score >= $threshold,
                    'period_date' => $periodDate,
                ];
            }
        }

        // ── Xoa record cu cung ngay, insert record moi ────────
        DB::transaction(function () use ($periodDate, $upsertData) {
            AiTrendingDish::where('period_date', $periodDate)->delete();
            if (!empty($upsertData)) {
                AiTrendingDish::insert($upsertData);
            }
        });

        $hotCount = collect($upsertData)->where('is_hot', true)->count();
        $this->info("Hoan tat!");
        $this->info("- Tong mon an tinh trending: " . count($upsertData));
        $this->info("- Mon HOT (score >= {$threshold}): {$hotCount}");
        $this->info("- Top 5 mon:\n");

        $top5 = collect($upsertData)
            ->sortByDesc('score')
            ->take(5);

        foreach ($top5 as $i => $item) {
            $mon = MonAn::find($item['id_mon_an']);
            $name = $mon?->ten_mon_an ?? "ID:{$item['id_mon_an']}";
            $this->line("  " . ($i+1) . ". {$name} | Score: {$item['score']} | Don: {$item['order_count_7d']} | Hoi: {$item['conversation_count_7d']}" . ($item['is_hot'] ? ' 🔥' : ''));
        }

        return Command::SUCCESS;
    }
}
