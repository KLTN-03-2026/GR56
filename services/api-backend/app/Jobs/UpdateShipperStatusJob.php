<?php

namespace App\Jobs;

use App\Models\Shipper;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class UpdateShipperStatusJob implements ShouldQueue
{
    use Queueable;

    public $shipperId;
    public $status;

    /**
     * Create a new job instance.
     */
    public function __construct($shipperId, $status)
    {
        $this->shipperId = $shipperId;
        $this->status    = $status;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $shipper = Shipper::find($this->shipperId);
        if ($shipper) {
            $shipper->is_open = $this->status;
            $shipper->save();
            Log::info("Shipper {$this->shipperId} status updated to: {$this->status}");
        }
    }
}
