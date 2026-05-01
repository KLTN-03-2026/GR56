<?php

namespace App\Http\Controllers;

use App\Models\DonHang;
use App\Models\GiaoDich;
use App\Models\WithdrawRequest;
use App\Services\PayOSService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PayOSController — Điều phối tích hợp PayOS
 *
 * Endpoints:
 *   POST /payos/webhook                → Nhận thông báo thanh toán từ PayOS
 *   POST /payos/tao-link/{id_don_hang} → Tạo link thanh toán đơn hàng
 *   GET  /payos/thong-tin/{orderCode}  → Lấy thông tin link thanh toán
 *   POST /payos/huy-link/{orderCode}   → Huỷ link thanh toán
 *   GET  /payos/lich-su                → Lịch sử giao dịch từ PayOS
 *   GET  /payos/ngan-hang              → Danh sách ngân hàng hỗ trợ
 *   GET  /admin/payos/payout/danh-sach → Danh sách lệnh chi
 *   GET  /admin/payos/payout/so-du    → Số dư tài khoản payout
 *   GET  /admin/payos/payout/{id}     → Chi tiết lệnh chi
 */
class PayOSController extends Controller
{
    // ══════════════════════════════════════════════════════════
    // WEBHOOK — Nhận từ PayOS (PUBLIC, không cần auth)
    // ══════════════════════════════════════════════════════════

    /**
     * Nhận dữ liệu webhook thanh toán từ PayOS
     * POST /api/payos/webhook
     */
    public function webhook(Request $request)
    {
        $webhookData = $request->all();
        Log::info('PayOS Webhook nhận: ' . json_encode($webhookData));

        $result = PayOSService::xuLyWebhookThanhToan($webhookData);

        // PayOS yêu cầu phản hồi 200 OK dù có lỗi
        return response()->json([
            'code' => $result['status'] ? '00' : '99',
            'desc' => $result['message'] ?? '',
        ]);
    }

    // ══════════════════════════════════════════════════════════
    // PAYMENT LINK — Tạo & Quản lý link thanh toán
    // ══════════════════════════════════════════════════════════

