import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const apiURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const wsKey = import.meta.env.VITE_REVERB_APP_KEY || 'local-key-12345';
const wsHost = import.meta.env.VITE_REVERB_HOST || '127.0.0.1';
const wsPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080', 10);
const wsScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const isProd = wsScheme === 'https';

/** Tạo Echo instance với token cụ thể */
export function createEcho(token) {
    return new Echo({
        broadcaster: 'reverb',
        key: wsKey,
        wsHost,
        wsPort,
        wssPort: wsPort,
        forceTLS: isProd,
        enableStats: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${apiURL}/api/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });
}

// ─── Cache per userType ───────────────────────────────────────────────────────
const _cache = {}; // { userType: Echo }

/**
 * Lấy (hoặc tạo) Echo instance cho userType.
 * Nếu token thay đổi → tạo lại instance mới.
 */
export function getEchoInstance(userType, token) {
    const cached = _cache[userType];
    if (cached) {
        // Cập nhật token cho lần subscribe tiếp theo
        try {
            if (cached.connector?.options?.auth?.headers) {
                cached.connector.options.auth.headers.Authorization = `Bearer ${token}`;
            }
        } catch (_) { }
        return cached;
    }
    try {
        const inst = createEcho(token);
        _cache[userType] = inst;
        return inst;
    } catch (e) {
        console.error('[Echo] createEcho error:', e);
        return null;
    }
}

/** Disconnect và xoá cache khi logout */
export function destroyEchoInstance(userType) {
    if (_cache[userType]) {
        try { _cache[userType].disconnect(); } catch (_) { }
        delete _cache[userType];
    }
}

// ─── Backward-compat: default export (dùng cho Shipper) ──────────────────────
export const getToken = () => {
    const p = window.location.pathname;
    if (p.startsWith('/shipper')) return localStorage.getItem('shipper_login') || '';
    if (p.startsWith('/quan-an')) return localStorage.getItem('quan_an_login') || '';
    if (p.startsWith('/admin')) return localStorage.getItem('admin_login') || '';
    return localStorage.getItem('khach_hang_login') || '';
};

export const updateEchoToken = () => { /* no-op, giữ compat */ };

// Shipper/DonHang.jsx vẫn dùng default import
let _shipperEcho = null;
export default {
    get private() {
        return (...args) => {
            if (!_shipperEcho) {
                _shipperEcho = createEcho(getToken());
                _cache['shipper_default'] = _shipperEcho;
            }
            return _shipperEcho.private(...args);
        };
    },
    get channel() {
        return (...args) => {
            if (!_shipperEcho) {
                _shipperEcho = createEcho(getToken());
                _cache['shipper_default'] = _shipperEcho;
            }
            return _shipperEcho.channel(...args);
        };
    },
    get connector() {
        if (!_shipperEcho) _shipperEcho = createEcho(getToken());
        return _shipperEcho.connector;
    },
    disconnect() {
        if (_shipperEcho) { try { _shipperEcho.disconnect(); } catch (_) { } _shipperEcho = null; }
    },
};
