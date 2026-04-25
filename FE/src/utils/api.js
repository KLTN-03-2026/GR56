import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - gắn token tự động
api.interceptors.request.use(
  (config) => {
    let token = null;
    const url = config.url || '';
    const pathname = window.location.pathname;

    // Ưu tiên check theo đường dẫn API
    if (url.includes('/api/admin/')) {
      token = localStorage.getItem('nhan_vien_login');
    } else if (url.includes('/api/quan-an/')) {
      token = localStorage.getItem('quan_an_login');
    } else if (url.includes('/api/shipper/')) {
      token = localStorage.getItem('shipper_login');
    } else if (url.includes('/api/khach-hang/')) {
      token = localStorage.getItem('khach_hang_login');
    } else {
      // Đối với API dùng chung (như /api/wallet), check theo đường dẫn hiển thị của web
      if (pathname.startsWith('/admin')) {
        token = localStorage.getItem('nhan_vien_login');
      } else if (pathname.startsWith('/quan-an')) {
        token = localStorage.getItem('quan_an_login');
      } else if (pathname.startsWith('/shipper')) {
        token = localStorage.getItem('shipper_login');
      } else {
        token = localStorage.getItem('khach_hang_login');
      }
    }

    // Chỉ tự động gắn nếu chưa có header Authorization
    if (token && !config.headers.Authorization && !config.headers.authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - xử lý lỗi chung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('khach_hang_login');
      // redirect về login nếu cần
    }
    return Promise.reject(error);
  }
);

export default api;
