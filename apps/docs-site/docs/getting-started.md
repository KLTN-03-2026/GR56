---
sidebar_position: 1
---

# 🚀 Bắt đầu nhanh

Chào mừng bạn đến với tài liệu kỹ thuật của **FoodBee**. Hướng dẫn này sẽ giúp bạn thiết lập toàn bộ môi trường phát triển (Local Environment) chỉ trong vài phút.

---

## 📋 Điều kiện tiên quyết

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt sẵn các công cụ lõi sau:

| 🛠️ Công cụ | 📌 Nền tảng sử dụng | 🔗 Link tải |
| :--- | :--- | :--- |
| **PHP 8.2+ & Composer** | Backend (Laravel) | [PHP](https://www.php.net/) \| [Composer](https://getcomposer.org/) |
| **Node.js 18+ & NPM** | Frontend & Mobile | [Node.js](https://nodejs.org/) |
| **MySQL 8.0+** | Database Server | [MySQL](https://www.mysql.com/) |
| **Python 3.10+** | Chatbot AI | [Python](https://www.python.org/) |
| **Git** | Quản lý mã nguồn | [Git](https://git-scm.com/) |

:::info Lưu ý quan trọng
Chúng tôi khuyến nghị sử dụng **Node 18** hoặc **Node 20** (bản LTS) để tránh các lỗi xung đột thư viện không mong muốn.
:::

---

## 🏁 Khởi tạo Project

### 1. Tải Mã nguồn

Đầu tiên, hãy sao chép (clone) kho lưu trữ chính của dự án về máy của bạn:

```bash
git clone https://github.com/KLTN-03-2026/GR56.git
cd GR56
```

### 2. Thiết lập Môi trường Nhanh

Bạn có thể chạy các khối hệ thống độc lập hoặc chạy cùng lúc. Dưới đây là các lệnh khởi động nhanh:

#### ⚙️ Khởi động Backend (Laravel)
```bash
cd BE
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

#### 🖥️ Khởi động Frontend (Vue.js/React)
```bash
cd FE
npm install
npm run dev
```

#### 🤖 Khởi động Chatbot AI (Python)
```bash
cd Chatbot
pip install -r requirements.txt
python simple_chatbot_ai.py
```

---

## 📚 Khám phá sâu hơn

Nếu bạn gặp vấn đề ở bước cài đặt nhanh, hoặc muốn thiết lập chi tiết (cấu hình biến môi trường, API keys, v.v.), hãy xem các hướng dẫn chuyên sâu:

- [⚙️ Hướng dẫn cài đặt Backend chi tiết](./installation/backend.md)
- [🖥️ Hướng dẫn cài đặt Frontend chi tiết](./installation/frontend.md)
- [📱 Hướng dẫn cấu hình Mobile App](./installation/mobile.md)
