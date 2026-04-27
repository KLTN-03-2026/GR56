<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    public $userId;
    public $userType; // 'khach_hang', 'shipper', 'quan_an'
    public $title;
    public $body;
    public $data;

    /**
     * Create a new job instance.
     */
    public function __construct($userId, $userType, $title, $body, $data = [])
    {
        $this->userId   = $userId;
        $this->userType = $userType;
        $this->title    = $title;
        $this->body     = $body;
        $this->data     = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("Sending notification to {$this->userType} ID {$this->userId}: {$this->title}");
        
        // GIẢ LẬP GỬI FIREBASE/PUSHER
        // Trong thực tế bạn sẽ gọi Firebase Service hoặc Pusher ở đây
        // logic:
        // 1. Lấy FCM Token của user từ DB
        // 2. Gọi Firebase Cloud Messaging API gửi tin nhắn
        
        // Ví dụ giả lập:
        // $fcmToken = User::find($this->userId)->fcm_token;
        // if ($fcmToken) {
        //     FirebaseService::send($fcmToken, $this->title, $this->body, $this->data);
        // }
    }
}
