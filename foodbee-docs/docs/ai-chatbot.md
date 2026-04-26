---
sidebar_position: 2
---

# 🤖 Tích hợp AI Chatbot

FoodBee không chỉ là một ứng dụng giao đồ ăn, mà còn được tích hợp một hệ thống Trí tuệ Nhân tạo (AI) riêng biệt. Module Chatbot này đóng vai trò như một **"trợ lý ẩm thực cá nhân"**, tư vấn và gợi ý món ăn chính xác dựa trên nhu cầu và lịch sử của người dùng.

---

## 🧠 Nguyên lý hoạt động

Hệ thống sử dụng các kỹ thuật **Xử lý ngôn ngữ tự nhiên (NLP)** để thấu hiểu ý định thực sự của khách hàng, thay vì chỉ tìm kiếm theo từ khóa cứng nhắc:

:::info 🔄 Quy trình Xử lý
1. **Tiếp nhận yêu cầu:** Khách hàng nhập tin nhắn vào khung chat (VD: *"Hôm nay trời mưa, tôi muốn ăn món gì đó cay cay và nóng"*).
2. **Phân tích Ngữ nghĩa (NLP):** Module Python phân tích câu nói, trích xuất các từ khóa quan trọng (Intent - Ý định, Entity - Thực thể).
3. **Gợi ý Thông minh:** Thuật toán Machine Learning đối chiếu Intent với cơ sở dữ liệu món ăn và trả về danh sách các lựa chọn phù hợp nhất theo thời gian thực.
:::

---

## 🛠️ Công nghệ & Yêu cầu hệ thống

| 🧩 Thành phần | 📌 Chi tiết |
| :--- | :--- |
| **Ngôn ngữ Core** | Python 3.10+ |
| **Thư viện AI** | NLTK (Phân tích cú pháp), Scikit-learn (Mô hình học máy) |
| **Giao thức Kết nối** | RESTful API (Kết nối độc lập với Laravel Backend) |

---

## 🚀 Hướng dẫn khởi chạy Local

Để chạy thử Module AI Chatbot trên máy tính của bạn, hãy thực hiện các lệnh sau:

### Bước 1: Di chuyển & Cài đặt thư viện
```bash
cd Chatbot
pip install -r requirements.txt
```

### Bước 2: Khởi chạy AI Engine
```bash
python simple_chatbot_ai.py
```

:::tip Kiến trúc Microservice
Hệ thống AI được thiết kế hoạt động như một dịch vụ độc lập (Microservice). Điều này mang lại lợi thế khổng lồ: Trong tương lai, chúng ta có thể dễ dàng nâng cấp hoặc thay thế bằng các Mô hình Ngôn ngữ Lớn (LLM) hiện đại như **GPT-4**, **Gemini**, hay **Claude** mà hoàn toàn không làm gián đoạn hệ thống Backend chính (Laravel).
:::
