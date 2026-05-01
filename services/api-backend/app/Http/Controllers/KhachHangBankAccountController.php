<?php

namespace App\Http\Controllers;

use App\Models\BankAccountWallet;
use App\Models\CauHinh;
use App\Models\DonHang;
use App\Jobs\RefundPayOSJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Controller quản lý tài khoản ngân hàng hoàn tiền của khách hàng.
 * Tách riêng để không ảnh hưởng code cũ trong KhachHangController.
 */
class KhachHangBankAccountController extends Controller
{
    // ─── Lấy danh sách tài khoản NH ──────────────────────────────
    public function index()
    {
        $user = Auth::guard('sanctum')->user();
        $banks = BankAccountWallet::where('loai_chu', 'khach_hang')
            ->where('id_chu', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return response()->json(['status' => true, 'data' => $banks]);
    }

    // ─── Thêm tài khoản NH mới ───────────────────────────────────
    public function store(Request $request)
    {
        $user = Auth::guard('sanctum')->user();

        $request->validate([
            'ten_ngan_hang' => 'required|string|max:100',
            'so_tai_khoan'  => 'required|string|max:50',
            'chu_tai_khoan' => 'required|string|max:100',
            'chi_nhanh'     => 'nullable|string|max:100',
        ]);

        // Giới hạn 5 tài khoản
        $count = BankAccountWallet::where('loai_chu', 'khach_hang')
            ->where('id_chu', $user->id)
            ->count();

        if ($count >= 5) {
            return response()->json(['status' => false, 'message' => 'Bạn chỉ được lưu tối đa 5 tài khoản ngân hàng.'], 422);
        }

        // Nếu là tài khoản đầu tiên → tự động đặt làm mặc định
        $isDefault = ($count === 0) ? 1 : 0;

        $bank = BankAccountWallet::create([
            'loai_chu'      => 'khach_hang',
            'id_chu'        => $user->id,
            'ten_ngan_hang' => $request->ten_ngan_hang,
            'so_tai_khoan'  => $request->so_tai_khoan,
            'chu_tai_khoan' => strtoupper($request->chu_tai_khoan),
            'chi_nhanh'     => $request->chi_nhanh,
            'is_default'    => $isDefault,
        ]);

        return response()->json(['status' => true, 'message' => 'Thêm tài khoản ngân hàng thành công!', 'data' => $bank], 201);
    }

    // ─── Xóa tài khoản NH ────────────────────────────────────────
    public function destroy(int $id)
    {
        $user = Auth::guard('sanctum')->user();

        $bank = BankAccountWallet::where('id', $id)
            ->where('loai_chu', 'khach_hang')
            ->where('id_chu', $user->id)
            ->first();

        if (!$bank) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy tài khoản.'], 404);
        }

        $wasDefault = $bank->is_default;
        $bank->delete();

        // Nếu xóa tài khoản mặc định → đặt tài khoản còn lại đầu tiên làm mặc định
        if ($wasDefault) {
            $next = BankAccountWallet::where('loai_chu', 'khach_hang')
                ->where('id_chu', $user->id)
                ->first();
            if ($next) {
                $next->update(['is_default' => 1]);
            }
        }

        return response()->json(['status' => true, 'message' => 'Đã xóa tài khoản ngân hàng.']);
    }

    // ─── Đặt làm tài khoản mặc định ─────────────────────────────
    public function setDefault(int $id)
    {
        $user = Auth::guard('sanctum')->user();

        $bank = BankAccountWallet::where('id', $id)
            ->where('loai_chu', 'khach_hang')
            ->where('id_chu', $user->id)
            ->first();

        if (!$bank) {
            return response()->json([
                'status' => false, 
                'message' => 'Không tìm thấy tài khoản.'
            ], 404);
        }

        // Bỏ mặc định tất cả → đặt lại cho tài khoản được chọn
        BankAccountWallet::where('loai_chu', 'khach_hang')
            ->where('id_chu', $user->id)
            ->update([
                'is_default' => 0
            ]);

        $bank->update([
            'is_default' => 1
        ]);

        return response()->json([
            'status' => true, 
            'message' => 'Đã đặt làm tài khoản mặc định.'
        ]);
    }

    // ─── Admin xem lịch sử hoàn tiền đơn hàng ────────────────────
    public function adminRefundStatus(Request $request)
    {
        $query = DonHang::where('is_thanh_toan', 1)
            ->where('phuong_thuc_thanh_toan', 3)
            ->where('tinh_trang', 5) // Chỉ đơn đã hủy
            ->with(['khachHang:id,ho_va_ten,so_dien_thoai,email']);

        // Lọc theo trạng thái hoàn tiền
        if ($request->refund_status && $request->refund_status !== 'all') {
            if ($request->refund_status === 'chua_hoan') {
                $query->whereNull('refund_status');
            } else {
                $query->where('refund_status', $request->refund_status);
            }
        }

        // Tìm kiếm theo mã đơn
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('ma_don_hang', 'like', '%' . $request->search . '%');
            });
        }

        $orders = $query
            ->select('id', 'ma_don_hang', 'id_khach_hang', 'tong_tien', 'tinh_trang',
                     'refund_status', 'refund_at', 'refund_payout_id', 'refund_note',
                     'updated_at', 'created_at')
            ->orderByDesc('id')
            ->paginate(20);

        // Thống kê nhanh
        $stats = DonHang::where('is_thanh_toan', 1)
            ->where('phuong_thuc_thanh_toan', 3)
            ->where('tinh_trang', 5)
            ->selectRaw("
                COUNT(*) as tong,
                SUM(CASE WHEN refund_status = 'success' THEN 1 ELSE 0 END) as da_hoan,
                SUM(CASE WHEN refund_status = 'pending' THEN 1 ELSE 0 END) as dang_xu_ly,
                SUM(CASE WHEN refund_status = 'failed' THEN 1 ELSE 0 END) as that_bai,
                SUM(CASE WHEN refund_status IS NULL THEN 1 ELSE 0 END) as chua_hoan,
                SUM(CASE WHEN refund_status = 'success' THEN tong_tien ELSE 0 END) as tong_da_hoan
            ")
            ->first();

        return response()->json([
            'status' => true,
            'data'   => $orders,
            'stats'  => $stats,
        ]);
    }

    // ─── Admin kích hoạt thủ công hoàn tiền ─────────────────────
    public function adminManualRefund(Request $request)
    {
        $request->validate([
            'id_don_hang' => 'required|exists:don_hangs,id'
        ]);

        $order = DonHang::find($request->id_don_hang);

        if ($order->refund_status === 'success') {
            return response()->json([
                'status' => false, 
                'message' => 'Đơn này đã được hoàn tiền rồi.'
            ], 422);
        }

        // Reset về pending và dispatch lại ngay
        $order->update(['refund_status' => null]);
        RefundPayOSJob::dispatch($order->id, $order->tong_tien, 'Admin hoàn tiền thủ công');

        return response()->json([
            'status' => true, 
            'message' => 'Đã kích hoạt hoàn tiền cho đơn #' . $order->ma_don_hang
        ]);
    }
}
