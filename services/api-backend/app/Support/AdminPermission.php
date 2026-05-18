<?php

namespace App\Support;

use App\Models\NhanVien;
use App\Models\ChucNang;
use App\Models\PhanQuyen;
use Illuminate\Http\JsonResponse;

class AdminPermission
{
    public static function can(?NhanVien $user, int $idChucNang): bool
    {
        if (!$user) {
            return false;
        }

        if ((int) $user->is_master === 1) {
            return true;
        }

        return PhanQuyen::where('id_chuc_vu', $user->id_chuc_vu)
            ->where('id_chuc_nang', $idChucNang)
            ->exists();
    }

    public static function idsFor(?NhanVien $user): array
    {
        if (!$user) {
            return [];
        }

        if ((int) $user->is_master === 1) {
            return ChucNang::query()
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return PhanQuyen::where('id_chuc_vu', $user->id_chuc_vu)
            ->pluck('id_chuc_nang')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function deny(): JsonResponse
    {
        return response()->json([
            'status'  => 0,
            'data'    => false,
            'message' => 'Bạn không có quyền thực hiện chức năng này!',
        ], 403);
    }
}
