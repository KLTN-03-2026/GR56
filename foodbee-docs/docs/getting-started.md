# 📝 Hướng dẫn bắt đầu nhanh

Chào mừng bạn đến với tài liệu kỹ thuật của FoodBee. Tài liệu này sẽ giúp bạn thiết lập môi trường phát triển chỉ trong vài bước.

## 📋 Điều kiện tiên quyết
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **PHP 8.2+** & **Composer** (Cho Backend)
- **Node.js 18+** & **NPM/Yarn** (Cho Frontend & Mobile)
- **MySQL 8.0+**
- **Python 3.10+** (Cho Chatbot AI)
- **Git**

## 🚀 Các bước khởi tạo nhanh

### 1. Clone Project
```bash
git clone https://github.com/KLTN-03-2026/GR56.git
cd GR56
```

### 2. Thiết lập Backend (BE)
```bash
cd BE
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### 3. Thiết lập Frontend (FE)
```bash
cd FE
npm install
npm run dev
```

### 4. Thiết lập Chatbot AI
```bash
cd Chatbot
pip install -r requirements.txt
python simple_chatbot_ai.py
```

## 📚 Tài liệu chi tiết
Xem thêm các hướng dẫn cài đặt chi tiết cho từng nền tảng:
- [Cài đặt Backend](./installation/backend.md)
- [Cài đặt Frontend](./installation/frontend.md)
- [Cài đặt Mobile App](./installation/mobile.md)
