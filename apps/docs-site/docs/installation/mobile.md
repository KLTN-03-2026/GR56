---
sidebar_position: 4
---

# 📱 Cài đặt Mobile App

Ứng dụng di động FoodBee được xây dựng trên framework **React Native** (sử dụng Expo) cho phép lập trình một lần, xuất bản chạy mượt mà trên cả **iOS** và **Android**. Ứng dụng này dành riêng cho Khách hàng và đối tác Shipper.

---

## 📋 Yêu cầu hệ thống

| 🧩 Công cụ | 📌 Yêu cầu cài đặt |
| :--- | :--- |
| **Node.js** | `>= 18.x` |
| **Expo CLI** | Khuyên dùng cài đặt toàn cục (`npm install -g expo-cli`) |
| **Thiết bị Test** | Điện thoại thật (cài ứng dụng Expo Go) hoặc Máy ảo (iOS Simulator / Android Emulator) |

---

## 🚀 Các bước cài đặt chi tiết

### Bước 1: Tải thư viện (Dependencies)

Mở terminal, di chuyển vào thư mục `Mobile` và chạy lệnh sau để tải các gói thư viện React Native:

```bash
cd Mobile
npm install
```

### Bước 2: Cấu hình kết nối API & Maps

Ứng dụng Mobile cần kết nối với Backend và sử dụng bản đồ để theo dõi Shipper. Hãy tạo file môi trường:

```bash
cp .env.example .env
```

:::warning Cấu hình biến môi trường
Mở file `.env` và kiểm tra các thông số:
- **API URL:** Đảm bảo trỏ đúng vào địa chỉ IP LAN của máy tính chạy Backend (KHÔNG dùng `localhost` hay `127.0.0.1` nếu test trên điện thoại thật). Ví dụ: `EXPO_PUBLIC_API_URL=http://192.168.1.5:8000/api`
- **Mapbox API:** Cấu hình `EXPO_PUBLIC_MAPBOX_KEY` để hiển thị bản đồ định vị.
:::

### Bước 3: Khởi động Ứng dụng

Khởi chạy Expo Metro Bundler:

```bash
npx expo start
```

:::tip Cách kiểm thử (Testing)
Sau khi chạy lệnh trên, một mã QR sẽ hiện ra trên Terminal.
- **Trên điện thoại:** Mở ứng dụng camera (iOS) hoặc quét mã qua app **Expo Go** (Android/iOS) để mở app FoodBee.
- **Trên máy tính:** Bấm phím `i` để mở iOS Simulator, hoặc phím `a` để mở Android Emulator.
:::

---

## 🛠️ Công nghệ cốt lõi

- ⚛️ **React Native (Expo):** Nền tảng cross-platform tối ưu hiệu suất.
- 🗺️ **MapLibre / Carto:** Hiển thị bản đồ và định vị Shipper theo thời gian thực (Real-time Tracking).
- 🎨 **NativeWind:** Sử dụng cú pháp Tailwind CSS ngay trong React Native.
