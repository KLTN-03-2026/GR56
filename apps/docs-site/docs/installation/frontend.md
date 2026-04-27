---
sidebar_position: 3
---

# 🖥️ Cài đặt Frontend (Web App)

Giao diện Web của FoodBee được phát triển bằng **React 19** kết hợp với bộ công cụ build cực nhanh **Vite**, mang lại tốc độ tải trang chớp nhoáng và trải nghiệm người dùng (UX) mượt mà nhất.

---

## 🛠️ Công nghệ cốt lõi

Hệ thống Frontend được xây dựng dựa trên các công nghệ hiện đại nhất:

- ⚛️ **React Router v7:** Quản lý điều hướng mượt mà (SPA).
- 🎨 **Tailwind CSS:** Xây dựng giao diện Responsive, hiện đại mà không cần viết nhiều CSS thuần.
- 📡 **Axios:** Tối ưu hóa việc gửi yêu cầu HTTP (RESTful API) đến Backend.
- 🖼️ **Lucide React:** Hệ thống Icons đẹp mắt, đồng nhất và nhẹ.

---

## 📋 Yêu cầu hệ thống

| 🧩 Công cụ | 📌 Yêu cầu phiên bản |
| :--- | :--- |
| **Node.js** | `>= 18.x` (Khuyên dùng bản LTS mới nhất như 20.x) |
| **Trình quản lý gói** | `npm >= 9.x`, `yarn`, hoặc `pnpm` |

---

## 🚀 Các bước cài đặt chi tiết

### Bước 1: Cài đặt thư viện (Dependencies)

Mở terminal, di chuyển vào thư mục `FE` (Frontend) và chạy lệnh sau để NPM tự động tải các gói thư viện cần thiết:

```bash
cd FE
npm install
```

### Bước 2: Cấu hình kết nối API

Hệ thống Frontend cần biết địa chỉ của Backend để gọi dữ liệu. Bạn hãy tạo file cấu hình môi trường:

```bash
cp .env.example .env
```

:::info Biến môi trường
Mở file `.env` và kiểm tra biến sau để đảm bảo nó trỏ đúng vào địa chỉ Backend của bạn (thường là port 8000):
`VITE_API_URL=http://127.0.0.1:8000/api`
:::

### Bước 3: Khởi động chế độ Phát triển (Development)

Chạy lệnh sau để khởi động Vite Development Server. Server này hỗ trợ Hot-Module-Replacement (HMR), giúp tự động cập nhật giao diện khi bạn sửa code:

```bash
npm run dev
```

Trang web sẽ lập tức khả dụng tại địa chỉ: 👉 `http://localhost:5173`

---

## 📦 Triển khai Sản xuất (Production Build)

Khi bạn muốn đưa hệ thống lên mạng (Deploy lên Vercel, Netlify, hoặc server riêng), hãy chạy lệnh build để tối ưu hóa mã nguồn:

```bash
npm run build
```

:::tip
Lệnh trên sẽ nén HTML, CSS, JS, loại bỏ mã thừa và tạo ra một thư mục `dist` chứa toàn bộ bản build nhẹ nhất sẵn sàng để triển khai!
:::
