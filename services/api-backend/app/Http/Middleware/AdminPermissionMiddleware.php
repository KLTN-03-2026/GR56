<?php

namespace App\Http\Middleware;

use App\Support\AdminPermission;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminPermissionMiddleware
{
    public function handle(Request $request, Closure $next, int $idChucNang): Response
    {
        $user = Auth::guard('sanctum')->user();

        if (!AdminPermission::can($user, $idChucNang)) {
            return AdminPermission::deny();
        }

        return $next($request);
    }
}
