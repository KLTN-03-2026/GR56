<?php

namespace App\Jobs;

use App\Models\DonHang;
use App\Services\WalletService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CalculateRevenueJob implements ShouldQueue
{
    use Queueable;

    public $orderId;

    /**
     * Create a new job instance.
     */
    public function __construct($orderId)
    {
        $this->orderId = $orderId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $order = DonHang::find($this->orderId);
        if ($order && $order->tinh_trang == DonHang::TINH_TRANG_DA_HOAN_THANH) {
            Log::info("Calculating revenue for Order {$this->orderId} via Queue");
            
            // Sử dụng service đối soát đã có sẵn để chia tiền chuẩn xác vào ví
            WalletService::doiSoatDonHang($order);
        }
    }
}
