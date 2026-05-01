<?php

namespace App\Http\Controllers;

use App\Models\BankAccountWallet;
use App\Models\DonHang;
use App\Models\Shipper;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    /** Admin: Xem tổng quan tất cả ví */
    public function adminOverview()
    {
        $wallets = Wallet::all()->map(function ($w) {
            if ($w->loai_vi === 'quan_an') {
                $chu = \App\Models\QuanAn::find($w->id_chu_vi);
                $w->ten_chu = $chu ? $chu->ten_quan_an : 'Không tìm thấy';
            } else {
                $chu = \App\Models\Shipper::find($w->id_chu_vi);
                $w->ten_chu = $chu ? $chu->ho_va_ten : 'Không tìm thấy';
            }
            return $w;
        });
        return response()->json([
            'status' => true, 'data' => $wallets
        ]);
    }

    /** Admin: Xem lịch sử đối soát */
    public function donHangDoiSoat()
    {
        $data = DonHang::where('da_doi_soat', true)
            ->orderByDesc('thoi_gian_doi_soat')
            ->get([
                'id',
                'ma_don_hang',
                'id_quan_an',
                'id_shipper',
                'tien_hang',
                'phi_ship',
                'tong_tien',
                'chiet_khau_phan_tram',
                'tien_chiet_khau',
                'tien_quan_an',
                'tien_shipper',
                'thoi_gian_doi_soat'
            ]);
        return response()->json(['status' => true, 'data' => $data]);
    }

    /** Admin: Đối soát thủ công 1 đơn */
    public function doiSoatManual(Request $request)
    {
        $don_hang = DonHang::find($request->id_don_hang);
        if (!$don_hang)       return response()->json(['status' => false, 'message' => 'Không tìm thấy đơn hàng']);
        if ($don_hang->da_doi_soat) return response()->json(['status' => false, 'message' => 'Đơn hàng đã được đối soát rồi']);
        if (!$don_hang->is_thanh_toan) return response()->json(['status' => false, 'message' => 'Đơn hàng chưa được thanh toán']);

        $result = WalletService::doiSoatDonHang($don_hang);
        return response()->json([
            'status' => $result, 'message' => $result ? 'Đối soát thành công!' : 'Đối soát thất bại'
        ]);
    }

    /** Xem ví + lịch sử giao dịch */
    public function chiTiet(Request $request)
    {
        $wallet = Wallet::firstOrCreate(
            ['loai_vi' => $request->loai_vi, 'id_chu_vi' => $request->id_chu_vi],
            ['so_du' => 0, 'tong_tien_nhan' => 0, 'tong_tien_rut' => 0]
        );
        $transactions = $wallet->transactions()->orderByDesc('id')->get();

        if ($wallet->loai_vi === 'quan_an') {
            $chu = \App\Models\QuanAn::find($wallet->id_chu_vi);
            $wallet->ten_chu = $chu ? $chu->ten_quan_an : null;
        } else {
            $chu = Shipper::find($wallet->id_chu_vi);
            $wallet->ten_chu = $chu ? $chu->ho_va_ten : null;
        }

        return response()->json([
            'status' => true, 'data' => ['vi' => $wallet, 'giao_dich' => $transactions]
        ]);
    }

    /**
     * Admin: Nộp tiền mặt vào ví shipper (admin xác nhận sau khi nhận tiền mặt)
     * POST /admin/wallet/nop-tien-shipper
     */
    public function adminNopTienChoShipper(Request $request)
    {
        $request->validate([
            'id_shipper' => 'required|exists:shippers,id',
            'so_tien'    => 'required|numeric|min:1000',
            'ghi_chu'    => 'nullable|string|max:255',
        ]);

        $shipper = Shipper::find($request->id_shipper);
        $mo_ta = $request->ghi_chu
            ? "Admin nộp tiền: {$request->ghi_chu}"
            : "Admin xác nhận nộp tiền mặt - Shipper: {$shipper->ho_va_ten}";

        $result = WalletService::nopTienVaoVi($request->id_shipper, floatval($request->so_tien), $mo_ta);

        if ($result['ok']) {
            return response()->json([
                'status'  => true,
                'message' => 'Đã nộp ' . number_format($request->so_tien, 0, ',', '.') . 'đ vào ví shipper ' . $shipper->ho_va_ten . ' thành công!',
                'wallet'  => $result['wallet'],
            ]);
        }
        return response()->json([
            'status' => false, 'message' => $result['message']
        ]);
    }

    /**
     * Admin: Danh sách ví shipper + số dư
     * GET /admin/wallet/danh-sach-shipper
     */
    public function danhSachViShipper()
    {
        $data = Shipper::leftJoin('wallets', function ($join) {
            $join->on('wallets.id_chu_vi', '=', 'shippers.id')
                ->where('wallets.loai_vi', '=', 'shipper');
        })
            ->select(
                'shippers.id',
                'shippers.ho_va_ten',
                'shippers.so_dien_thoai',
                'shippers.is_active',
                DB::raw('COALESCE(wallets.id, NULL) as id_wallet'),
                DB::raw('COALESCE(wallets.so_du, 0) as so_du'),
                DB::raw('COALESCE(wallets.tong_tien_nhan, 0) as tong_tien_nhan'),
                DB::raw('COALESCE(wallets.tong_tien_rut, 0) as tong_tien_rut')
            )
            ->get();

        return response()->json([
            'status' => true, 'data' => $data
        ]);
    }

    /**
     * Admin: Lịch sử nạp tiền vào ví shipper (tự động via PayOS)
     * GET /admin/wallet/lich-su-nap-tien
     */
    public function lichSuNapTienShipper()
    {
        $data = \App\Models\NapTienRequest::with('shipper:id,ho_va_ten,so_dien_thoai')
            ->orderByDesc('id')
            ->get();
        return response()->json([
            'status' => true, 'data' => $data
        ]);
    }

    /**
     * Shipper: Yêu cầu nạp tiền vào ví tự động (Tạo PayOS Payment Link mới)
     * POST /api/wallet/tao-link-nap-tien
     */
    public function taoLinkNapTienShipper(Request $request)
    {
        $request->validate([
            'id_shipper' => 'required|exists:shippers,id',
            'so_tien'    => 'required|numeric|min:10000',
        ]);

        $napTien = \App\Models\NapTienRequest::create([
            'id_shipper' => $request->id_shipper,
            'so_tien'    => $request->so_tien,
            'trang_thai' => 'cho_thanh_toan',
        ]);

        $result = \App\Services\PayOSService::taoLinkNapTien($napTien);

        if ($result['status']) {
            return response()->json([
                'status' => true,
                'data'   => [
                    'checkoutUrl' => $result['checkout_url'],
                    'qrCode'      => $result['qr_code'],
                    'orderCode'   => $result['order_code'],
                ],
            ]);
        }

        return response()->json([
            'status' => false, 'message' => $result['message']
        ]);
    }

    /**
     * Frontend chủ động gọi lên kiểm tra S2S sau khi bị PayOS redirect về
     * POST /api/wallet/xac-nhan-nap-tien
     */
    public function xacNhanNapTienS2S(Request $request)
    {
        $orderCode = $request->orderCode;
        $orderCodeStr = (string)$orderCode;
        if (str_starts_with($orderCodeStr, '1') && strlen($orderCodeStr) === 10) {
            // New format: [1][8-digit ID][1-digit random]
            $id_nap = intval(substr($orderCodeStr, 1, 8));
        } else if (intval($orderCode) >= 2000000000) {
            // Old format fallback
            $id_nap = intval($orderCode) - 2000000000;
        } else {
            // Unexpected format
             return response()->json([
                'status' => false, 'message' => 'Mã đơn không hợp lệ'
            ]);
        }

        $napTien = \App\Models\NapTienRequest::find($id_nap);

        if (!$napTien) {
            return response()->json([
                'status' => false, 'message' => 'Không tìm thấy yêu cầu'
            ]);
        }

        // Nếu đã thanh công trước đó do Webhook, OK luôn
        if ($napTien->trang_thai === 'thanh_cong') {
            return response()->json([
                'status' => true, 'message' => 'Giao dịch đã được ghi nhận trước đó.'
            ]);
        }

        try {
            $thong_tin = \App\Services\PayOSService::layThongTinLink($orderCode);
            if ($thong_tin['status'] && ($thong_tin['data']['status'] ?? '') === 'PAID') {
                DB::beginTransaction();
                try {
                    // Update & cộng tiền
                    $napTien->trang_thai = 'thanh_cong';
                    $napTien->save();

                    // Lấy mã tham chiếu tuỳ theo cấu trúc thực tế API trả về (tránh undefined key)
                    $ref = $thong_tin['data']['transactions'][0]['reference'] ?? $thong_tin['data']['id'] ?? $orderCode;
                    $mo_ta = "PayOS Nạp ví (S2S) | Ref: {$ref}";
                    \App\Services\WalletService::nopTienVaoVi($napTien->id_shipper, $napTien->so_tien, $mo_ta);

                    \App\Models\GiaoDich::create([
                        'refNo'           => $ref,
                        'creditAmount'    => $napTien->so_tien,
                        'description'     => $mo_ta,
                        'transactionDate' => now()->format('d/m/Y H:i:s'),
                        'code'            => "NOPVI{$napTien->id_shipper}",
                        'loai'            => 'nop_vi_shipper',
                        'id_lien_quan'    => $napTien->id_shipper,
                    ]);

                    DB::commit();
                    return response()->json([
                        'status' => true, 'message' => 'Nạp tiền thành công!'
                    ]);
                } catch (\Exception $e) {
                    DB::rollBack();
                    return response()->json([
                        'status' => false, 'message' => 'Lỗi cộng tiền: ' . $e->getMessage()
                    ]);
                }
            } else {
                return response()->json([   
                    'status' => false, 'message' => 'Chưa thấy xác nhận thanh toán từ PayOS'
                ]);
            }
        } catch (\Exception $e) {
            return response()->json([
                'status' => false, 'message' => 'Lỗi kết nối PayOS S2S'
            ]);
        }
    }
}
