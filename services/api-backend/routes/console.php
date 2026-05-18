<?php

use App\Jobs\AutoCancelOrderJob;
use App\Jobs\RefundPayOSJob;
use App\Models\CauHinh;
use App\Models\DonHang;
use App\Jobs\SyncMBTransactionsJob;
use App\Services\VoucherService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
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

// ── Tự động hoàn tiền PayOS cho đơn đã hủy ───────────────────────────────
// Chạy trực tiếp để không phụ thuộc queue:work. Một số môi trường deploy chỉ
// chạy scheduler, nên các RefundPayOSJob đã dispatch delay có thể không được xử lý.
Schedule::call(function () {
    if (CauHinh::getVal('refund_enabled', '1') == '0') {
        Log::info('[AutoRefundPayOS] Tính năng hoàn tiền đang tắt. Bỏ qua.');
        return;
    }

    $delay = intval(CauHinh::getVal('refund_delay_minutes', 5));
    if ($delay < 0) $delay = 0;

    $orders = DonHang::where('is_thanh_toan', DonHang::DA_THANH_TOAN)
        ->where('phuong_thuc_thanh_toan', DonHang::thanh_toan_payos)
        ->where('tinh_trang', DonHang::TINH_TRANG_DA_HUY)
        ->whereNull('refund_at')
        ->whereNull('refund_payout_id')
        ->where(function ($q) {
            $q->whereNull('refund_status')
              ->orWhere('refund_status', 'pending');
        })
        ->where('updated_at', '<=', now()->subMinutes($delay))
        ->limit(10)
        ->get();

    if ($orders->isEmpty()) {
        Log::info('[AutoRefundPayOS] Không có đơn PayOS bị hủy nào cần hoàn.');
        return;
    }

    Log::info("[AutoRefundPayOS] Tìm thấy {$orders->count()} đơn cần hoàn tiền.");
    foreach ($orders as $order) {
        try {
            (new RefundPayOSJob($order->id, $order->tong_tien, 'Auto refund PayOS'))->handle();
        } catch (\Throwable $e) {
            Log::error("[AutoRefundPayOS] Lỗi xử lý đơn #{$order->ma_don_hang}: " . $e->getMessage());
        }
    }
})->everyMinute()->name('auto-refund-payos-orders')->withoutOverlapping();

// ── Tính AI Trending Dishes mỗi ngày lúc 02:00 ───────────────────────────────
Schedule::command('chatbot:compute-trending')
    ->dailyAt('02:00')
    ->name('chatbot-compute-trending')
    ->withoutOverlapping();
