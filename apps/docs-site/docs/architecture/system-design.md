---
sidebar_position: 1
---

# 🗺️ Kiến trúc Hệ thống FoodBee

Hệ thống FoodBee được thiết kế theo kiến trúc **Micro-services linh hoạt**, đảm bảo tính ổn định, khả năng mở rộng (Scalability) cao và xử lý dữ liệu thời gian thực (Real-time) cực kỳ mượt mà.

---

## 🏗️ Sơ đồ tổng quát

Hệ thống bao gồm **4 Module lõi** giao tiếp chặt chẽ với nhau thông qua RESTful API và hệ thống WebSockets:

| 🧩 Module | 🛠️ Nền tảng | 🎯 Chức năng chính |
| :--- | :--- | :--- |
| **Core API (Backend)** | Laravel 11 (PHP) | Trung tâm điều phối dữ liệu, quản lý Database, xử lý thanh toán và xác thực người dùng. |
| **Web App (Frontend)** | React 19 + Vite | Dành cho Quản trị viên (Admin) và Khách hàng sử dụng máy tính. |
| **Mobile App** | React Native (Expo) | Ứng dụng gốc (Native) trên iOS/Android dành riêng cho Shipper và Khách hàng di động. |
| **AI Engine (Chatbot)** | Python (Flask/FastAPI) | Xử lý ngôn ngữ tự nhiên (NLP) và thực thi logic gợi ý món ăn thông minh. |

---

## 📡 Luồng xử lý dữ liệu (Data Flow)

Để hiểu rõ cách các thành phần tương tác, dưới đây là quy trình xử lý của một đơn hàng tiêu biểu:

:::info 🔄 Vòng đời một đơn hàng
1. **Khách hàng đặt món:** Request gửi từ Web/Mobile đến **Core API** -> Kiểm tra số lượng món -> Tạo đơn hàng tạm thời.
2. **Thanh toán:** Tích hợp cổng PayOS tạo mã QR động. Khi khách quét mã thành công, PayOS gửi Webhook về Core API để xác nhận đã thanh toán.
3. **Điều phối Shipper:** Core API phát tín hiệu qua **WebSocket (Reverb)** đến các Shipper đang online gần nhất.
4. **Cập nhật Vị trí:** App của Shipper liên tục gửi tọa độ GPS lên Server. Khách hàng theo dõi lộ trình Shipper di chuyển trực tiếp trên bản đồ (Carto Maps).
5. **AI Phân tích (Hậu kỳ):** Dựa trên lịch sử đơn hàng vừa hoàn tất, **AI Engine** phân tích dữ liệu để làm cơ sở gợi ý cho các lần đặt món sau qua Chatbot.
:::

---

## 🛠️ Công nghệ sử dụng chuyên sâu

### 1. Server & Backend
- **Framework:** Laravel 11, yêu cầu PHP 8.2+.
- **Real-time Engine:** Laravel Reverb (Cung cấp WebSockets với độ trễ cực thấp).
- **Database:** MySQL 8.0 (Quản lý quan hệ và Transaction chặt chẽ).

### 2. Giao diện (Client-side)
- **Web:** React 19, React Router v7, Tailwind CSS, Axios.
- **Mobile:** React Native, Expo SDK, MapLibre GL, NativeWind.

### 3. Trí tuệ Nhân tạo (AI)
- **Ngôn ngữ:** Python 3.10+.
- **Thư viện AI/ML:** NLTK, Scikit-learn (sẽ nâng cấp lên LLM API trong tương lai).
