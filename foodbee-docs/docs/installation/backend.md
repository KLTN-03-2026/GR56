# ⚙️ Hướng dẫn cài đặt Backend (Core API)

Backend của FoodBee được xây dựng trên nền tảng **Laravel 11**, cung cấp hệ thống RESTful API mạnh mẽ cho Web, Mobile và Chatbot.

## 📋 Yêu cầu hệ thống
- **PHP:** >= 8.2
- **Extensions:** Ctype, cURL, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, Session, Tokenizer, XML.
- **Composer:** >= 2.x
- **Database:** MySQL 8.0+ / PostgreSQL

## 🚀 Các bước cài đặt

### 1. Cài đặt Dependencies
Di chuyển vào thư mục BE và thực hiện cài đặt các gói thư viện:
```bash
cd BE
composer install
```

### 2. Cấu hình môi trường (.env)
Sao chép file cấu hình mẫu và chỉnh sửa các thông số quan trọng:
```bash
cp .env.example .env
```
Các thông số cần lưu ý:
- `DB_DATABASE`: Tên cơ sở dữ liệu.
- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`: Cấu hình thanh toán PayOS.
- `REVERB_APP_ID`, `REVERB_APP_KEY`: Cấu hình Real-time.

### 3. Khởi tạo ứng dụng
```bash
php artisan key:generate
php artisan migrate --seed
```
*Lệnh `--seed` sẽ tự động tạo các dữ liệu mẫu (Sản phẩm, Danh mục, Người dùng test).*

### 4. Khởi động Server
```bash
php artisan serve
```
Hệ thống sẽ chạy tại địa chỉ: `http://127.0.0.1:8000`

## 📚 Tài liệu API
Hệ thống tích hợp sẵn Swagger để tra cứu các Endpoint:
Truy cập: `http://127.0.0.1:8000/api/documentation`