    /**
     * Tạo link thanh toán cho đơn hàng
     * POST /api/payos/tao-link/{id_don_hang}
     * (Gọi khi khách hàng chọn thanh toán qua PayOS)
     */
    public function taoLinkThanhToan(Request $request, int $id_don_hang)
    {
        // ── Dùng pessimistic lock để tránh race condition khi user bấm nhiều lần ──
        // Request thứ 2 sẽ chờ request thứ 1 hoàn thành rồi mới đọc lại DB
        return DB::transaction(function () use ($id_don_hang) {
            $don_hang = DonHang::with('chiTiet.monAn')
                ->lockForUpdate()
                ->find($id_don_hang);

            if (!$don_hang) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);
            }

            if ($don_hang->is_thanh_toan) {
                return response()->json(['status' => false, 'message' => 'Đơn hàng đã được thanh toán']);
            }

            // ── Nếu đã có link PayOS từ trước, kiểm tra trạng thái ──────────
            if ($don_hang->payos_payment_link_id) {
                $thong_tin = PayOSService::layThongTinLink($don_hang->payos_payment_link_id);

                if ($thong_tin['status']) {
                    $statusLink = $thong_tin['data']['status'] ?? '';

                    // Link đã PAID nhưng DB chưa cập nhật (xảy ra khi webhook rớt hoặc chạy localhost)
                    if ($statusLink === 'PAID') {
                        Log::info("PayOS: Phát hiện PAID khi gọi taoLink, tự động đồng bộ đơn #{$don_hang->ma_don_hang}");
                        $webhookData = [
                            'code' => '00',
                            'data' => [
                                'orderCode' => $id_don_hang,
                                'amount' => $thong_tin['data']['amount'],
                                'paymentLinkId' => $don_hang->payos_payment_link_id,
                                'description' => $thong_tin['data']['description'] ?? '',
                                'reference' => $thong_tin['data']['transactions'][0]['reference'] ?? $don_hang->payos_payment_link_id
                            ]
                        ];
                        $syncResult = PayOSService::xuLyWebhookThanhToan($webhookData);
                        return response()->json([
                            'status' => true,
                            'message' => 'Đơn hàng đã được thanh toán thành công!',
                            'is_paid' => true,
                            'sync' => $syncResult
                        ]);
                    }

                    // Link vẫn còn PENDING → trả về checkout URL cũ, KHÔNG tạo mới
                    if ($statusLink === 'PENDING') {
                        Log::info("PayOS: Reuse link PENDING cho đơn #{$don_hang->ma_don_hang}");
                        return response()->json([
                            'status' => true,
                            'checkout_url' => $thong_tin['data']['checkoutUrl']
                                ?? ('https://pay.payos.vn/web/' . $don_hang->payos_payment_link_id),
                            'payment_link_id' => $don_hang->payos_payment_link_id,
                            'qr_code' => $thong_tin['data']['qrCode'] ?? '',
                            'order_code' => $don_hang->id,
                            'reused' => true,
                        ]);
                    }
                    // CANCELLED / EXPIRED → tiếp tục tạo link mới bên dưới
                }
            }

            $result = PayOSService::taoLinkThanhToan($don_hang);
            return response()->json($result);
        });
    }

    /**
     * Lấy thông tin link thanh toán từ PayOS
     * GET /api/payos/thong-tin/{orderCode}
     */
    public function thongTinLink(Request $request, int $orderCode)
    {
        $result = PayOSService::layThongTinLink($orderCode);
        return response()->json($result);
    }
    /**
     * Xác nhận đơn hàng S2S thủ công từ Frontend
     * POST /api/payos/xac-nhan-s2s
     */
    public function xacNhanS2S(Request $request)
    {
        $orderCode = $request->orderCode;
        if (!$orderCode || $orderCode > 2000000000) {
            return response()->json(['status' => false, 'message' => 'Mã đơn không hợp lệ']);
        }

        // Lấy thông tin từ PayOS
        $thong_tin = PayOSService::layThongTinLink($orderCode);
        if ($thong_tin['status'] && ($thong_tin['data']['status'] ?? '') === 'PAID') {
            // giả lập webhook payload
            $webhookData = [
                'code' => '00',
                'data' => [
                    'orderCode' => $orderCode,
                    'amount' => $thong_tin['data']['amount'],
                    'paymentLinkId' => $thong_tin['data']['id'] ?? $orderCode,
                    'description' => $thong_tin['data']['description'] ?? '',
                    'reference' => $thong_tin['data']['transactions'][0]['reference'] ?? $thong_tin['data']['id'] ?? $orderCode
                ]
            ];
            $result = PayOSService::xuLyWebhookThanhToan($webhookData);
            return response()->json($result);
        }

        return response()->json(['status' => false, 'message' => 'Đơn chưa thanh toán hoặc lỗi kết nối.']);
    }
    /**
     * Huỷ link thanh toán
     * POST /api/payos/huy-link/{orderCode}
     */
    public function huyLink(Request $request, int $orderCode)
    {
        $reason = $request->get('reason', 'Huỷ bởi khách hàng');
        $result = PayOSService::huyLink($orderCode, $reason);
        return response()->json($result);
    }

    /**
     * Lịch sử giao dịch PayOS (từ PayOS portal)
     * GET /api/payos/lich-su
     */
    public function lichSu(Request $request)
    {
        $result = PayOSService::lichSuGiaoDich($request->get('cursor'));
        return response()->json($result);
    }

    /**
     * Lịch sử giao dịch PayOS đã xử lý (từ database nội bộ)
     * GET /api/payos/lich-su-noi-bo
     */
    public function lichSuNoiBo(Request $request)
    {
        $query = GiaoDich::whereIn('loai', ['payos_don_hang', 'don_hang'])
            ->orderByDesc('created_at');

        if ($request->filled('tu_ngay')) {
            $query->whereDate('created_at', '>=', $request->tu_ngay);
        }
        if ($request->filled('den_ngay')) {
            $query->whereDate('created_at', '<=', $request->den_ngay);
        }

        $data = $query->limit(200)->get();

        return response()->json(['status' => true, 'data' => $data]);
    }

    /**
     * Danh sách ngân hàng hỗ trợ
     * GET /api/payos/ngan-hang
     */
    public function danhSachNganHang()
    {
        $result = PayOSService::danhSachNganHang();
        return response()->json($result);
    }

    // ══════════════════════════════════════════════════════════
    // PAYOUT — Quản lý lệnh chi (Admin only)
    // ══════════════════════════════════════════════════════════

    /**
     * Danh sách lệnh chi (Payout)
     * GET /api/admin/payos/payout/danh-sach
     */
    public function danhSachPayout(Request $request)
    {
        $params = [];
        if ($request->filled('cursor')) {
            $params['cursor'] = $request->cursor;
        }
        $result = PayOSService::danhSachPayout($params);
        return response()->json($result);
    }

    /**
     * Số dư tài khoản payout
     * GET /api/admin/payos/payout/so-du
     */
    public function soDuPayout()
    {
        $result = PayOSService::soDuPayout();
        return response()->json($result);
    }

    /**
     * Chi tiết một lệnh chi
     * GET /api/admin/payos/payout/{payout_id}
     */
    public function chiTietPayout(string $payout_id)
    {
        $result = PayOSService::layThongTinPayout($payout_id);
        return response()->json($result);
    }

    /**
     * Kiểm tra tình trạng kết nối PayOS (cả 2 tài khoản)
     * GET /api/admin/payos/kiem-tra-ket-noi
     */
    public function kiemTraKetNoi()
    {
        // Kiểm tra tài khoản Payment bằng hàm check mới
        $payment = PayOSService::kiemTraKetNoiThanhToan();
        // Kiểm tra tài khoản Payout
        $payout = PayOSService::soDuPayout();

        return response()->json([
            'status' => true,
            'payment' => [
                'ket_noi' => $payment['status'],
                'message' => $payment['status'] ? 'Kết nối thành công' : ($payment['message'] ?? 'Lỗi'),
            ],
            'payout' => [
                'ket_noi' => $payout['status'],
                'so_du' => $payout['balance'] ?? 0,
                'message' => $payout['status'] ? 'Kết nối thành công' : ($payout['message'] ?? 'Lỗi'),
            ],
        ]);
    }
}
