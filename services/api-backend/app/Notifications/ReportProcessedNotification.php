<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ReportProcessedNotification extends Notification
{
    use Queueable;

    public $report;

    private static array $statusLabels = [
        'cho_xu_ly' => 'Chờ xử lý',
        'dang_xu_ly' => 'Đang được xử lý',
        'da_xu_ly' => 'Đã được giải quyết',
    ];

    private static array $statusIcons = [
        'cho_xu_ly' => '⏳',
        'dang_xu_ly' => '🔄',
        'da_xu_ly' => '✅',
    ];

    public function __construct($report)
    {
        $this->report = $report;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $status = $this->report->trang_thai;
        $statusLabel = self::$statusLabels[$status] ?? $status;
        $statusIcon = self::$statusIcons[$status] ?? '📋';
        $maDon = $this->report->don_hang?->ma_don_hang ?? null;

        $isDuyetHuy = $this->report->da_duyet_huy ?? false;

        // Nếu là duyệt hủy đơn → dùng title/message riêng biệt
        if ($isDuyetHuy && $maDon) {
            $title   = '🚫 Đơn hàng đã được hủy';
            $message = "Yêu cầu hủy đơn #{$maDon} của bạn đã được admin chấp thuận. Đơn hàng hiện đã bị hủy.";
            if ($this->report->ghi_chu_admin) {
                $message .= " Ghi chú: {$this->report->ghi_chu_admin}";
            }
        } elseif ($isDuyetHuy) {
            $title   = '🚫 Yêu cầu hủy đã được duyệt';
            $message = "Yêu cầu hủy đơn hàng của bạn đã được admin chấp thuận.";
        } else {
            // Tiêu đề ngắn gọn cho báo cáo thông thường
            $title = $statusIcon . ' Báo cáo của bạn đã được cập nhật';
            if ($maDon) {
                $message = "Báo cáo liên quan đến đơn hàng #{$maDon} hiện có trạng thái: {$statusLabel}.";
            } else {
                $message = "Báo cáo #{$this->report->id} của bạn hiện có trạng thái: {$statusLabel}.";
            }
            if ($status === 'da_xu_ly' && $this->report->ghi_chu_admin) {
                $message .= ' Admin đã để lại phản hồi cho bạn.';
            }
        }

        return [
            'loai'         => $isDuyetHuy ? 'order_cancelled' : 'report_processed',
            'report_id'    => $this->report->id,
            'title'        => $title,
            'message'      => $message,
            'trang_thai'   => $status,
            'status_label' => $statusLabel,
            'ghi_chu_admin' => $this->report->ghi_chu_admin,
            'ma_don_hang'  => $maDon,
            'da_duyet_huy' => $isDuyetHuy,
            'created_at'   => now()->toDateTimeString(),
        ];
    }
}
