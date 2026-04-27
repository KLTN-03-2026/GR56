# 🏗️ Kiến trúc Hệ thống FoodBee

Hệ thống FoodBee được thiết kế theo kiến trúc **Micro-services** hiện đại, đảm bảo tính ổn định, khả năng mở rộng cao và xử lý dữ liệu thời gian thực mượt mà.

## 🗺️ Sơ đồ tổng quát
Hệ thống bao gồm 4 Module chính tương tác với nhau qua RESTful API và WebSockets:

1.  **Core API (Backend):** Xây dựng trên Laravel 11, đóng vai trò là trung tâm điều phối dữ liệu, quản lý thanh toán và xác thực.
2.  **Web Interface (Frontend):** Sử dụng React 19, tối ưu hóa cho quản trị viên và người dùng Desktop.
3.  **Mobile Application:** Phát triển bằng React Native, dành cho Khách hàng và Shipper trên iOS/Android.
4.  **AI Engine (Chatbot):** Module Python riêng biệt xử lý ngôn ngữ tự nhiên và logic gợi ý.

## 🛠️ Công nghệ cốt lõi
- **Server:** Laravel 11, PHP 8.2+
- **Real-time:** Laravel Reverb (WebSocket)
- **Database:** MySQL
- **Frontend/Mobile:** React, React Native, Tailwind CSS
- **AI/ML:** Python, Flask/FastAPI

## 📡 Luồng xử lý dữ liệu
1. **Khách hàng đặt món:** Request gửi đến Core API -> Kiểm tra kho -> Tạo đơn hàng.
2. **Thanh toán:** Tích hợp PayOS tạo mã QR -> Webhook xác nhận thanh toán thành công.
3. **Điều phối Shipper:** Core API phát tín hiệu qua WebSocket đến các Shipper gần nhất.
4. **AI Gợi ý:** Dựa trên lịch sử đơn hàng, AI Engine phân tích và trả kết quả qua Chatbot.
