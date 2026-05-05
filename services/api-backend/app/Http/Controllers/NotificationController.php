<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo của user hiện tại
     */
    public function index(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Unauthorized'], 401);
        }

        // Lấy 20 thông báo gần nhất
        $notifications = $user->notifications()->take(20)->get();
        // format cho FE dễ dùng
        $formatted = $notifications->map(function ($notif) {
            return [
                'id' => $notif->id,
                'data' => $notif->data,
                'read_at' => $notif->read_at,
                'created_at' => $notif->created_at,
            ];
        });

        return response()->json([
            'status' => true,
            'data' => $formatted,
            'unread_count' => $user->unreadNotifications()->count()
        ]);
    }

    /**
     * Đánh dấu đã đọc
     */
    public function markAsRead(Request $request)
    {
        $user = Auth::guard('sanctum')->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Unauthorized'], 401);
        }

        if ($request->has('id')) {
            $notification = $user->notifications()->where('id', $request->id)->first();
            if ($notification) {
                $notification->markAsRead();
            }
        } else {
            // Đánh dấu tất cả
            $user->unreadNotifications->markAsRead();
        }

        return response()->json([
            'status' => true,
            'message' => 'Đã cập nhật trạng thái thông báo',
            'unread_count' => $user->unreadNotifications()->count()
        ]);
    }
}
