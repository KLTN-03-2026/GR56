<?php

namespace App\Services;

use App\Models\BankAccountWallet;
use App\Models\DonHang;
use App\Models\GiaoDich;
use App\Models\KhachHang;
use App\Models\Shipper;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use App\Jobs\SendMailJob;
use App\Jobs\RefundPayOSJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;

/**
 * PayOSService — tích hợp PayOS API
 *
 * Có 2 bộ credentials:
 *   1. Payment  (PAYOS_*)        → nhận tiền thanh toán đơn hàng
 *   2. Payout   (PAYOS_PAYOUT_*) → chuyển tiền tự động khi rút ví
 */
class PayOSService
{
    // ── Base URLs ─────────────────────────────────────────────
    const PAYMENT_API_URL = 'https://api-merchant.payos.vn';
    const PAYOUT_API_URL  = 'https://api-payout.payos.vn';

    // ── Payment credentials ────────────────────────────────────
    private static function clientId(): string
    {
        return env('PAYOS_CLIENT_ID', '');
    }

    private static function apiKey(): string
    {
        return env('PAYOS_API_KEY', '');
    }

    private static function checksumKey(): string
    {
        return env('PAYOS_CHECKSUM_KEY', '');
    }

    // ── Payout credentials ─────────────────────────────────────
    private static function payoutClientId(): string
    {
        return env('PAYOS_PAYOUT_CLIENT_ID', '');
    }

    private static function payoutApiKey(): string
    {
        return env('PAYOS_PAYOUT_API_KEY', '');
    }

    private static function payoutChecksumKey(): string
    {
        return env('PAYOS_PAYOUT_CHECKSUM_KEY', '');
    }

    // ══════════════════════════════════════════════════════════
    // PHẦN 1: THANH TOÁN ĐƠN HÀNG (Payment Link)
    // ══════════════════════════════════════════════════════════

    /**
     * Khởi tạo Guzzle HTTP Client ép dùng IPv4
     * Để tránh lỗi "Connection reset by peer" khi IPv6 không khả dụng.
     */
    private static function getHttpClient(): Client
    {
        return new Client([
            'timeout' => 120,
            'connect_timeout' => 30,
            'curl' => [
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            ]
        ]);
    }

    /**
     * Tạo chữ ký HMAC-SHA256 cho Payment Link
     * Theo định dạng PayOS: amount=...&cancelUrl=...&description=...&orderCode=...&returnUrl=...
     */
    public static function taoSignaturePayment(
        int    $amount,
        string $cancelUrl,
        string $description,
        int    $orderCode,
        string $returnUrl
    ): string {
        $data = "amount={$amount}&cancelUrl={$cancelUrl}&description={$description}&orderCode={$orderCode}&returnUrl={$returnUrl}";
        return hash_hmac('sha256', $data, self::checksumKey());
    }

