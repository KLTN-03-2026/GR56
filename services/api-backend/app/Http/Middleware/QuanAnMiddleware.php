<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class QuanAnMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();
        if ($user && $user instanceof \App\Models\QuanAn) {
            return $next($request);
        }
        return response()->json([
            'message' => 'Bạn cần đăng nhập để thực hiện chức năng này'
        ], 401);
    }
}
