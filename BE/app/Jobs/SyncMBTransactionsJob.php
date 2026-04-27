<?php

namespace App\Jobs;

use App\Http\Controllers\TransactionController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SyncMBTransactionsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries   = 2;
    public $timeout = 30;

    public function handle(): void
    {
        Log::info('🔄 SyncMBTransactionsJob: Bắt đầu đồng bộ giao dịch MB...');

        try {
            $controller = new TransactionController();
            $request = Request::create('/api/transaction/sync', 'GET', [
                'day_begin' => now()->format('d/m/Y'),
                'day_end'   => now()->format('d/m/Y'),
            ]);

            $response = $controller->syncTransactions($request);
            $result   = json_decode($response->getContent(), true);

            Log::info('✅ Sync MB xong: ' . ($result['message'] ?? 'OK'));
        } catch (\Exception $e) {
            Log::error('❌ SyncMBTransactionsJob lỗi: ' . $e->getMessage());
        }
    }
}
