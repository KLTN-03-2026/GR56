<?php

use App\Jobs\AutoCancelOrderJob;
use App\Jobs\SyncMBTransactionsJob;
use App\Services\VoucherService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tự động đồng bộ giao dịch MB Bank mỗi 5 phút
Schedule::call(function () {
    SyncMBTransactionsJob::dispatch();
})->everyFiveMinutes()->name('sync-mb-transactions')->withoutOverlapping();

// Auto-generate voucher thông minh mỗi đêm lúc 23:00
Schedule::call(function () {
    VoucherService::autoGenerateBanDem();
})->dailyAt('23:00')->name('auto-generate-vouchers')->withoutOverlapping();

// Sinh voucher giờ vắng lúc 13:30 mỗi ngày
Schedule::call(function () {
    VoucherService::autoGenerateBanDem();
})->dailyAt('13:30')->name('voucher-gio-vang')->withoutOverlapping();

// ── Tự động hủy đơn hàng quá hạn không có shipper nhận ───────────────────
// Chạy trực tiếp (không qua queue) để không phụ thuộc queue:work
Schedule::call(function () {
    (new AutoCancelOrderJob())->handle();
})->everyMinute()->name('auto-cancel-orders')->withoutOverlapping();

// ── Tính AI Trending Dishes mỗi ngày lúc 02:00 ───────────────────────────────
Schedule::command('chatbot:compute-trending')
    ->dailyAt('02:00')
    ->name('chatbot-compute-trending')
    ->withoutOverlapping();
