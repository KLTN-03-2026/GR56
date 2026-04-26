# 🤖 Module AI Chatbot - Trái tim thông minh của FoodBee

FoodBee tích hợp một hệ thống trí tuệ nhân tạo riêng biệt để tư vấn và gợi ý món ăn dựa trên nhu cầu của người dùng.

## 🧠 Nguyên lý hoạt động
Hệ thống sử dụng **Xử lý ngôn ngữ tự nhiên (NLP)** để hiểu ý định của khách hàng:
1. **Tiếp nhận yêu cầu:** Người dùng nhập tin nhắn (VD: "Tôi muốn ăn món gì đó cay cay").
2. **Xử lý ngôn ngữ:** Module Python phân tích các từ khóa quan trọng (Intent, Entity).
3. **Gợi ý món ăn:** Dựa trên tập dữ liệu sản phẩm hiện có để đưa ra các lựa chọn phù hợp nhất.

## 🛠️ Công nghệ sử dụng
- **Ngôn ngữ:** Python 3.10+
- **Thư viện AI:** NLTK, Scikit-learn.
- **API Bridge:** Kết nối với Laravel Backend qua RESTful API.

## 🚀 Hướng dẫn khởi chạy
1. Truy cập vào thư mục: `cd Chatbot`
2. Cài đặt thư viện: `pip install -r requirements.txt`
3. Khởi chạy script AI: `python simple_chatbot_ai.py`

## 🔗 Tích hợp
Hệ thống AI hoạt động như một dịch vụ độc lập (Microservice), cho phép dễ dàng nâng cấp lên các mô hình ngôn ngữ lớn (LLM) như GPT-4 hoặc Gemini trong tương lai mà không ảnh hưởng đến logic của Backend chính.
