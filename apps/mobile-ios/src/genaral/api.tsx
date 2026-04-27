import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Alert } from "react-native";
// import { notify } from "./notification";

// const API_URL = "http://127.0.0.1:8000/api";
// const API_URL = "http://192.168.1.196:8000/api";
const API_URL = "https://be.foodbee.io.vn/api";
export const API_CHATBOT_URL = "http://127.0.0.1:5000"

// var is_auth_alert_shown = false;


const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 giây timeout
});

apiClient.defaults.headers.common['Accept'] = 'application/json';
apiClient.defaults.headers.common['Content-Type'] = 'application/json';

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      await AsyncStorage.removeItem('token');
      const navigationRef = require('../utils/navigationRef').default;
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
    return Promise.reject(error);
  }
);

// ─── PayOS API ───────────────────────────────────────────────
export const payosAPI = {
  /** Tạo / lấy lại link thanh toán PayOS cho đơn hàng */
  taoLink: (id_don_hang: number) =>
    apiClient.post<{
      status: boolean;
      message?: string;
      checkout_url?: string;
      payment_link_id?: string;
      qr_code?: string;
      order_code?: number;
      is_paid?: boolean;
      reused?: boolean;
    }>(`/payos/tao-link/${id_don_hang}`),

  /** Lấy thông tin link PayOS theo orderCode */
  thongTin: (orderCode: number | string) =>
    apiClient.get(`/payos/thong-tin/${orderCode}`),

  /** Xác nhận giao dịch S2S thủ công (dùng sau khi user hoàn tất thanh toán) */
  xacNhanS2S: (orderCode: number) =>
    apiClient.post<{ status: boolean; message?: string }>(
      '/payos/xac-nhan-s2s',
      { orderCode },
    ),

  /** Huỷ link thanh toán */
  huyLink: (orderCode: number, reason = 'Huỷ bởi khách hàng') =>
    apiClient.post(`/payos/huy-link/${orderCode}`, { reason }),
};

export default apiClient;