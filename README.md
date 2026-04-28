# 🎟️ Hệ Thống Bán Vé Concert Thông Minh (Agentic RAG)

## 📌 Giới thiệu
Dự án xây dựng hệ thống hỗ trợ bán vé concert tích hợp **AI Agentic RAG (Retrieval-Augmented Generation)** nhằm nâng cao trải nghiệm người dùng và tối ưu quy trình bán vé.

Hệ thống không chỉ giúp đặt vé mà còn:
- Tư vấn sự kiện bằng AI
- Gợi ý cá nhân hóa
- Cập nhật vé realtime
- Quản lý hệ thống chuyên nghiệp

---

## 🎯 Mục tiêu

### 👤 Người dùng
- Đăng ký / đăng nhập (Email, Google)
- Tìm kiếm & xem sự kiện
- Chọn chỗ ngồi (seat map)
- Đặt vé & thanh toán (VNPay, MoMo)
- Xem lịch sử mua vé
- Chatbot AI hỗ trợ
- Gợi ý sự kiện cá nhân hóa

### 🛠️ Quản trị viên
- Quản lý người dùng
- Quản lý sự kiện
- Quản lý đơn hàng
- Quản lý admin
- Thống kê doanh thu

---

## 🚀 Công nghệ sử dụng

### Frontend
- ReactJS

### Backend
- Node.js
- ExpressJS

### Database
- PostgreSQL
- pgvector (phục vụ RAG)

### AI & Realtime
- LangChain + LangGraph (Agentic RAG)
- Socket.IO (Realtime)

### Cloud & Media
- Neon Cloud (Database serverless)
- Cloudinary (quản lý ảnh/video)

---

## 🧠 Kiến trúc AI (Agentic RAG)

Hệ thống sử dụng:
- **RAG** → truy xuất dữ liệu thật (event, vé)
- **Agent** → tự quyết định hành động

AI có thể:
- Hiểu intent người dùng
- Query database realtime
- Gợi ý sự kiện phù hợp
- Hỏi ngược nếu thiếu thông tin

---

## 📊 Chức năng chính

### 🎫 Đặt vé & thanh toán
- Chọn khu vực
- Xem số lượng vé realtime
- Giữ vé tạm thời
- Thanh toán QR
- Tránh trùng vé (Socket.IO)

---

### 🤖 Chatbot AI
- Hiểu ngôn ngữ tự nhiên
- Tư vấn sự kiện
- Gợi ý vé
- Truy xuất dữ liệu thật (không “bịa”)

---

### 🎯 Gợi ý sự kiện
- Dựa trên:
  - Lịch sử mua vé
  - Từ khóa tìm kiếm
  - Sở thích người dùng
- Loại bỏ sự kiện đã mua
- Sắp xếp theo độ phù hợp

---

### 📜 Lịch sử đặt vé
- Xem tất cả đơn hàng
- Trạng thái thanh toán
- Chi tiết vé

---

## 🏗️ Kiến trúc hệ thống

Frontend (React)
        ↓
Backend (Node.js + Express)
        ↓
PostgreSQL + pgvector
        ↓
AI Agent (LangChain + RAG)

---

## 🗄️ Thiết kế Database (Tóm tắt)

### Users
- Thông tin người dùng
- Sở thích (JSONB)
- Trạng thái

### Events
- Tên sự kiện
- Nghệ sĩ
- Thời gian
- Địa điểm

### Zones
- Khu vực ghế
- Giá vé
- Số lượng

### Payments
- Đơn hàng
- Trạng thái thanh toán

### Chat_AI
- Lịch sử chatbot
- Intent
- Session

### RAG Documents
- Nội dung tri thức
- Embedding vector

---

## ⚡ Tính năng nổi bật

- 🔥 Realtime vé (Socket.IO)
- 🧠 AI tư vấn thông minh (Agentic RAG)
- 🎯 Gợi ý cá nhân hóa
- 🚀 Hiệu năng cao (Node.js + Neon)
- 📊 Quản trị đầy đủ

---

## 🖥️ Giao diện hệ thống

- Trang chủ (event trending)
- Tìm kiếm sự kiện
- Chi tiết sự kiện
- Sơ đồ ghế
- Giỏ hàng & thanh toán
- Chatbot AI
- Dashboard admin

---

## 📈 Kết luận

Hệ thống:
- Giải quyết vấn đề chatbot truyền thống
- Tăng trải nghiệm người dùng
- Hỗ trợ quản lý hiệu quả
- Có khả năng mở rộng lớn

---

## 🔮 Hướng phát triển

- Tích hợp thêm AI recommendation nâng cao
- Mở rộng đa quốc gia
- Tối ưu performance AI
- Thêm mobile app

---

## 👥 Nhóm thực hiện
- Nguyễn Hoàng Huynh (Nhóm trưởng)
- Trần Diệp Anh Kiệt
- Phùng Minh Vũ

---

## 📅 Thời gian
TP. Hồ Chí Minh, 05/2026
