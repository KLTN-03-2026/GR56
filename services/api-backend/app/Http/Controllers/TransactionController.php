<?php

namespace App\Http\Controllers;

use App\Jobs\SendMailJob;
use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\GiaoDich;
use App\Models\KhachHang;
use App\Models\Shipper;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller xử lý giao dịch MB Bank
 *
 * Pattern mã giao dịch:
 *   DZ{id_don_hang}     → Thanh toán chuyển khoản đơn hàng (khách hàng)
 *   NOPVI{id_shipper}   → Shipper nộp tiền vào ví
 */
class TransactionController extends Controller
{
    // Tài khoản MB Bank của hệ thống
    const MB_USERNAME   = '0394425076';
    const MB_PASSWORD   = 'Nhan130504@@@@@';
    const MB_NUMBER     = '0394425076';
    // TODO: Cập nhật URL đúng khi API MB Bank hoạt động trở lại
    const MB_API_URL    = 'https://api-mb.midstack.io.vn/api/transactions';

    /**
     * Lấy giao dịch từ MB Bank và xử lý tự động
     * GET /api/transaction/sync
     * Có thể gọi qua cron job hoặc thủ công
     */
    public function syncTransactions(Request $request)
    {
        // Lấy giao dịch trong khoảng ngày (mặc định hôm nay)
        $day_begin = $request->get('day_begin', now()->format('d/m/Y'));
        $day_end   = $request->get('day_end',   now()->format('d/m/Y'));

        try {
            $client = new \GuzzleHttp\Client(['timeout' => 15]);
            $res = $client->post(self::MB_API_URL, [
                'json' => [
                    'USERNAME'  => self::MB_USERNAME,
                    'PASSWORD'  => self::MB_PASSWORD,
                    'DAY_BEGIN' => $day_begin,
                    'DAY_END'   => $day_end,
                    'NUMBER_MB' => self::MB_NUMBER,
                ]
            ]);

            $data = json_decode($res->getBody()->getContents(), true);
            $transactions = $data['data']['transactionHistoryList'] ?? [];

            $processed = 0;
            $skipped   = 0;

            foreach ($transactions as $item) {
                if (floatval($item['creditAmount']) <= 0) continue;

                // Bỏ qua nếu đã xử lý
                if (GiaoDich::where('refNo', $item['refNo'])->exists()) {
                    $skipped++;
                    continue;
                }

                $description = $item['description'] ?? '';
                $so_tien     = floatval($item['creditAmount']);

                // ===== PHÂN LOẠI GIAO DỊCH =====
                if (preg_match('/NOPVI(\d+)/i', $description, $matches)) {
                    // Nộp tiền vào ví shipper
                    $id_shipper = intval($matches[1]);
                    $this->xuLyNopViShipper($item, $id_shipper, $so_tien);
                    $processed++;
                } elseif (preg_match('/DZ(\d+)/i', $description, $matches)) {
                    // Thanh toán đơn hàng khách hàng
                    $id_don_hang = intval($matches[1]);
                    $this->xuLyThanhToanDonHang($item, $id_don_hang, $so_tien);
                    $processed++;
                } else {
                    // Giao dịch không nhận dạng được — lưu lại để tra cứu
                    GiaoDich::create([
                        'refNo'           => $item['refNo'],
                        'creditAmount'    => $item['creditAmount'],
                        'description'     => $description,
                        'transactionDate' => $item['transactionDate'],
                        'code'            => null,
                        'loai'            => 'khong_xac_dinh',
                        'id_lien_quan'    => null,
                    ]);
                    $skipped++;
                }
            }

            return response()->json([
                'status'    => true,
                'message'   => "Đồng bộ hoàn tất: {$processed} xử lý, {$skipped} bỏ qua",
                'processed' => $processed,
                'skipped'   => $skipped,
                'total'     => count($transactions),
            ]);
        } catch (\Exception $e) {
            Log::error('Lỗi sync giao dịch MB: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Lỗi kết nối MB Bank: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xử lý nộp tiền vào ví shipper
     */
    private function xuLyNopViShipper(array $item, int $id_shipper, float $so_tien): void
    {
        $shipper = Shipper::find($id_shipper);
        if (!$shipper) {
            Log::warning("NOPVI: Không tìm thấy shipper #{$id_shipper}");
            GiaoDich::create([
                'refNo'           => $item['refNo'],
                'creditAmount'    => $item['creditAmount'],
                'description'     => $item['description'],
                'transactionDate' => $item['transactionDate'],
                'code'            => "NOPVI{$id_shipper}",
                'loai'            => 'nop_vi_shipper',
                'id_lien_quan'    => $id_shipper,
            ]);
            return;
        }

        // Nộp tiền vào ví
        WalletService::nopTienVaoVi(
            $id_shipper,
            $so_tien,
            "Nộp tiền qua MB Bank | Ref: {$item['refNo']} | {$item['transactionDate']}"
        );

        // Lưu giao dịch
        GiaoDich::create([
            'refNo'           => $item['refNo'],
            'creditAmount'    => $item['creditAmount'],
            'description'     => $item['description'],
            'transactionDate' => $item['transactionDate'],
            'code'            => "NOPVI{$id_shipper}",
            'loai'            => 'nop_vi_shipper',
            'id_lien_quan'    => $id_shipper,
        ]);

        Log::info("✅ Nộp ví shipper #{$id_shipper} ({$shipper->ho_va_ten}): " . number_format($so_tien) . "đ | Ref: {$item['refNo']}");
    }

    /**
     * Xử lý thanh toán đơn hàng khách hàng
     */
    private function xuLyThanhToanDonHang(array $item, int $id_don_hang, float $so_tien): void
    {
        $don_hang = DonHang::where('id', $id_don_hang)
            ->where('is_thanh_toan', DonHang::CHUA_THANH_TOAN)
            ->first();

        GiaoDich::create([
            'refNo'           => $item['refNo'],
            'creditAmount'    => $item['creditAmount'],
            'description'     => $item['description'],
            'transactionDate' => $item['transactionDate'],
            'code'            => "DZ{$id_don_hang}",
            'loai'            => 'don_hang',
            'id_lien_quan'    => $id_don_hang,
        ]);

        if ($don_hang) {
            $don_hang->is_thanh_toan = 1;
            $don_hang->so_tien_nhan  = $so_tien;
            $don_hang->save();

            // Gửi email xác nhận cho khách hàng
            $khach_hang = KhachHang::find($don_hang->id_khach_hang);
            if ($khach_hang) {
                $mail_data = [
                    'ho_ten'     => $khach_hang->ho_va_ten,
                    'tong_tien'  => $don_hang->tong_tien,
                    'ma_don_hang' => $don_hang->ma_don_hang,
                ];
                SendMailJob::dispatch($khach_hang->email, 'Thanh toán hoàn tất', 'dat_hang_thanh_cong', $mail_data);
            }

            Log::info("✅ Thanh toán đơn #{$id_don_hang}: " . number_format($so_tien) . "đ | Ref: {$item['refNo']}");
        }
    }

    /**
     * Xem lịch sử giao dịch MB đã xử lý
     * GET /api/admin/transaction/lich-su
     */
    public function lichSuGiaoDich(Request $request)
    {
        $query = GiaoDich::orderByDesc('created_at');

        if ($request->loai) {
            $query->where('loai', $request->loai);
        }

        $data = $query->limit(100)->get();

        return response()->json(['status' => true, 'data' => $data]);
    }

    /**
     * Lấy thông tin QR code nộp tiền cho shipper
     * GET /api/shipper/wallet/qr-nop-tien
     */
    public function qrNopTien(Request $request)
    {
        $user = \Illuminate\Support\Facades\Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Vui lòng đăng nhập'], 401);
        }

        $so_tien    = $request->get('so_tien', 0);
        $noi_dung   = "NOPVI{$user->id}";
        $so_tai_khoan = self::MB_NUMBER;
        $ten_ngan_hang = 'MBBank';

        $qr_url = "https://img.vietqr.io/image/{$ten_ngan_hang}-{$so_tai_khoan}-qr_only.png"
            . "?amount={$so_tien}&addInfo=" . urlencode($noi_dung);

        return response()->json([
            'status'        => true,
            'qr_url'        => $qr_url,
            'so_tai_khoan'  => $so_tai_khoan,
            'ten_ngan_hang' => $ten_ngan_hang,
            'chu_tai_khoan' => 'NGUYEN VAN NHAN',
            'noi_dung'      => $noi_dung,
            'so_tien'       => $so_tien,
            'huong_dan'     => "Chuyển khoản với nội dung chính xác: <b>{$noi_dung}</b> để hệ thống tự động nạp tiền vào ví.",
        ]);
    }
}
