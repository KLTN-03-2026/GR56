<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use App\Models\KhachHang;
use App\Models\QuanAn;
use App\Models\Shipper;
use App\Models\DonHang;

// ── Khách Hàng ──────────────────────────────────────────────────────────────
Broadcast::channel('khach-hang.{id}', function ($user, $id) {
    $isAuthorized = $user instanceof KhachHang && (int) $user->id === (int) $id;
    return $isAuthorized;
});

// ── Quán Ăn ──────────────────────────────────────────────────────────────────
Broadcast::channel('quan-an.{id}', function ($user, $id) {
    $isQuanAn = ($user instanceof QuanAn)
        || (method_exists($user, 'getTable') && $user->getTable() === 'quan_ans');
    return $isQuanAn && (int) $user->id === (int) $id;
});

// ── All Shippers (đơn hàng mới) ─────────────────────────────────────────────
Broadcast::channel('all-shippers', function ($user) {
    if ($user instanceof Shipper) return true;
    if (method_exists($user, 'getTable') && $user->getTable() === 'shippers') return true;
    return false;
});

// ── Shipper cá nhân ──────────────────────────────────────────────────────────
Broadcast::channel('shipper.{id}', function ($user, $id) {
    return $user instanceof Shipper && (int) $user->id === (int) $id;
});

// ── Theo dõi đơn hàng (khách) ────────────────────────────────────────────────
Broadcast::channel('order.{orderId}', function ($user, $orderId) {
    if (!($user instanceof KhachHang)) return false;
    return DonHang::where('id', $orderId)->where('id_khach_hang', $user->id)->exists();
});

// ── Chat Khách Hàng ↔ Shipper ────────────────────────────────────────────────
// Channel: private-chat.{orderId}
// Authorized: khách hàng đặt đơn HOẶC shipper được giao đơn
Broadcast::channel('chat.{orderId}', function ($user, $orderId) {
    $don_hang = DonHang::find($orderId);
    if (!$don_hang) return false;

    if ($user instanceof KhachHang && (int)$don_hang->id_khach_hang === (int)$user->id) {
        return ['id' => $user->id, 'loai' => 'khach_hang', 'ten' => $user->ho_va_ten ?? ''];
    }

    if ($user instanceof Shipper && (int)$don_hang->id_shipper === (int)$user->id) {
        return ['id' => $user->id, 'loai' => 'shipper', 'ten' => $user->ho_va_ten ?? ''];
    }

    Log::info('Channel chat - NOT authorized', [
        'user_id'  => $user->id ?? null,
        'type'     => get_class($user),
        'order_id' => $orderId,
    ]);

    return false;
});

// ── Admin Alerts (public channel — tất cả session admin đều nhận) ────────────
Broadcast::channel('admin-alerts', function () {
    return true;
});
