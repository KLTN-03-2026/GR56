<?php

namespace App\Jobs;

use App\Models\BankAccountWallet;
use App\Models\CauHinh;
use App\Models\DonHang;
use App\Models\KhachHang;
use App\Events\AdminAlertEvent;
use App\Services\PayOSService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class RefundPayOSJob implements ShouldQueue
{
    use Queueable;

    public int    $orderId;
    public ?float $amount;
    public string $reason;

    public int $tries = 3;
    public int $backoff = 60; // Retry sau 60 giây nếu thất bại

    public function __construct(int $orderId, ?float $amount = null, string $reason = 'Hoàn tiền đơn hàng')
    {
        $this->orderId = $orderId;
        $this->amount  = $amount;
        $this->reason  = $reason;
    }

    public function handle(): void
    {
        // Kiểm tra tính năng có được bật không (getVal trả về string)
        if (CauHinh::getVal('refund_enabled', '1') == '0') {
            Log::info("[RefundPayOSJob] Tính năng hoàn tiền đang tắt. Bỏ qua đơn #{$this->orderId}");
            return;
        }

        // Lấy đơn hàng
        $order = DonHang::find($this->orderId);
        if (!$order) {
            Log::warning("[RefundPayOSJob] Không tìm thấy đơn hàng #{$this->orderId}");
            return;
        }

        // Chỉ hoàn tiền khi:
        // 1. Đơn đã thanh toán PayOS (is_thanh_toan=1, phuong_thuc_thanh_toan=3)
        // 2. Đơn đang ở trạng thái hủy (tinh_trang=5)
        // 3. Chưa được hoàn tiền thành công
        if (
            $order->is_thanh_toan != DonHang::DA_THANH_TOAN ||
            $order->phuong_thuc_thanh_toan != DonHang::thanh_toan_payos ||
            $order->tinh_trang != DonHang::TINH_TRANG_DA_HUY ||
            $order->refund_status === 'success'
        ) {
            Log::info("[RefundPayOSJob] Đơn #{$this->orderId} không đủ điều kiện hoàn tiền. is_thanh_toan={$order->is_thanh_toan}, phuong_thuc={$order->phuong_thuc_thanh_toan}, tinh_trang={$order->tinh_trang}, refund_status={$order->refund_status}");
            return;
        }

        // Lấy tài khoản ngân hàng mặc định của khách hàng
        $bank = BankAccountWallet::where('loai_chu', 'khach_hang')
            ->where('id_chu', $order->id_khach_hang)
            ->where('is_default', 1)
            ->first();

        // Nếu không có tài khoản mặc định, lấy tài khoản đầu tiên
        if (!$bank) {
            $bank = BankAccountWallet::where('loai_chu', 'khach_hang')
                ->where('id_chu', $order->id_khach_hang)
                ->first();
        }

        if (!$bank) {
            $note = 'Khách hàng chưa cài đặt tài khoản ngân hàng nhận hoàn tiền';
            Log::warning("[RefundPayOSJob] Khách hàng #{$order->id_khach_hang} chưa cấu hình tài khoản NH. Đơn #{$this->orderId} KHÔNG được hoàn tiền tự động.");
            $order->update(['refund_status' => 'failed', 'refund_note' => $note]);
            // Alert admin
            try {
                broadcast(new AdminAlertEvent('refund_failed', [
                    'ma_don_hang' => $order->ma_don_hang,
                    'so_tien'     => $order->tong_tien,
                    'ly_do'       => $note,
                ]));
            } catch (\Exception) {}
            return;
        }

        $refundAmount = intval($this->amount ?? $order->tong_tien);
        // PayOS Payout: description tối đa 25 ký tự
        $description  = mb_substr("HOAN TIEN " . $order->ma_don_hang, 0, 25);

        Log::info("[RefundPayOSJob] Bắt đầu hoàn tiền đơn #{$order->ma_don_hang} | Số tiền: {$refundAmount}đ | Bank: {$bank->ten_ngan_hang} - {$bank->so_tai_khoan}");

        // Đánh dấu pending trước khi gọi API
        $order->update(['refund_status' => 'pending']);

        // Gọi PayOS Payout thông qua method mới (không ảnh hưởng code cũ)
        $result = PayOSService::taoPayoutRefund($order->id, $refundAmount, $description, $bank);

        if ($result['status']) {
            $order->update([
                'refund_status'    => 'success',
                'refund_at'        => now(),
                'refund_payout_id' => $result['payout_id'] ?? null,
                'refund_note'      => "Hoàn tiền thành công | Ngân hàng: {$bank->ten_ngan_hang} - {$bank->so_tai_khoan}",
            ]);

            Log::info("[RefundPayOSJob] ✅ Hoàn tiền thành công đơn #{$order->ma_don_hang} | PayoutID: " . ($result['payout_id'] ?? 'N/A'));

            // Gửi thông báo + email cho khách hàng
            try {
                $khach = KhachHang::find($order->id_khach_hang);
                if ($khach) {
                    $khach->notify(new \App\Notifications\RefundSuccessNotification($order, $refundAmount, $bank));

                    // Gửi email hoàn tiền
                    SendMailJob::dispatch(
                        $khach->email,
                        '💸 Hoàn tiền thành công - #' . $order->ma_don_hang,
                        'emails.hoan_tien',
                        [
                            'ho_ten'       => $khach->ho_va_ten,
                            'ma_don_hang'  => $order->ma_don_hang,
                            'so_tien_hoan' => $refundAmount,
                            'ly_do'        => $order->ly_do ?? 'Đơn hàng bị hủy',
                            'hinh_thuc'    => 'bank',
                            'xu_hoan'      => $order->xu_su_dung ?? 0,
                        ]
                    );
                }
            } catch (\Exception $e) {
                Log::error("[RefundPayOSJob] Lỗi gửi thông báo: " . $e->getMessage());
            }
        } else {
            $errorMessage = $result['message'] ?? 'Lỗi không xác định';
            Log::error("[RefundPayOSJob] ❌ Hoàn tiền thất bại đơn #{$order->ma_don_hang}: {$errorMessage}");

            // Phân tích lỗi để hiển thị thông điệp thân thiện
            $friendlyNote = self::parseFriendlyError($errorMessage, $bank);

            // Nếu lỗi là không đủ số dư (code 624) → không retry vô ích, xóa job luôn
            if (str_contains($errorMessage, 'code: 624') || str_contains($errorMessage, 'Số dư tài khoản không đủ')) {
            $order->update(['refund_status' => 'failed', 'refund_note' => $friendlyNote]);
                Log::error("[RefundPayOSJob] Tài khoản PayOS Payout không đủ số dư! Admin cần nạp thêm tiền vào tài khoản Payout. Đơn #{$order->ma_don_hang} cần hoàn {$refundAmount}VNĐ");
                // Alert admin
                try {
                    broadcast(new AdminAlertEvent('refund_failed', [
                        'ma_don_hang' => $order->ma_don_hang,
                        'so_tien'     => $refundAmount,
                        'ly_do'       => $friendlyNote,
                    ]));
                } catch (\Exception) {}
                $this->fail(new \Exception("PayOS Payout không đủ số dư (code 624). Admin cần nạp tiền vào tài khoản Payout."));
                return;
            }

            // Lưu lỗi trước khi throw
            $order->update(['refund_status' => 'failed', 'refund_note' => $friendlyNote]);
            // Alert admin
            try {
                broadcast(new AdminAlertEvent('refund_failed', [
                    'ma_don_hang' => $order->ma_don_hang,
                    'so_tien'     => $refundAmount,
                    'ly_do'       => $friendlyNote,
                ]));
            } catch (\Exception) {}
            // Lỗi khác (mạng, timeout...) → throw để Queue retry
            throw new \Exception("PayOS Payout thất bại: {$errorMessage}");
        }
    }

    /**
     * Phân tích thông điệp lỗi từ PayOS thành nội dung thân thiện cho admin.
     */
    private function parseFriendlyError(string $errorMessage, ?\App\Models\BankAccountWallet $bank): string
    {
        // Lỗi số dư không đủ
        if (str_contains($errorMessage, 'code: 624') || str_contains($errorMessage, 'Số dư tài khoản không đủ')) {
            return 'Tài khoản PayOS Payout không đủ số dư để thực hiện giao dịch';
        }
        // Lỗi tài khoản ngân hàng không hợp lệ / sai số TK
        if (str_contains($errorMessage, 'code: 625') || str_contains($errorMessage, 'invalid') || str_contains($errorMessage, 'account')) {
            $bankInfo = $bank ? "({$bank->ten_ngan_hang} - {$bank->so_tai_khoan})" : '';
            return "Số tài khoản ngân hàng không hợp lệ hoặc sai {$bankInfo}";
        }
        // Lỗi không tìm thấy mã BIN
        if (str_contains($errorMessage, 'BIN') || str_contains($errorMessage, 'ngân hàng')) {
            $bankName = $bank ? $bank->ten_ngan_hang : 'không xác định';
            return "Không hỗ trợ ngân hàng: {$bankName}";
        }
        // Lỗi timeout / mạng
        if (str_contains($errorMessage, 'timeout') || str_contains($errorMessage, 'Connection') || str_contains($errorMessage, 'cURL')) {
            return 'Lỗi kết nối đến PayOS (timeout) — sẽ tự thử lại';
        }
        // Trả về mặc định rút gọn
        return mb_substr($errorMessage, 0, 200);
    }
}
