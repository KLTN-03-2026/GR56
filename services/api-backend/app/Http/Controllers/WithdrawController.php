<?php

namespace App\Http\Controllers;

use App\Models\BankAccountWallet;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use App\Services\PayOSService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class WithdrawController extends Controller
{
    /**
     * Admin: Lấy danh sách tất cả yêu cầu rút tiền
     * GET /admin/withdraw/data
     */
    public function adminData()
    {
        $data = WithdrawRequest::with(['wallet', 'bankAccount'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($req) {
                $wallet = $req->wallet;
                if ($wallet->loai_vi === 'quan_an') {
                    $chu = \App\Models\QuanAn::find($wallet->id_chu_vi);
                    $req->ten_chu = $chu ? $chu->ten_quan_an : '-';
                } else {
                    $chu = \App\Models\Shipper::find($wallet->id_chu_vi);
                    $req->ten_chu = $chu ? $chu->ho_va_ten : '-';
                }
                $req->loai_vi = $wallet->loai_vi;
                return $req;
            });

        return response()->json(['status' => true, 'data' => $data]);
    }

    /**
     * Admin: Xác nhận đã chuyển khoản (thay đổi trạng thái → 'da_chuyen')
     * POST /admin/withdraw/confirm-transfer
     * (Dùng khi chuyển thủ công hoặc xác nhận PayOS đã hoàn tất)
     */
    public function confirmTransfer(Request $request)
    {
        $withdraw = WithdrawRequest::find($request->id);
        if (!$withdraw) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy yêu cầu']);
        }

        $allowedStatuses = ['da_duyet', 'dang_chuyen'];
        if (!in_array($withdraw->trang_thai, $allowedStatuses)) {
            return response()->json(['status' => false, 'message' => 'Yêu cầu chưa được duyệt hoặc đã hoàn tất']);
        }

        // Nếu có payos_payout_id, kiểm tra trạng thái thực tế từ PayOS
        $payosState = null;
        if (!empty($withdraw->payos_payout_id)) {
            $checkResult = PayOSService::layThongTinPayout($withdraw->payos_payout_id);
            if ($checkResult['status']) {
                $payosState = $checkResult['data']['approvalState'] ?? null;
            }
        }

        $withdraw->trang_thai       = 'da_chuyen';
        $withdraw->thoi_gian_chuyen = now();
        $withdraw->ghi_chu_admin    = $request->ghi_chu ?? ('Xác nhận hoàn tất' . ($payosState ? " | PayOS: {$payosState}" : ''));
        if ($payosState) {
            $withdraw->payos_state = $payosState;
        }
        $withdraw->save();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xác nhận chuyển khoản thành công!',
            'payos_state' => $payosState,
        ]);
    }

    /**
     * Admin: Duyệt yêu cầu rút tiền (trừ số dư ví + tự động chuyển PayOS)
     * POST /admin/withdraw/approve
     */
    public function approve(Request $request)
    {
        $withdraw = WithdrawRequest::find($request->id);
        if (!$withdraw || $withdraw->trang_thai !== 'cho_duyet') {
            return response()->json(['status' => false, 'message' => 'Yêu cầu không hợp lệ']);
        }

        $wallet      = $withdraw->wallet;
        $bankAccount = $withdraw->bankAccount;

        // Trừ tiền khỏi ví
        $mo_ta = "Rút tiền về {$bankAccount->ten_ngan_hang} ****" . substr($bankAccount->so_tai_khoan, -4);
        $ok = WalletService::debitWallet($wallet, $withdraw->so_tien_rut, $mo_ta);
        if (!$ok) {
            return response()->json(['status' => false, 'message' => 'Số dư không đủ để rút']);
        }

        // ── Tự động chuyển tiền qua PayOS Payout ─────────────
        $payoutResult = PayOSService::taoPayout($withdraw, $bankAccount);

        if ($payoutResult['status']) {
            $isCompleted = in_array(strtoupper($payoutResult['state'] ?? ''), ['COMPLETED', 'SUCCESS']);
            // Cập nhật: đã duyệt + đã gửi lệnh chi PayOS
            $withdraw->trang_thai       = $isCompleted ? 'da_chuyen' : 'dang_chuyen';
            $withdraw->ghi_chu_admin    = $request->ghi_chu ?? 'Đã tự động chuyển qua PayOS';
            $withdraw->payos_payout_id  = $payoutResult['payout_id'] ?? null;
            $withdraw->payos_reference  = $payoutResult['reference'] ?? null;
            $withdraw->payos_state      = $payoutResult['state'] ?? 'PROCESSING';
            $withdraw->thoi_gian_chuyen = now();
            $withdraw->save();

            return response()->json([
                'status'      => true,
                'message'     => '✅ Đã duyệt và gửi lệnh chi tự động qua PayOS!',
                'payout_id'   => $payoutResult['payout_id'] ?? null,
                'payout_state'=> $payoutResult['state'] ?? 'PROCESSING',
            ]);
        }

        // PayOS lỗi → vẫn duyệt nhưng ghi nhận lỗi, tự chuyển thủ công
        $withdraw->trang_thai    = 'da_duyet';
        $withdraw->ghi_chu_admin = ($request->ghi_chu ?? '') . ' | PayOS lỗi: ' . ($payoutResult['message'] ?? '-');
        $withdraw->save();

        Log::error("PayOS Payout thất bại cho withdraw #{$withdraw->id}: " . ($payoutResult['message'] ?? 'Unknown'));

        return response()->json([
            'status'  => true,
            'message' => '⚠️ Đã duyệt ví. Tuy nhiên PayOS tự động chuyển thất bại — vui lòng chuyển khoản thủ công.',
            'payos_error' => $payoutResult['message'] ?? 'Lỗi không xác định',
        ]);
    }

    /**
     * Admin: Từ chối yêu cầu rút tiền
     * POST /admin/withdraw/reject
     */
    public function reject(Request $request)
    {
        $withdraw = WithdrawRequest::find($request->id);
        if (!$withdraw || $withdraw->trang_thai !== 'cho_duyet') {
            return response()->json(['status' => false, 'message' => 'Yêu cầu không hợp lệ']);
        }

        $withdraw->trang_thai    = 'tu_choi';
        $withdraw->ghi_chu_admin = $request->ghi_chu ?? 'Bị từ chối';
        $withdraw->save();

        return response()->json(['status' => true, 'message' => 'Đã từ chối yêu cầu rút tiền']);
    }

    // ─────────────────────────────────────────────────────────
    // API cho Quán Ăn / Shipper tự yêu cầu rút tiền
    // ─────────────────────────────────────────────────────────

    /**
     * Tạo yêu cầu rút tiền
     * POST /wallet/yeu-cau-rut-tien
     * Body: { loai_vi, id_chu_vi, id_bank_account, so_tien_rut }
     */
    public function createWithdrawRequest(Request $request)
    {
        $wallet = Wallet::where('loai_vi', $request->loai_vi)
            ->where('id_chu_vi', $request->id_chu_vi)
            ->first();

        if (!$wallet) {
            return response()->json([
                'status' => false, 
                'message' => 'Không tìm thấy ví']);
        }

        if ($wallet->so_du < $request->so_tien_rut) {
            return response()->json([
                'status' => false, 
                'message' => 'Số dư không đủ']);
        }

        if ($request->so_tien_rut < 10000) {
            return response()->json([
                'status' => false, 
                'message' => 'Số tiền rút tối thiểu là 10.000đ']);
        }

        // Kiểm tra có yêu cầu đang chờ không
        $pending = WithdrawRequest::where('id_wallet', $wallet->id)
            ->where('trang_thai', 'cho_duyet')
            ->exists();
        if ($pending) {
            return response()->json([
                'status' => false, 
                'message' => 'Bạn đang có yêu cầu rút tiền chưa được duyệt']);
        }

        // ── Generate nội dung chuyển khoản để đối chiếu
        // Format: RUTVI-{TYPE}{ID}-{YYYYMMDD}-{SEQ}
        // VD: RUTVI-SHP1-20260303-001 (Shipper ID=1)
        //     RUTVI-QA5-20260303-002  (Quán Ăn ID=5)
        $prefix      = $wallet->loai_vi === 'shipper' ? 'SHP' : 'QA';
        $ngay        = now()->format('Ymd');
        $seq         = str_pad(
            WithdrawRequest::whereDate('created_at', now()->toDateString())->count() + 1,
            3,
            '0',
            STR_PAD_LEFT
        );
        $noi_dung    = "RUTVI-{$prefix}{$wallet->id_chu_vi}-{$ngay}-{$seq}";

        $withdraw = WithdrawRequest::create([
            'id_wallet'             => $wallet->id,
            'id_bank_account'       => $request->id_bank_account,
            'so_tien_rut'           => $request->so_tien_rut,
            'noi_dung_chuyen_khoan' => $noi_dung,
            'trang_thai'            => 'cho_duyet',
        ]);

        $bankAccount = BankAccountWallet::find($request->id_bank_account);

        // Trừ tiền khỏi ví
        $mo_ta = "Rút tiền về {$bankAccount->ten_ngan_hang} ****" . substr($bankAccount->so_tai_khoan, -4);
        $ok = WalletService::debitWallet($wallet, $withdraw->so_tien_rut, $mo_ta);
        if (!$ok) {
            $withdraw->trang_thai = 'tu_choi';
            $withdraw->ghi_chu_admin = 'Hệ thống huỷ do số dư ví không đủ lúc xử lý';
            $withdraw->save();
            return response()->json([
                'status' => false, 
                'message' => 'Số dư không đủ để rút']);
        }

        // ── Tự động chuyển tiền qua PayOS Payout ─────────────
        $payoutResult = PayOSService::taoPayout($withdraw, $bankAccount);

        if ($payoutResult['status']) {
            $isCompleted = in_array(strtoupper($payoutResult['state'] ?? ''), ['COMPLETED', 'SUCCESS']);
            $withdraw->trang_thai       = $isCompleted ? 'da_chuyen' : 'dang_chuyen';
            $withdraw->ghi_chu_admin    = 'Hệ thống tự động duyệt và chuyển PayOS';
            $withdraw->payos_payout_id  = $payoutResult['payout_id'] ?? null;
            $withdraw->payos_reference  = $payoutResult['reference'] ?? null;
            $withdraw->payos_state      = $payoutResult['state'] ?? 'PROCESSING';
            $withdraw->thoi_gian_chuyen = now();
            $withdraw->save();

            return response()->json([
                'status'  => true,
                'message' => 'Rút tiền thành công! Ngân hàng đang xử lý chuyển khoản tự động.',
                'noi_dung_chuyen_khoan' => $noi_dung,
            ]);
        }

        // PayOS lỗi mạng hoặc sai thẻ → đẩy vào hàng đợi chuyển thủ công
        $withdraw->trang_thai    = 'da_duyet';
        $withdraw->ghi_chu_admin = 'Hệ thống tự động duyệt rớt mạng ngân hàng: ' . ($payoutResult['message'] ?? '-');
        $withdraw->save();

        return response()->json([
            'status'  => true, // Vẫn trả về true vì yêu cầu đã được lưu
            'message' => 'Đã gửi yêu cầu rút tiền! Chuyển khoản tự động bị trễ, admin sẽ hoàn tất chuyển tay.',
            'noi_dung_chuyen_khoan' => $noi_dung,
        ]);
    }

    /**
     * Lấy lịch sử rút tiền của 1 ví
     * GET /wallet/lich-su-rut?loai_vi=quan_an&id_chu_vi=5
     */
    public function lichSuRut(Request $request)
    {
        $wallet = Wallet::where('loai_vi', $request->loai_vi)
            ->where('id_chu_vi', $request->id_chu_vi)
            ->first();

        if (!$wallet) {
            return response()->json(['status' => true, 'data' => []]);
        }

        $data = WithdrawRequest::where('id_wallet', $wallet->id)
            ->with('bankAccount')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => true, 
            'data' => $data, 
            'vi' => $wallet]);
    }

    // ─── Bank Accounts ───

    /**
     * Thêm tài khoản ngân hàng
     * POST /wallet/them-tai-khoan
     */
    public function addBankAccount(Request $request)
    {
        // Nếu đặt làm mặc định, reset các account khác
        if ($request->is_default) {
            BankAccountWallet::where('loai_chu', $request->loai_chu)
                ->where('id_chu', $request->id_chu)
                ->update(['is_default' => false]);
        }

        $bank = BankAccountWallet::create([
            'loai_chu'      => $request->loai_chu,
            'id_chu'        => $request->id_chu,
            'ten_ngan_hang' => $request->ten_ngan_hang,
            'so_tai_khoan'  => $request->so_tai_khoan,
            'chu_tai_khoan' => $request->chu_tai_khoan,
            'chi_nhanh'     => $request->chi_nhanh,
            'is_default'    => $request->is_default ?? false,
        ]);

        return response()->json([
            'status' => true, 
            'message' => 'Thêm tài khoản thành công!', 
            'data' => $bank]);
    }

    /**
     * Lấy danh sách tài khoản ngân hàng
     * GET /wallet/tai-khoan?loai_chu=quan_an&id_chu=5
     */
    public function bankAccounts(Request $request)
    {
        $data = BankAccountWallet::where('loai_chu', $request->loai_chu)
            ->where('id_chu', $request->id_chu)
            ->get();

        return response()->json([
            'status' => true, 
            'data' => $data]);
    }

    /**
     * Xóa tài khoản ngân hàng
     * POST /wallet/xoa-tai-khoan
     */
    public function deleteBankAccount(Request $request)
    {
        BankAccountWallet::where('id', $request->id)->delete();
        return response()->json([
            'status' => true, 
            'message' => 'Đã xóa tài khoản']);
    }
}
