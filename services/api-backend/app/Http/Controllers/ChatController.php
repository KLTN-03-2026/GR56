<?php

namespace App\Http\Controllers;

use App\Events\TinNhanMoiEvent;
use App\Models\DonHang;
use App\Models\TinNhan;
use App\Models\KhachHang;
use App\Models\Shipper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    // ─── Lấy danh sách tin nhắn của 1 đơn hàng ─────────────────────────────
    public function layTinNhan(Request $request, $id_don_hang)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) return response()->json(['status' => false, 'message' => 'Unauthorized'], 401);

        // Kiểm tra quyền: phải là khách hàng đặt đơn HOẶC shipper được giao đơn
        $don_hang = DonHang::find($id_don_hang);
        if (!$don_hang) return response()->json(['status' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);

        $authorized = false;
        if ($user instanceof KhachHang && $don_hang->id_khach_hang == $user->id) $authorized = true;
        if ($user instanceof Shipper    && $don_hang->id_shipper    == $user->id) $authorized = true;

        if (!$authorized) return response()->json(['status' => false, 'message' => 'Không có quyền'], 403);

        $messages = TinNhan::where('id_don_hang', $id_don_hang)
            ->orderBy('created_at', 'asc')
            ->get();

        // Đánh dấu đã đọc tin nhắn của đối phương
        $loai = $user instanceof KhachHang ? 'khach_hang' : 'shipper';
        TinNhan::where('id_don_hang', $id_don_hang)
            ->where('loai_nguoi_gui', '!=', $loai)
            ->where('da_doc', false)
            ->update(['da_doc' => true]);

        return response()->json([
            'status'    => true,
            'data'      => $messages,
            'loai_toi'  => $loai,
            'ten_toi'   => $user->ho_va_ten ?? $user->ten_quan_an ?? '',
        ]);
    }

    // ─── Gửi tin nhắn ────────────────────────────────────────────────────────
    public function guiTinNhan(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) return response()->json(['status' => false, 'message' => 'Unauthorized'], 401);

        $request->validate([
            'id_don_hang' => 'required|integer|exists:don_hangs,id',
            'noi_dung'    => 'required|string|max:1000',
        ]);

        $don_hang = DonHang::find($request->id_don_hang);
        if (!$don_hang) return response()->json(['status' => false, 'message' => 'Không tìm thấy đơn hàng'], 404);

        // Chỉ cho phép chat khi đơn đang trong quá trình giao (tinh_trang 1-3)
        if ($don_hang->tinh_trang < 1 || $don_hang->tinh_trang > 3) {
            return response()->json(['status' => false, 'message' => 'Đơn hàng không trong trạng thái có thể nhắn tin'], 422);
        }

        // Xác định loại người gửi & kiểm tra quyền
        $loai       = null;
        $authorized = false;

        if ($user instanceof KhachHang && $don_hang->id_khach_hang == $user->id) {
            $loai = 'khach_hang';
            $authorized = true;
        }
        if ($user instanceof Shipper && $don_hang->id_shipper == $user->id) {
            $loai = 'shipper';
            $authorized = true;
        }

        if (!$authorized) return response()->json(['status' => false, 'message' => 'Không có quyền nhắn tin'], 403);

        // Lưu tin nhắn
        $tin_nhan = TinNhan::create([
            'id_don_hang'    => $don_hang->id,
            'id_nguoi_gui'   => $user->id,
            'loai_nguoi_gui' => $loai,
            'noi_dung'       => trim($request->noi_dung),
            'da_doc'         => false,
        ]);

        // Broadcast real-time
        broadcast(new TinNhanMoiEvent($tin_nhan));

        return response()->json([
            'status'   => true,
            'message'  => 'Đã gửi',
            'tin_nhan' => $tin_nhan,
        ]);
    }

    // ─── Đếm tin nhắn chưa đọc ───────────────────────────────────────────────
    public function demChuaDoc(Request $request, $id_don_hang)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) return response()->json(['status' => false, 'count' => 0]);

        $loai = $user instanceof KhachHang ? 'khach_hang' : 'shipper';

        $count = TinNhan::where('id_don_hang', $id_don_hang)
            ->where('loai_nguoi_gui', '!=', $loai)
            ->where('da_doc', false)
            ->count();

        return response()->json([
            'status' => true,
            'count' => $count
        ]);
    }
}
