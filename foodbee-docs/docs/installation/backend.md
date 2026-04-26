---
sidebar_position: 2
---

# ⚙️ Cài đặt Backend (Core API)

Backend của FoodBee được xây dựng trên nền tảng **Laravel 11**, cung cấp hệ thống RESTful API mạnh mẽ, bảo mật và hiệu suất cao cho Web, Mobile và Chatbot.

---

## 📋 Yêu cầu hệ thống

Trước khi bắt đầu, máy tính (hoặc server) của bạn cần đáp ứng các thông số sau:

| 🧩 Thành phần | 📌 Yêu cầu phiên bản |
| :--- | :--- |
| **PHP** | `>= 8.2` |
| **Composer** | `>= 2.x` |
| **Cơ sở dữ liệu** | `MySQL 8.0+` hoặc `PostgreSQL 14+` |
| **Node.js** | `>= 18.x` (để biên dịch assets nếu cần) |

:::info Các PHP Extensions bắt buộc
Bạn cần bật các extension sau trong file `php.ini`: 
`Ctype`, `cURL`, `DOM`, `Fileinfo`, `Filter`, `Hash`, `Mbstring`, `OpenSSL`, `PCRE`, `PDO`, `Session`, `Tokenizer`, `XML`.
:::

---

## 🚀 Các bước cài đặt chi tiết

### Bước 1: Tải thư viện (Dependencies)

Mở terminal, di chuyển vào thư mục `BE` (Backend) và chạy lệnh sau để tải toàn bộ thư viện cần thiết:

```bash
cd BE
composer install
```

### Bước 2: Cấu hình biến môi trường

Sao chép file cấu hình mẫu để tạo file cấu hình cho riêng bạn:

```bash
cp .env.example .env
```

:::warning Lưu ý cấu hình quan trọng
Mở file `.env` vừa tạo và điền các thông tin sau:
- **Kết nối Database:** `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.
- **Cổng thanh toán (PayOS):** `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
- **Hệ thống Real-time (WebSockets):** `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`.
:::

### Bước 3: Khởi tạo dữ liệu (Migration & Seeding)

Tạo khóa bảo mật cho ứng dụng và xây dựng cấu trúc cơ sở dữ liệu:

```bash
# Tạo Application Key
php artisan key:generate

# Tạo bảng và đổ dữ liệu mẫu
php artisan migrate --seed
```

:::tip Dữ liệu mẫu (Dummy Data)
Lệnh `--seed` sẽ tự động tạo sẵn các tài khoản Admin, Khách hàng test, cũng như danh sách món ăn mẫu để bạn có thể trải nghiệm ngay lập tức.
:::

### Bước 4: Khởi động Server

Khởi chạy máy chủ ảo của Laravel:

```bash
php artisan serve
```

Hệ thống sẽ chạy thành công tại địa chỉ mặc định: `http://127.0.0.1:8000`

---

## 📚 Tra cứu API (Swagger Documentation)

FoodBee Backend tích hợp sẵn **L5-Swagger** để tự động tạo tài liệu API. Bạn có thể tra cứu và test trực tiếp các API tại:

👉 **[http://127.0.0.1:8000/api/documentation](http://127.0.0.1:8000/api/documentation)**
