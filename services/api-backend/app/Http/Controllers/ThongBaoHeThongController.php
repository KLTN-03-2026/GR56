<?php

namespace App\Http\Controllers;

use App\Models\KhachHang;
use App\Models\ThongBaoHeThong;
use App\Notifications\AdminBroadcastNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class ThongBaoHeThongController extends Controller
{
    private function adminId(): ?int
    {
        $user = \Illuminate\Support\Facades\Auth::guard('sanctum')->user();
        return $user ? $user->id : null;
    }

    /**
     * Lấy danh sách thông báo đã gửi (phân trang)
     */
    public function index()
    {
        $list = ThongBaoHeThong::orderByDesc('created_at')->paginate(20);
        return response()->json([
            'status' => true,
            'data' => $list,
        ]);
    }

    /**
     * Admin tạo + gửi thông báo broadcast đến toàn bộ khách hàng
     */
    public function store(Request $request)
    {
        $request->validate([
            'tieu_de' => 'required|string|max:255',
            'noi_dung' => 'required|string',
            'loai' => 'required|in:sale,event,news',
            'duong_dan' => 'nullable|string|max:500',
            'hinh_anh' => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,svg|max:5120',
        ], [
            'tieu_de.required' => 'Vui lòng nhập tiêu đề',
            'noi_dung.required' => 'Vui lòng nhập nội dung',
            'loai.required' => 'Vui lòng chọn loại thông báo',
            'hinh_anh.mimes' => 'Hình ảnh phải có định dạng jpeg, png, jpg, gif, webp hoặc svg.',
            'hinh_anh.max' => 'Dung lượng hình ảnh không được vượt quá 5MB.',
        ]);

        // Upload ảnh nếu có
        $hinhAnh = null;
        if ($request->hasFile('hinh_anh')) {
            try {
                $file = $request->file('hinh_anh');
                $file_extension = $file->getClientOriginalExtension();
                $file_name = 'banner_' . time() . '_' . uniqid() . '.' . $file_extension;
                $cho_luu = "ThongBaoBanner/" . $file_name;

                // Đảm bảo thư mục tồn tại
                if (!file_exists(public_path("ThongBaoBanner"))) {
                    mkdir(public_path("ThongBaoBanner"), 0777, true);
                }

                $file->move(public_path("ThongBaoBanner"), $file_name);

                $hinhAnh = env('APP_URL', 'https://be-foodbee.edu.vn') . '/' . $cho_luu;
            } catch (\Exception $e) {
                Log::error("Lỗi upload ảnh banner thông báo: " . $e->getMessage());
            }
        }

        // Đếm số KH trước (đã kích hoạt và không bị khóa)
        $soKhachHang = KhachHang::where('is_active', 1)->where('is_block', 0)->count();

        // Tạo bản ghi
        $thongBao = ThongBaoHeThong::create([
            'tieu_de' => $request->tieu_de,
            'noi_dung' => $request->noi_dung,
            'loai' => $request->loai,
            'duong_dan' => $request->duong_dan,
            'hinh_anh' => $hinhAnh,
            'so_nguoi_nhan' => $soKhachHang,
            'created_by' => $this->adminId(),
        ]);

        // Gửi notification đến TẤT CẢ KhachHang (qua queue)
        $khachHangs = KhachHang::where('is_active', 1)->where('is_block', 0)->get();
        try {
            Notification::send($khachHangs, new AdminBroadcastNotification($thongBao));
        } catch (\Exception $e) {
            Log::error('Lỗi gửi broadcast notification: ' . $e->getMessage());
        }

        return response()->json([
            'status' => true,
            'message' => "Đã gửi thông báo đến {$soKhachHang} khách hàng!",
            'data' => $thongBao,
        ]);
    }

    /**
     * Xóa thông báo
     */
    public function destroy($id)
    {
        $thongBao = ThongBaoHeThong::findOrFail($id);

        if ($thongBao->hinh_anh) {
            $path = str_replace('/storage/', '', $thongBao->hinh_anh);
            \Illuminate\Support\Facades\Storage::disk('public')->delete($path);

            // Xóa file nếu nó dùng hàm move vào public directory
            $fileName = basename($thongBao->hinh_anh);
            $fullPath = public_path("ThongBaoBanner/" . $fileName);
            if (file_exists($fullPath)) {
                @unlink($fullPath);
            }
        }

        // Xóa tất cả các notifications đã gửi cho user liên quan đến thong_bao_id này
        \Illuminate\Support\Facades\DB::table('notifications')
            ->where('type', 'App\Notifications\AdminBroadcastNotification')
            ->where('data', 'LIKE', '%"thong_bao_id":' . $id . '%')
            ->delete();

        $thongBao->delete();

        return response()->json([
            'status' => true,
            'message' => 'Đã xóa thông báo và thu hồi khỏi thiết bị người dùng!',
        ]);
    }
}
