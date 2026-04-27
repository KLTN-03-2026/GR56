# 📱 Hướng dẫn cài đặt Mobile App (Customer & Shipper)

Ứng dụng di động FoodBee được xây dựng trên **React Native**, hỗ trợ cả iOS và Android từ cùng một mã nguồn.

## 📋 Yêu cầu hệ thống
- **Node.js:** >= 18.x
- **Watchman:** (Dành cho macOS)
- **Android Studio:** Đã cài đặt SDK, Emulator hoặc thiết bị thật.
- **Xcode:** (Dành cho macOS) nếu muốn chạy trên iOS.

## 🚀 Các bước cài đặt

### 1. Khởi tạo môi trường
Di chuyển vào thư mục APP:
```bash
cd APP
npm install
```

### 2. Cài đặt Pods (Chỉ dành cho iOS/macOS)
```bash
cd ios
pod install
cd ..
```

### 3. Chạy ứng dụng trên Emulator

**Đối với Android:**
```bash
npx react-native run-android
```

**Đối với iOS:**
```bash
npx react-native run-ios
```

## ⚠️ Lưu ý quan trọng
- **Kết nối API:** Nếu chạy trên thiết bị thật, hãy đảm bảo điện thoại và máy tính cùng mạng Wi-Fi. Thay đổi địa chỉ `VITE_API_URL` trong file cấu hình thành IP của máy tính (ví dụ: `192.168.1.x`).
- **Gradle:** Trong lần đầu chạy Android, quá trình tải Gradle có thể mất vài phút.

## 🛠️ Công nghệ sử dụng
- **React Native CLI:** Cho hiệu suất tối ưu.
- **React Navigation:** Quản lý chuyển trang.
- **NativeWind:** Sử dụng Tailwind CSS trên Mobile.
