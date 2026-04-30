<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * MasterMiddleware
 *
 * Chỉ cho phép nhân viên có is_master = 1 truy cập.
 * Dùng cho các route tài chính nhạy cảm:
 *   - /admin/wallet/*
 *   - /admin/withdraw/*
 *   - /admin/transaction/*
 *   - /admin/payos/*
 *   - /admin/refund/*
 */
class MasterMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();

        // Phải đăng nhập và là NhanVien
        if (!$user || !($user instanceof \App\Models\NhanVien)) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn cần đăng nhập để thực hiện chức năng này.',
            ], 401);
        }

        // Phải có is_master = 1
        if ($user->is_master != 1) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không có quyền truy cập chức năng tài chính. Chỉ Admin Master mới được phép!',
            ], 403);
        }

        return $next($request);
    }
}
