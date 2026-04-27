<?php

namespace App\Jobs;

use App\Events\DonHangDaHuyEvent;
use App\Jobs\RefundPayOSJob;
use App\Models\CauHinh;
use App\Models\DonHang;
use App\Models\KhachHang;
use App\Models\QuanAn;
use App\Models\Shipper;
use App\Services\WalletService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * AutoCancelOrderJob
 *
 * Chạy mỗi phút (qua Scheduler).
 * Tự động hủy đơn hàng ở trạng thái 0 (chờ shipper) hoặc 1 (chờ quán nhận)
 * nếu không có ai nhận sau N phút (cấu hình qua SystemConfig).
 *
 * Sau khi hủy:
 *  - Hoàn xu đã dùng về khách
 *  - Đánh dấu voucher là chưa dùng (nếu có)
 *  - Hoàn cọc COD về ví shipper (nếu shipper đã nhận đơn COD)
 *  - Dispatch RefundPayOSJob nếu đơn đã thanh toán PayOS
 *  - Phát event realtime cho khách / quán / shipper
 *  - Lưu notification vào DB cho khách hàng, quán ăn và shipper
 */
class AutoCancelOrderJob implements ShouldQueue
{
    use Queueable;

    public int $tries   = 1; // Không retry — chạy theo schedule
    public int $timeout = 120;

    public function handle(): void
    {
        // ── Kiểm tra tính năng có được bật không ─────────────────
        if (CauHinh::getVal('auto_cancel_enabled', '1') == '0') {
            Log::info('[AutoCancelOrderJob] Tính năng tự động hủy đơn đang tắt. Bỏ qua.');
            return;
        }

        // ── Lấy timeout từ config (mặc định 5 phút) ─────────────
        $timeout = intval(CauHinh::getVal('thoi_gian_cho_shipper', 5));
        if ($timeout < 1) $timeout = 5;

        Log::info("[AutoCancelOrderJob] Bắt đầu kiểm tra. Timeout = {$timeout} phút.");

        // ── Query đơn quá hạn: status 0 hoặc 1 — dùng Eloquent để có đúng kiểu ──
        /** @var \Illuminate\Database\Eloquent\Collection<int, DonHang> $donHangs */
        $donHangs = DonHang::whereIn('tinh_trang', [0, 1])
            ->where('created_at', '<', now()->subMinutes($timeout))
            ->get();

        if ($donHangs->isEmpty()) {
            Log::info('[AutoCancelOrderJob] Không có đơn nào quá hạn.');
            return;
        }

        Log::info("[AutoCancelOrderJob] Tìm thấy {$donHangs->count()} đơn quá hạn.");

        foreach ($donHangs as $donHang) {
            $this->huyMotDon($donHang, $timeout);
        }
    }

    /**
     * Hủy 1 đơn hàng quá hạn
     */
    private function huyMotDon(DonHang $donHang, int $timeout): void
    {
        DB::beginTransaction();
        try {
            // ── 1. Cập nhật trạng thái hủy ───────────────────────
            $donHang->tinh_trang = DonHang::TINH_TRANG_DA_HUY; // 5
            $donHang->ly_do      = 'auto_cancel';
            $donHang->save();

            // ── 2. Hoàn xu + voucher cho khách ────────────────────
            WalletService::hoanXuVaVoucher($donHang);

            DB::commit();

            // ── 3. Hoàn tiền PayOS (nếu đã thanh toán online) ────
            if (
                $donHang->is_thanh_toan == DonHang::DA_THANH_TOAN &&
                $donHang->phuong_thuc_thanh_toan == DonHang::thanh_toan_payos
            ) {
                RefundPayOSJob::dispatch($donHang->id, null, 'AutoCancel: không có shipper');
                Log::info("[AutoCancelOrderJob] Dispatch RefundPayOSJob cho đơn #{$donHang->ma_don_hang}");
            }

            // ── 4. Hoàn cọc COD về ví shipper ────────────────────
            // Trạng thái 1 = SHIP_DA_NHAN: shipper đã trừ tiền ví khi nhận đơn COD
            if ($donHang->id_shipper && $donHang->da_dat_coc && $donHang->phuong_thuc_thanh_toan == DonHang::thanh_toan_tien_mat) {
                try {
                    WalletService::hoanCocCODChoShipper($donHang);
                    Log::info("[AutoCancelOrderJob] Đã hoàn cọc COD cho shipper #{$donHang->id_shipper} (đơn #{$donHang->ma_don_hang})");
                } catch (\Exception $e) {
                    Log::warning("[AutoCancelOrderJob] Lỗi hoàn cọc COD shipper #{$donHang->id_shipper}: " . $e->getMessage());
                }
            }

            // ── 5. Broadcast realtime + Notification DB ──────────
            try {
                $donHang->refresh();

                // Broadcast realtime qua Reverb (→ khách, quán, shipper nếu có)
                event(new DonHangDaHuyEvent($donHang));

                // ── Notify Khách hàng ─────────────────────────────
                $khach = KhachHang::find($donHang->id_khach_hang);
                if ($khach) {
                    $msgKhach = "Đơn #{$donHang->ma_don_hang} đã bị hủy tự động do không tìm được shipper sau {$timeout} phút."
                        . ($donHang->xu_su_dung > 0 ? " Xu đã được hoàn lại vào tài khoản." : "")
                        . ($donHang->is_thanh_toan && $donHang->phuong_thuc_thanh_toan == DonHang::thanh_toan_payos
                            ? " Tiền sẽ được hoàn về tài khoản ngân hàng của bạn." : "");

                    $khach->notify(new \App\Notifications\OrderCancelledKhachHangNotification(
                        $donHang, $msgKhach, 'auto_cancel'
                    ));
                }

                // ── Notify Quán ăn ────────────────────────────────
                $quanAn = QuanAn::find($donHang->id_quan_an);
                if ($quanAn) {
                    $quanAn->notify(new \App\Notifications\OrderCancelledKhachHangNotification(
                        $donHang,
                        "Đơn #{$donHang->ma_don_hang} đã bị hủy tự động do không tìm được shipper sau {$timeout} phút.",
                        'auto_cancel'
                    ));
                }

                // ── Notify Shipper (nếu đã nhận đơn) ─────────────
                if ($donHang->id_shipper) {
                    $shipper = Shipper::find($donHang->id_shipper);
                    if ($shipper) {
                        $msgShipper = $donHang->da_dat_coc
                            ? "Đơn #{$donHang->ma_don_hang} đã bị hủy tự động. Tiền cọc COD đã được hoàn lại vào ví của bạn."
                            : "Đơn #{$donHang->ma_don_hang} đã bị hủy tự động do quá {$timeout} phút.";

                        $shipper->notify(new \App\Notifications\OrderCancelledShipperNotification(
                            $donHang, $msgShipper
                        ));
                    }
                }
            } catch (\Exception $e) {
                Log::error("[AutoCancelOrderJob] Lỗi broadcast/notify đơn #{$donHang->ma_don_hang}: " . $e->getMessage());
            }

            Log::info("[AutoCancelOrderJob] ✅ Đã hủy đơn #{$donHang->ma_don_hang} (quá {$timeout} phút không có shipper nhận)");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("[AutoCancelOrderJob] ❌ Lỗi hủy đơn #{$donHang->ma_don_hang}: " . $e->getMessage());
        }
    }
}
