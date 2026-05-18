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

        // Dùng class name thực tế của model để tránh lỗi morph alias
        $notifiableType = get_class($user);
        $notifiableId   = $user->id;

        $notifications = \Illuminate\Support\Facades\DB::table('notifications')
            ->where('notifiable_type', $notifiableType)
            ->where('notifiable_id', $notifiableId)
            ->orderByDesc('created_at')
            ->take(20)
            ->get();

        $formatted = $notifications->map(function ($notif) {
            return [
                'id'         => $notif->id,
                'data'       => json_decode($notif->data, true),
                'read_at'    => $notif->read_at,
                'created_at' => $notif->created_at,
            ];
        });

        $unreadCount = \Illuminate\Support\Facades\DB::table('notifications')
            ->where('notifiable_type', $notifiableType)
            ->where('notifiable_id', $notifiableId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'status'       => true,
            'data'         => $formatted,
            'unread_count' => $unreadCount,
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
