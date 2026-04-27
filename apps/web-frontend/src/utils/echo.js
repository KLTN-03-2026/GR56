import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const getToken = () => {
    // Pick the right token based on the current app section
    const path = window.location.pathname;
    if (path.startsWith('/shipper')) {
        return localStorage.getItem('shipper_login') || '';
    }
    if (path.startsWith('/quan-an')) {
        return localStorage.getItem('quan_an_login') || '';
    }
    if (path.startsWith('/admin')) {
        return localStorage.getItem('admin_login') || '';
    }
    return localStorage.getItem('khach_hang_login') || '';
};

const apiURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const wsKey = import.meta.env.VITE_REVERB_APP_KEY || 'local-key-12345';
const wsHost = import.meta.env.VITE_REVERB_HOST || '127.0.0.1';
const wsPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080', 10);
const wsScheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
const isProd = wsScheme === 'https';

let echo = null;

try {
    echo = new Echo({
        broadcaster: 'reverb',
        key: wsKey,
        wsHost: wsHost,
        wsPort: wsPort,
        wssPort: wsPort,
        forceTLS: isProd,
        enableStats: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${apiURL}/api/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: 'application/json'
            }
        }
    });
} catch (error) {
    console.error('Failed to initialize Echo:', error);
    echo = null;
}

window.Echo = echo;

export const updateEchoToken = () => {
    if (!echo || !echo.connector) {
        return;
    }

    const token = getToken();

    if (echo.connector.options?.auth) {
        echo.connector.options.auth.headers = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        };
    }

    const pusher = echo.connector.pusher || (echo.connector.reverb);
    if (pusher) {
        const config = pusher.config || pusher.options;
        if (config?.auth) {
            if (!config.auth.headers) {
                config.auth.headers = {};
            }
            config.auth.headers.Authorization = `Bearer ${token}`;
        }
    }
};

export default echo;
