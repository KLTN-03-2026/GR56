# 💻 Hướng dẫn cài đặt Frontend (Web App)

Giao diện Web của FoodBee được phát triển bằng **React 19** kết hợp với **Vite** để đảm bảo tốc độ tải trang và trải nghiệm người dùng mượt mà nhất.

## 📋 Yêu cầu hệ thống
- **Node.js:** >= 18.x (Khuyên dùng bản LTS)
- **NPM:** >= 9.x hoặc **Yarn**

## 🚀 Các bước cài đặt

### 1. Cài đặt thư viện
Di chuyển vào thư mục FE và cài đặt các dependencies:
```bash
cd FE
npm install
```

### 2. Cấu hình kết nối API
Sao chép file `.env.example` thành `.env` và cập nhật địa chỉ Backend:
```bash
cp .env.example .env
```
Cập nhật biến sau:
`VITE_API_URL=http://127.0.0.1:8000/api`

### 3. Chế độ phát triển (Development)
Chạy lệnh sau để khởi động Web App tại local:
```bash
npm run dev
```
Trang web sẽ khả dụng tại: `http://localhost:5173`

### 4. Xây dựng bản sản xuất (Build)
Để triển khai thực tế, hãy tạo bản build tối ưu:
```bash
npm run build
```

## 🛠️ Công nghệ sử dụng
- **React Router v7:** Quản lý điều hướng.
- **Tailwind CSS:** Xây dựng giao diện hiện đại.
- **Axios:** Xử lý các yêu cầu HTTP đến Backend.
- **Lucide React:** Hệ thống Icons đồng nhất.
