<?php

namespace App\Jobs;

// DonHangMoiShipperEvent removed — dispatch is now targeted (1 shipper only)
use App\Models\DonHang;
use App\Services\DispatcherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FindShipperJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 60, 120]; // retry sau 30s, 60s, 120s

    public DonHang $order;
    public int $attempt;

    public function __construct(DonHang $order, int $attempt = 1)
    {
        $this->order   = $order->withoutRelations();
        $this->attempt = $attempt;
        $this->onQueue('dispatch');
    }

    public function handle(DispatcherService $dispatcher): void
    {
        $order = DonHang::find($this->order->id);
        if (!$order) {
            Log::warning("FindShipperJob: order #{$this->order->id} not found, skipping.");
            return;
        }

        if ($order->id_shipper != 0 || $order->tinh_trang === DonHang::TINH_TRANG_DA_HUY) {
            Log::info("FindShipperJob: order #{$order->ma_don_hang} already assigned/cancelled, skipping.");
            return;
        }

        Log::info("FindShipperJob attempt #{$this->attempt}: dispatching order #{$order->ma_don_hang}");

        try {
            $result = $dispatcher->dispatch($order);
        } catch (\Throwable $e) {
            // Lỗi hệ thống (Redis, DB, ...) — KHÔNG hủy đơn, chỉ log và retry
            Log::error("FindShipperJob: unexpected exception for #{$order->ma_don_hang}: " . $e->getMessage());
            if ($this->attempt < $this->tries) {
                $wait = $this->backoff[$this->attempt - 1] ?? 60;
                Log::info("FindShipperJob: retrying #{$order->ma_don_hang} in {$wait}s after exception (attempt " . ($this->attempt + 1) . ")");
                self::dispatch($order, $this->attempt + 1)
                    ->delay(now()->addSeconds($wait))
                    ->onQueue('dispatch');
            } else {
                Log::critical("FindShipperJob: all retries exhausted after exception for #{$order->ma_don_hang}. Order left in pending state.");
                // KHÔNG hủy đơn — để admin xử lý thủ công
            }
            return;
        }

        if (!$result['ok']) {
            Log::warning("FindShipperJob: dispatch failed for #{$order->ma_don_hang}. Reason: {$result['reason']}");

            if (in_array($result['reason'], ['no_more_shippers', 'no_shippers'])) {
                Log::critical("FindShipperJob: no available shippers for #{$order->ma_don_hang}, cancelling order.");
                $order->update([
                    'tinh_trang' => DonHang::TINH_TRANG_DA_HUY,
                    'ly_do'      => 'no_shipper_available',
                ]);
            } elseif ($this->attempt < $this->tries) {
                $wait = $this->backoff[$this->attempt - 1] ?? 120;
                Log::info("FindShipperJob: retrying #{$order->ma_don_hang} in {$wait}s (attempt " . ($this->attempt + 1) . ")");
                self::dispatch($order, $this->attempt + 1)
                    ->delay(now()->addSeconds($wait))
                    ->onQueue('dispatch');
            } else {
                Log::critical("FindShipperJob: all retries exhausted for #{$order->ma_don_hang}");
                $order->update([
                    'tinh_trang' => DonHang::TINH_TRANG_DA_HUY,
                    'ly_do'      => 'dispatch_failed',
                ]);
            }
            return;
        }

        Log::info("FindShipperJob: ✅ dispatch OK cho #{$order->ma_don_hang} → Shipper #{$result['shipper']->id} ({$result['shipper']->ho_va_ten}) được mời nhận.");
    }

    public function failed(\Throwable $e): void
    {
        // Chỉ log, KHÔNG hủy đơn — handle() đã bắt exception và retry an toàn
        // Nếu failed() hủy đơn, sẽ xảy ra double-cancel khi Redis/infra lỗi
        Log::critical("FindShipperJob: JOB FAILED for order #{$this->order->id}", [
            'error'   => $e->getMessage(),
            'attempt' => $this->attempt,
        ]);
    }
}