    /**
     * Tạo link thanh toán PayOS cho đơn hàng
     *
     * @param  DonHang $don_hang
     * @return array   ['status' => bool, 'checkout_url' => string, 'payment_link_id' => string]
     */
    public static function taoLinkThanhToan(DonHang $don_hang): array
    {
        try {
            // Lần đầu tiên: dùng ID đơn hàng làm orderCode
            // Retry (link cũ đã CANCELLED/EXPIRED): tạo orderCode mới độc nhất dựa theo timestamp
            // (PayOS không cho phép tái sử dụng orderCode cũ dù link đã hủy)
            if ($don_hang->payos_payment_link_id) {
                // orderCode mới: timestamp phút giây * 10000 + id % 10000
                // Range: an toàn < 1,000,000,000 (dưới ngưỡng payout 2,000,000,000)
                $orderCode = intval(date('His')) * 10000 + ($don_hang->id % 10000);
                // Nếu xảy ra trench vào giờ payout offset thì thay bằng random nhỏ
                if ($orderCode >= 2000000000) {
                    $orderCode = mt_rand(100000000, 1999999999);
                }
            } else {
                $orderCode = intval($don_hang->id);
            }
            $amount      = intval($don_hang->tong_tien);
            $description = "DH" . $don_hang->ma_don_hang; // Tối đa 25 ký tự
            // Ưu tiên biến riêng, fallback tự tính từ FRONTEND_URL (tránh hardcode localhost)
            $frontendBase = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
            $returnUrl    = env('PAYOS_RETURN_URL', $frontendBase . '/payment/payos/return');
            $cancelUrl    = env('PAYOS_CANCEL_URL',  $frontendBase . '/payment/payos/cancel');

            $signature = self::taoSignaturePayment($amount, $cancelUrl, $description, $orderCode, $returnUrl);

            // Chuẩn bị items
            $items = [];
            if ($don_hang->chiTiet && $don_hang->chiTiet->count() > 0) {
                foreach ($don_hang->chiTiet as $ct) {
                    $items[] = [
                        'name'     => $ct->mon_an ? mb_substr($ct->mon_an->ten_mon_an, 0, 50) : 'Món ăn',
                        'quantity' => intval($ct->so_luong),
                        'price'    => intval($ct->don_gia),
                    ];
                }
            } else {
                $items[] = [
                    'name'     => 'Đơn hàng ' . $don_hang->ma_don_hang,
                    'quantity' => 1,
                    'price'    => $amount,
                ];
            }

            $payload = [
                'orderCode'   => $orderCode,
                'amount'      => $amount,
                'description' => $description,
                'items'       => $items,
                'returnUrl'   => $returnUrl,
                'cancelUrl'   => $cancelUrl,
                'signature'   => $signature,
                'expiredAt'   => time() + 3600, // hết hạn sau 1 tiếng
            ];

            $client = self::getHttpClient();
            $res = $client->post(self::PAYMENT_API_URL . '/v2/payment-requests', [
                'json'    => $payload,
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                    'Content-Type' => 'application/json',
                ],
            ]);

            $body = json_decode($res->getBody()->getContents(), true);

            if (($body['code'] ?? '') === '00') {
                // Lưu payment_link_id vào đơn hàng
                $don_hang->payos_payment_link_id = $body['data']['paymentLinkId'] ?? null;
                $don_hang->save();

                Log::info("✅ PayOS: Tạo link thanh toán đơn #{$don_hang->ma_don_hang} thành công");

                return [
                    'status'           => true,
                    'checkout_url'     => $body['data']['checkoutUrl'] ?? '',
                    'payment_link_id'  => $body['data']['paymentLinkId'] ?? '',
                    'qr_code'          => $body['data']['qrCode'] ?? '',
                    'order_code'       => $orderCode,
                ];
            }

            // ── Lỗi 231: "Đơn thanh toán đã tồn tại" ──────────────────────────────
            // Xảy ra khi VPS tạo link thành công nhưng mạng bị ngắt trước khi
            // $don_hang->save() ghi được payos_payment_link_id vào DB.
            // → Tự động recover: fetch link đã có từ PayOS theo orderCode, đồng bộ về DB.
            if (($body['code'] ?? '') === '231') {
                Log::warning("PayOS 231: orderCode={$orderCode} đã tồn tại. Đang kiểm tra...");
                try {
                    $existing = self::layThongTinLink($orderCode);
                    if ($existing['status'] && !empty($existing['data'])) {
                        $data            = $existing['data'];
                        $linkId          = $data['id'] ?? ($data['paymentLinkId'] ?? null);
                        $existingAmount  = intval($data['amount'] ?? 0);
                        $existingStatus  = $data['status'] ?? '';

                        // ── Kiểm tra link này có thực sự thuộc về đơn hàng hiện tại không ──
                        // Nếu amount khác (link của đơn khác) hoặc đã PAID (đã thanh toán cho đơn khác)
                        // → KHÔNG dùng lại, tạo orderCode mới bằng timestamp
                        $amountMatches = ($existingAmount === $amount);
                        $isNotPaid     = ($existingStatus !== 'PAID');

                        if (!$amountMatches || !$isNotPaid) {
                            Log::warning("PayOS 231: Link orderCode={$orderCode} không thuộc đơn này"
                                . " (existingAmt={$existingAmount} vs {$amount}, status={$existingStatus})"
                                . " → Tạo orderCode mới...");

                            // Tạo orderCode mới độc nhất bằng timestamp (giống logic retry)
                            $orderCode = intval(date('His')) * 10000 + ($don_hang->id % 10000);
                            if ($orderCode >= 2000000000) {
                                $orderCode = mt_rand(100000000, 1999999999);
                            }

                            // Tính lại signature với orderCode mới
                            $signature = self::taoSignaturePayment($amount, $cancelUrl, $description, $orderCode, $returnUrl);
                            $payload['orderCode'] = $orderCode;
                            $payload['signature'] = $signature;

                            // Thử lại với orderCode mới
                            $res2  = $client->post(self::PAYMENT_API_URL . '/v2/payment-requests', [
                                'json'    => $payload,
                                'headers' => [
                                    'x-client-id'  => self::clientId(),
                                    'x-api-key'    => self::apiKey(),
                                    'Content-Type' => 'application/json',
                                ],
                            ]);
                            $body2 = json_decode($res2->getBody()->getContents(), true);

                            if (($body2['code'] ?? '') === '00') {
                                $don_hang->payos_payment_link_id = $body2['data']['paymentLinkId'] ?? null;
                                $don_hang->save();
                                Log::info("✅ PayOS: Tạo link mới (orderCode={$orderCode}) cho đơn #{$don_hang->ma_don_hang}");
                                return [
                                    'status'          => true,
                                    'checkout_url'    => $body2['data']['checkoutUrl'] ?? '',
                                    'payment_link_id' => $body2['data']['paymentLinkId'] ?? '',
                                    'qr_code'         => $body2['data']['qrCode'] ?? '',
                                    'order_code'      => $orderCode,
                                ];
                            }

                            Log::error("PayOS tạo link mới sau 231 lỗi: " . json_encode($body2));
                            return ['status' => false, 'message' => $body2['desc'] ?? 'Lỗi PayOS'];
                        }

                        // ── Amount khớp + chưa PAID → đây là link của đúng đơn hàng, recover ──
                        if ($linkId) {
                            $don_hang->payos_payment_link_id = $linkId;
                            $don_hang->save();
                        }

                        $checkoutUrl = $data['checkoutUrl'] ?? ('https://pay.payos.vn/web/' . $linkId);
                        Log::info("✅ PayOS 231 recovered: đơn #{$don_hang->ma_don_hang} | linkId={$linkId}");
                        return [
                            'status'          => true,
                            'checkout_url'    => $checkoutUrl,
                            'payment_link_id' => $linkId ?? '',
                            'qr_code'         => $data['qrCode'] ?? '',
                            'order_code'      => $orderCode,
                            'recovered'       => true,
                        ];
                    }
                } catch (\Exception $recoverEx) {
                    Log::error("PayOS 231 recover thất bại: " . $recoverEx->getMessage());
                }
            }

            Log::error("PayOS tạo link lỗi: " . json_encode($body));
            return ['status' => false, 'message' => $body['desc'] ?? 'Lỗi PayOS'];
        } catch (\Exception $e) {
            Log::error("PayOS exception: " . $e->getMessage());
            return ['status' => false, 'message' => 'Lỗi kết nối PayOS: ' . $e->getMessage()];
        }
    }

    /**
     * Tạo link thanh toán PayOS cho Nạp tiền ví
     *
     * @param  \App\Models\NapTienRequest $nap_tien
     * @return array
     */
    public static function taoLinkNapTien(\App\Models\NapTienRequest $nap_tien): array
    {
        try {
            // Sinh orderCode duy nhất bằng pattern: [1][8-digit ID-với-padded-zero][1-digit-random]
            // Ví dụ: ID 123 -> 1000001235
            // Mã này luôn duy nhất mỗi lần bấm (do có random ở cuối) và không bao giờ vượt 10 chữ số.
            $orderCode = intval("1" . str_pad($nap_tien->id, 8, '0', STR_PAD_LEFT) . mt_rand(0, 9));

            $amount      = intval($nap_tien->so_tien);
            // PayOS description tối đa 25 ký tự.
            $description = "NAPVI" . $nap_tien->id . "S" . $nap_tien->id_shipper;
            if (strlen($description) > 25) {
                $description = substr($description, 0, 25);
            }
            
            $baseUrl     = env('FRONTEND_URL', 'http://localhost:5173');
            $returnUrl   = $baseUrl . '/shipper/vi-tien?payos_return=1';
            $cancelUrl   = $baseUrl . '/shipper/vi-tien?payos_cancel=1';

            $signature = self::taoSignaturePayment($amount, $cancelUrl, $description, $orderCode, $returnUrl);

            $payload = [
                'orderCode'   => $orderCode,
                'amount'      => $amount,
                'description' => $description,
                'items'       => [
                    [
                        'name' => 'Nạp ví Shipper #' . $nap_tien->id_shipper,
                        'quantity' => 1,
                        'price'    => $amount,
                    ]
                ],
                'returnUrl'   => $returnUrl,
                'cancelUrl'   => $cancelUrl,
                'signature'   => $signature,
                'expiredAt'   => time() + 3600,
            ];

            $client = self::getHttpClient();
            $res = $client->post(self::PAYMENT_API_URL . '/v2/payment-requests', [
                'json'    => $payload,
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                    'Content-Type' => 'application/json',
                ],
            ]);

            $body = json_decode($res->getBody()->getContents(), true);

            if (($body['code'] ?? '') === '00') {
                $nap_tien->payos_payment_id = $body['data']['paymentLinkId'] ?? null;
                $nap_tien->save();

                return [
                    'status'       => true,
                    'checkout_url' => $body['data']['checkoutUrl'] ?? '',
                    'qr_code'      => $body['data']['qrCode'] ?? '',
                    'order_code'   => $orderCode,
                ];
            }

            Log::error("PayOS tạo link nạp tiền lỗi: " . json_encode($body));
            return ['status' => false, 'message' => $body['desc'] ?? 'Lỗi PayOS'];
        } catch (\Exception $e) {
            Log::error("PayOS exception Nạp tiền: " . $e->getMessage());
            return ['status' => false, 'message' => 'Lỗi kết nối PayOS: ' . $e->getMessage()];
        }
    }

    /**
     * Lấy thông tin link thanh toán từ PayOS
     */
    public static function layThongTinLink($orderCodeOrId): array
    {
        try {
            $client = self::getHttpClient();
            $res = $client->get(self::PAYMENT_API_URL . "/v2/payment-requests/{$orderCodeOrId}", [
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                ],
            ]);
            $body = json_decode($res->getBody()->getContents(), true);
            return ['status' => ($body['code'] ?? '') === '00', 'data' => $body['data'] ?? []];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Huỷ link thanh toán PayOS
     */
    public static function huyLink(int $orderCode, string $reason = 'Huỷ bởi khách hàng'): array
    {
        try {
            $client = self::getHttpClient();
            $res = $client->post(self::PAYMENT_API_URL . "/v2/payment-requests/{$orderCode}/cancel", [
                'json'    => ['cancellationReason' => $reason],
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                ],
            ]);
            $body = json_decode($res->getBody()->getContents(), true);
            return ['status' => ($body['code'] ?? '') === '00', 'data' => $body['data'] ?? []];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Xác minh chữ ký Webhook từ PayOS
     * Dùng để đảm bảo webhook là từ PayOS gửi đến
     */
    public static function xacMinhWebhook(array $webhookData): bool
    {
        try {
            $payos = new \PayOS\PayOS(self::clientId(), self::apiKey(), self::checksumKey());
            // SDK sẽ tự throw Exception nếu signature sai hoặc thiếu data
            $payos->verifyPaymentWebhookData($webhookData);
            return true;
        } catch (\Exception $e) {
            Log::error('PayOS Webhook Verify Lỗi: ' . $e->getMessage());
            return false;
        }
    }

    public static function kiemTraKetNoiThanhToan(): array
    {
        try {
            $client = self::getHttpClient();
            // Test 1 ID không tồn tại (0)
            $res = $client->get(self::PAYMENT_API_URL . '/v2/payment-requests/0', [
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                ],
                'http_errors' => false,
            ]);
            $body = json_decode($res->getBody()->getContents(), true);
            $code = $body['code'] ?? '';
            // Nếu trả về '101' (Payment not found) -> Khóa hợp lệ, kết nối OK
            // Nếu '214' hoặc khác -> Khóa sai
            if ($code === '101') {
                return ['status' => true];
            }
            return ['status' => false, 'message' => $body['desc'] ?? 'Lỗi kết nối PayOS'];
        } catch (\Throwable $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Lấy lịch sử giao dịch từ PayOS (payment account)
     * Note: API V2 hiện tại không cỗ trợ /v2/payment-requests (GET List), nên hàm này trả về rỗng để giữ độ tương thích.
     */
    public static function lichSuGiaoDich(?string $cursor = null): array
    {
        return [
            'status' => true,
            'data'   => [],
        ];
    }

    // ══════════════════════════════════════════════════════════
    // PHẦN 2: CHUYỂN TIỀN TỰ ĐỘNG (Payout / Rút ví)
    // ══════════════════════════════════════════════════════════

    private static function initPayoutSDK(): \PayOS\PayOS
    {
        $guzzle = self::getHttpClient();
        $httpClient = new \PayOS\Core\HTTPClient($guzzle);

        return new \PayOS\PayOS(
            self::payoutClientId(),
            self::payoutApiKey(),
            self::payoutChecksumKey(),
            null, // partner code
            null, // baseURL
            null, // logger
            0,    // maxRetries = 0 để tránh SDK gửi lại lệnh thứ 2 bằng token cũ khi bị HTTP Timeout
            $httpClient // HTTP Client tùy chỉnh có IPv4
        );
    }

    /**
     * Tạo lệnh chi tự động (Payout) — gọi khi Admin duyệt rút tiền
     *
     * @param  WithdrawRequest $withdraw   Yêu cầu rút tiền
     * @param  BankAccountWallet $bank     Tài khoản ngân hàng đích
     * @return array ['status'=>bool, 'payout_id'=>string, 'state'=>string, 'message'=>string]
     */
    public static function taoPayout(WithdrawRequest $withdraw, BankAccountWallet $bank): array
    {
        try {
            $referenceId    = 'RUTVI-' . $withdraw->id . '-' . time();
            $amount         = intval($withdraw->so_tien_rut);
            $description    = mb_substr($withdraw->noi_dung_chuyen_khoan, 0, 50);
            $toBin          = self::layMaBinNganHang($bank->ten_ngan_hang);
            $toAccountNumber = $bank->so_tai_khoan;

            if (!$toBin) {
                return [
                    'status'  => false,
                    'message' => "Không tìm thấy mã BIN cho ngân hàng: {$bank->ten_ngan_hang}",
                ];
            }

            $payoutData = [
                'referenceId'     => $referenceId,
                'amount'          => $amount,
                'description'     => $description,
                'toBin'           => (string)$toBin,
                'toAccountNumber' => (string)$toAccountNumber,
                'category'        => ['salary'],
            ];

            $payos = self::initPayoutSDK();
            $response = $payos->payouts->create($payoutData);

            $stateValue = $response->approvalState ? $response->approvalState->value : 'PROCESSING';
            Log::info("✅ PayOS Payout: Rút tiền #{$withdraw->id} → ref={$referenceId} | state=" . $stateValue);

            return [
                'status'    => true,
                'payout_id' => $response->id ?? '',
                'state'     => $stateValue,
                'reference' => $referenceId,
                'message'   => 'Lệnh chi đã được gửi đến PayOS!',
            ];
        } catch (\Throwable $e) {
            Log::error("PayOS Payout exception: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            return ['status' => false, 'message' => 'Lỗi kết nối PayOS Payout: ' . $e->getMessage()];
        }
    }

    /**
     * Tạo lệnh chi hoàn tiền (Payout) dành riêng cho hoàn tiền đơn hàng bị hủy.
     * Không yêu cầu WithdrawRequest model — nhận dữ liệu thô trực tiếp.
     *
     * @param  int                $orderId     ID đơn hàng (dùng cho referenceId)
     * @param  int                $amount      Số tiền hoàn (VND)
     * @param  string             $description Nội dung chuyển khoản (max 50 ký tự)
     * @param  BankAccountWallet  $bank        Tài khoản NH đích
     * @return array ['status'=>bool, 'payout_id'=>string, 'state'=>string, 'message'=>string]
     */
    public static function taoPayoutRefund(int $orderId, int $amount, string $description, BankAccountWallet $bank): array
    {
        try {
            $referenceId     = 'HOANDON-' . $orderId . '-' . time();
            $description     = mb_substr($description, 0, 25); // PayOS max 25 ký tự
            $toBin           = self::layMaBinNganHang($bank->ten_ngan_hang);
            $toAccountNumber = $bank->so_tai_khoan;

            if (!$toBin) {
                return [
                    'status'  => false,
                    'message' => "Không tìm thấy mã BIN cho ngân hàng: {$bank->ten_ngan_hang}",
                ];
            }

            $payoutData = [
                'referenceId'     => $referenceId,
                'amount'          => $amount,
                'description'     => $description,
                'toBin'           => (string)$toBin,
                'toAccountNumber' => (string)$toAccountNumber,
                'category'        => ['salary'],
            ];

            $payos    = self::initPayoutSDK();
            $response = $payos->payouts->create($payoutData);

            $stateValue = $response->approvalState ? $response->approvalState->value : 'PROCESSING';
            Log::info("✅ PayOS Payout Refund: Hoàn tiền đơn #{$orderId} → ref={$referenceId} | state=" . $stateValue);

            return [
                'status'    => true,
                'payout_id' => $response->id ?? '',
                'state'     => $stateValue,
                'reference' => $referenceId,
                'message'   => 'Lệnh hoàn tiền đã được gửi đến PayOS!',
            ];
        } catch (\Throwable $e) {
            Log::error("PayOS Payout Refund exception: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            return ['status' => false, 'message' => 'Lỗi kết nối PayOS Payout: ' . $e->getMessage()];
        }
    }

    /**
     * Lấy thông tin lệnh chi theo ID
     */
    public static function layThongTinPayout(string $payoutId): array
    {
        try {
            $payos = self::initPayoutSDK();
            $response = $payos->payouts->get($payoutId);
            return ['status' => true, 'data' => method_exists($response, 'toArray') ? $response->toArray() : (array)$response];
        } catch (\Throwable $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Lấy danh sách lệnh chi
     */
    public static function danhSachPayout(array $params = []): array
    {
        try {
            $payos = self::initPayoutSDK();
            $response = $payos->payouts->list($params);
            return [
                'status' => true,
                'data'   => method_exists($response, 'toArray') ? $response->toArray() : (array)$response,
            ];
        } catch (\Throwable $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Lấy số dư tài khoản payout
     */
    public static function soDuPayout(): array
    {
        try {
            $payos = self::initPayoutSDK();
            $response = $payos->payoutsAccount->balance();

            return [
                'status'  => true,
                'balance' => $response->balance ?? 0,
                'data'    => method_exists($response, 'toArray') ? $response->toArray() : (array)$response,
            ];
        } catch (\Throwable $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }


    // ══════════════════════════════════════════════════════════
    // PHẦN 3: XỬ LÝ WEBHOOK
    // ══════════════════════════════════════════════════════════

    /**
     * Xử lý dữ liệu webhook thanh toán từ PayOS
     * Khi khách hàng thanh toán thành công → cập nhật trạng thái đơn hàng
     */
    public static function xuLyWebhookThanhToan(array $webhookData): array
    {
        $data      = $webhookData['data'] ?? [];
        $orderCode = intval($data['orderCode'] ?? 0);
        $so_tien   = floatval($data['amount'] ?? 0);
        $refNo     = $data['reference'] ?? ($data['paymentLinkId'] ?? '');
        $code      = $webhookData['code'] ?? '';

        // Tự động kiểm tra chéo (Server-to-Server) với PayOS API cho TẤT CẢ giao dịch!
        // Tránh hoàn toàn lỗi rớt chữ ký webhook do thao tác encode/decode JSON.
        $isVerified = false;

        try {
            $thong_tin = self::layThongTinLink($orderCode);
            if ($thong_tin['status'] && ($thong_tin['data']['status'] ?? '') === 'PAID') {
                $isVerified = true;
            }
        } catch (\Exception $e) {
            Log::error("PayOS S2S Verify Lỗi: " . $e->getMessage());
        }

        // Xác minh chữ ký nếu S2S chưa verify (ví dụ đơn hàng thực phẩm)
        if (!$isVerified) {
            if (!self::xacMinhWebhook($webhookData)) {
                Log::warning('PayOS Webhook: Chữ ký không hợp lệ');
                return ['status' => false, 'message' => 'Invalid signature'];
            }
        }

        // Chỉ xử lý khi thanh toán thành công (code = 00, PAID)
        if ($code !== '00') {
            Log::info("PayOS Webhook: Trạng thái không phải thành công (code={$code})");
            return ['status' => true, 'message' => 'Ignored non-success event'];
        }

        // Bỏ qua nếu đã xử lý rồi
        if (GiaoDich::where('refNo', $refNo)->exists()) {
            return ['status' => true, 'message' => 'Already processed'];
        }

        // --- Kiểm tra nếu là Nạp tiền ví Shipper ---
        // Sơ đồ mới: Tìm bản ghi có payos_payment_id khớp với linkId gửi về từ PayOS
        $napTienResult = \App\Models\NapTienRequest::where('payos_payment_id', $refNo)
            ->orWhere('payos_payment_id', $data['paymentLinkId'] ?? '')
            ->first();

        // Nếu không tìm thấy qua LinkId, thử tìm ID đơn bình thường qua orderCode (fallback)
        if (!$napTienResult) {
             $id_nap = $orderCode - 2000000000;
             if ($id_nap > 0) $napTienResult = \App\Models\NapTienRequest::find($id_nap);
        }

        if ($napTienResult) {
            if ($napTienResult->trang_thai === 'cho_thanh_toan') {
                DB::beginTransaction();
                try {
                    $napTienResult->trang_thai = 'thanh_cong';
                    $napTienResult->save();

                    // Nạp tiền vào ví
                    $mo_ta = "PayOS Nạp ví | Ref: {$refNo} | " . ($data['description'] ?? '');
                    \App\Services\WalletService::nopTienVaoVi($napTienResult->id_shipper, $so_tien, $mo_ta);

                    // Lưu GiaoDich
                    GiaoDich::create([
                        'refNo'           => $refNo ?: ('PAYOS-NOP-' . $orderCode . '-' . time()),
                        'creditAmount'    => $so_tien,
                        'description'     => $mo_ta,
                        'transactionDate' => now()->format('d/m/Y H:i:s'),
                        'code'            => "NOPVI{$napTienResult->id_shipper}",
                        'loai'            => 'nop_vi_shipper',
                        'id_lien_quan'    => $napTienResult->id_shipper,
                    ]);

                    DB::commit();
                    Log::info("✅ PayOS Webhook: Nạp tiền ví Shipper #{$napTienResult->id_shipper} thành công | {$so_tien}đ (Req #{$napTienResult->id})");
                    return ['status' => true, 'message' => 'Xử lý nạp tiền thành công'];
                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error("PayOS Webhook lỗi xử lý nạp tiền #{$napTienResult->id}: " . $e->getMessage());
                    return ['status' => false, 'message' => 'Lỗi xử lý nạp tiền: ' . $e->getMessage()];
                }
            }
            return ['status' => true, 'message' => 'NapTienRequest already processed'];
        }

        // --- Xử lý thanh toán Đơn hàng ---
        $don_hang = DonHang::where('id', $orderCode)
            ->where('is_thanh_toan', DonHang::CHUA_THANH_TOAN)
            ->first();

        // Fallback: tìm theo payos_payment_link_id khi orderCode là retry code
        if (!$don_hang) {
            $paymentLinkId = $data['paymentLinkId'] ?? '';
            if ($paymentLinkId) {
                $don_hang = DonHang::where('payos_payment_link_id', $paymentLinkId)
                    ->where('is_thanh_toan', DonHang::CHUA_THANH_TOAN)
                    ->first();
                if ($don_hang) {
                    Log::info("PayOS Webhook: Tìm thấy đơn qua paymentLinkId={$paymentLinkId}");
                }
            }
        }

        // Lưu giao dịch PayOS
        GiaoDich::create([
            'refNo'           => $refNo ?: ('PAYOS-' . $orderCode . '-' . time()),
            'creditAmount'    => $so_tien,
            'description'     => "PayOS | Đơn #{$orderCode} | " . ($data['description'] ?? ''),
            'transactionDate' => now()->format('d/m/Y H:i:s'),
            'code'            => "DZ{$orderCode}",
            'loai'            => 'payos_don_hang',
            'id_lien_quan'    => $orderCode,
        ]);

        if ($don_hang) {
            DB::beginTransaction();
            try {
                $don_hang->is_thanh_toan  = 1;
                $don_hang->so_tien_nhan   = $so_tien;
                $don_hang->phuong_thuc_thanh_toan = 3; // Chốt phương thức thành PayOS
                $don_hang->save();

                // Gửi email xác nhận
                $khach_hang = KhachHang::find($don_hang->id_khach_hang);
                if ($khach_hang) {
                    $mail_data = [
                        'ho_ten'      => $khach_hang->ho_va_ten,
                        'tong_tien'   => $don_hang->tong_tien,
                        'ma_don_hang' => $don_hang->ma_don_hang,
                    ];
                    SendMailJob::dispatch($khach_hang->email, 'Thanh toán thành công', 'dat_hang_thanh_cong', $mail_data);
                }

                // Phát Event Đơn Hàng Đã Thanh Toán để đồng bộ trạng thái Real-time cho Shipper
                try {
                    event(new \App\Events\DonHangDaThanhToanEvent($don_hang));
                } catch (\Exception $e) {
                    Log::error('Lỗi khi phát sự kiện DonHangDaThanhToanEvent trong PayOS: ' . $e->getMessage());
                }

                DB::commit();
                Log::info("✅ PayOS Webhook: Thanh toán đơn #{$orderCode} thành công | {$so_tien}đ");
                return ['status' => true, 'message' => 'Xử lý đơn hàng thành công'];
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("PayOS Webhook lỗi xử lý đơn #{$orderCode}: " . $e->getMessage());
                return ['status' => false, 'message' => 'Lỗi xử lý: ' . $e->getMessage()];
            }
        }

        Log::warning("PayOS Webhook: Không tìm thấy đơn hàng #{$orderCode} chưa thanh toán");
        return ['status' => true, 'message' => 'Order not found or already paid'];
    }

    // ══════════════════════════════════════════════════════════
    // HELPER: Mã BIN ngân hàng Việt Nam
    // ══════════════════════════════════════════════════════════

    /**
     * Tra cứu mã BIN ngân hàng từ tên ngân hàng
     * Danh sách đầy đủ: https://api.payos.vn/v2/bank
     */
    public static function layMaBinNganHang(string $tenNganHang): ?string
    {
        $tenChuanHoa = strtolower(trim($tenNganHang));

        $banks = [
            // Ngân hàng lớn
            'vietcombank'     => '970436',
            'vcb'             => '970436',
            'bidv'            => '970418',
            'vietinbank'      => '970415',
            'ctg'             => '970415',
            'agribank'        => '970405',
            'agr'             => '970405',
            'techcombank'     => '970407',
            'tcb'             => '970407',
            'mbbank'          => '970422',
            'mb'              => '970422',
            'mbb'             => '970422',
            'vpbank'          => '970432',
            'vpb'             => '970432',
            'hdbank'          => '970437',
            'hdb'             => '970437',
            'sacombank'       => '970403',
            'stb'             => '970403',
            'acb'             => '970416',
            'tpbank'          => '970423',
            'tpb'             => '970423',
            'ocb'             => '970448',
            'vib'             => '970441',
            'msb'             => '970426',
            'maritime'        => '970426',
            'shb'             => '970443',
            'seabank'         => '970440',
            'eximbank'        => '970431',
            'exim'            => '970431',
            'lienvietpostbank' => '970449',
            'lpb'             => '970449',
            'nationalcitizen' => '970434',
            'ncb'             => '970434',
            'pvcombank'       => '970412',
            'abbank'          => '970425',
            'vietbank'        => '970433',
            'pgbank'          => '970430',
            'namabank'        => '970428',
            'baovietbank'     => '970438',
            'cbbank'          => '970444',
            'kienlongbank'    => '970452',
            'klb'             => '970452',
            'bacabank'        => '970409',
            'baca'            => '970409',
            'dongabank'       => '970406',
            'dab'             => '970406',
            'saigonbank'      => '970400',
            'vietcapitalbank' => '970454',
            'gpbank'          => '970408',
            'oceanbank'       => '970414',
            'publicbank'      => '970439',
            'indovinabank'    => '970421',
            'ivb'             => '970421',
            'shinhanbank'     => '970424',
            'uob'             => '970458',
            'hsbc'            => '458761',
            'standardchartered' => '970410',
            'citibank'        => '533948',
            'wooribank'       => '970427',
            'vrb'             => '970421',
        ];

        // Tìm khớp
        foreach ($banks as $key => $bin) {
            if (str_contains($tenChuanHoa, $key)) {
                return $bin;
            }
        }

        return null;
    }

    /**
     * Lấy danh sách ngân hàng từ PayOS API
     */
    public static function danhSachNganHang(): array
    {
        try {
            $client = self::getHttpClient();
            $res = $client->get(self::PAYMENT_API_URL . '/v2/bank', [
                'headers' => [
                    'x-client-id' => self::clientId(),
                    'x-api-key'   => self::apiKey(),
                ],
            ]);
            $body = json_decode($res->getBody()->getContents(), true);
            return [
                'status' => ($body['code'] ?? '') === '00',
                'data'   => $body['data'] ?? [],
            ];
        } catch (\Exception $e) {
            return ['status' => false, 'message' => $e->getMessage()];
        }
    }
}
