# Deploy FoodBee Chatbot lên VPS

## 1. Chuẩn bị VPS

### Yêu cầu
- Ubuntu 20.04+ (hoặc Debian 11+)
- Python 3.10+
- RAM tối thiểu 1GB
- Port 5000 mở

### SSH vào VPS
```bash
ssh root@<VPS_IP>
```

## 2. Cài đặt môi trường

```bash
# Cập nhật hệ thống
apt update && apt upgrade -y

# Cài Python 3 & pip
apt install -y python3 python3-pip python3-venv git

# Cài MySQL client (để test kết nối database)
apt install -y mysql-client
```

## 3. Upload code lên VPS

**Cách 1: Git (khuyến nghị)**

```bash
cd /var/www
git clone https://github.com/<your-repo>/foodbee-chatbot.git chatbot
cd chatbot
git pull origin master
```

**Cách 2: SCP từ máy local**

```bash
# Trên máy local
scp -r /Users/vannhan/KLTN/Chatbot/* root@<VPS_IP>:/var/www/chatbot/
```

## 4. Cài đặt dependencies

```bash
cd /var/www/chatbot

# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate

# Cài packages
pip install -r requirements.txt
```

## 5. Cấu hình environment

```bash
# Copy file cấu hình
cp .env.example .env  # hoặc tạo mới

# Chỉnh sửa .env với thông tin VPS
nano .env
```

File `.env` cho production:

```env
# Database (IP của VPS hoặc host database từ xa)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_VPS_MYSQL_PASSWORD
DB_NAME=BE_SHOPEFOOD

# Flask (production = false để tắt debug)
FLASK_ENV=production
FLASK_DEBUG=false
FLASK_PORT=5000
SECRET_KEY=TUO_CHAI_CUOng_secret_key_bat_ky

# CORS - chỉ domain production
CORS_ORIGINS=https://foodbee.io.vn,https://www.foodbee.io.vn

# Backend API
BE_API_URL=https://be.foodbee.io.vn

# Groq AI
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile
```

## 6. Khởi tạo database

> ⚠️ Chatbot dùng chung database `BE_SHOPEFOOD` với Laravel BE. Đảm bảo table `chatbot_order_sessions` được tạo.

```bash
# Test kết nối database
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME -e "SELECT 1;"

# Kiểm tra bảng chatbot_order_sessions đã có chưa
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME -e "DESCRIBE chatbot_order_sessions;"
```

Nếu bảng chưa có, tự động tạo khi chạy app (code đã có `_ensure_order_sessions_table()`).

## 7. Tạo systemd service (khởi động cùng máy)

```bash
sudo nano /etc/systemd/system/chatbot.service
```

Nội dung:

```ini
[Unit]
Description=FoodBee Chatbot AI
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/chatbot
Environment="PATH=/var/www/chatbot/venv/bin"
ExecStart=/var/www/chatbot/venv/bin/gunicorn \
    --workers 2 \
    --threads 2 \
    --bind 0.0.0.0:5000 \
    --timeout 120 \
    --access-logfile /var/www/chatbot/access.log \
    --error-logfile /var/www/chatbot/error.log \
    --log-level info \
    simple_chatbot_ai:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd và enable service
sudo systemctl daemon-reload
sudo systemctl enable chatbot
sudo systemctl start chatbot
sudo systemctl status chatbot
```

## 8. Cấu hình Nginx (reverse proxy)

```bash
apt install -y nginx
sudo nano /etc/nginx/sites-available/chatbot
```

Nội dung:

```nginx
server {
    listen 80;
    server_name chatbot.foodbee.io.vn;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout cho AI agent (dài vì Groq có thể chậm)
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. SSL với Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d chatbot.foodbee.io.vn
```

## 10. Cập nhật code (khi có thay đổi)

```bash
cd /var/www/chatbot

# Pull code mới
git pull origin master

# Cài thêm packages nếu requirements.txt thay đổi
source venv/bin/activate
pip install -r requirements.txt

# Restart chatbot
sudo systemctl restart chatbot
```

## 11. Monitoring & Logs

```bash
# Xem logs realtime
sudo journalctl -u chatbot -f

# Xem application logs
tail -f /var/www/chatbot/error.log
tail -f /var/www/chatbot/access.log

# Health check
curl https://chatbot.foodbee.io.vn/api/health
```

## 12. Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra MySQL đang chạy
sudo systemctl status mysql

# Test kết nối
mysql -h 127.0.0.1 -u root -p -e "SHOW DATABASES;"
```

### Chatbot không start
```bash
# Xem lỗi chi tiết
sudo journalctl -u chatbot -n 50
source venv/bin/activate
python3 simple_chatbot_ai.py  # chạy trực tiếp để xem lỗi
```

### Ram hết (OOM)
```bash
# Tăng swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Gunicorn workers bị kill
```bash
# Xem dmesg
dmesg | grep -i "kill"
# Tăng --timeout hoặc giảm --workers
```

## 13. Backup

```bash
# Script backup database
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME \
  | gzip > /backup/chatbot_db_$DATE.sql.gz
```

## Cấu trúc thư mục cuối cùng

```
/var/www/chatbot/
├── simple_chatbot_ai.py    # Main app
├── requirements.txt          # Dependencies
├── .env                      # Environment variables
├── chatbot.log              # Application logs
├── access.log              # Access logs
├── error.log               # Error logs
└── venv/                   # Python virtualenv
```
