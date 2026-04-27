---
sidebar_position: 1
---

# 📜 Quy tắc Git Commit (FoodBee Standard)

Để đảm bảo lịch sử mã nguồn (Git History) luôn rõ ràng, dễ đọc và dễ dàng theo dõi lỗi (tracking bugs), toàn bộ thành viên trong dự án FoodBee phải tuân thủ nghiêm ngặt chuẩn **Conventional Commits**.

---

## 🏗️ Cấu trúc cơ bản của một Commit

Một commit hợp lệ phải tuân theo định dạng sau:

```text
<type>: <subject>
```

:::warning Lưu ý
- `<type>`: Là một trong các từ khóa quy định bên dưới (viết thường).
- `<subject>`: Mô tả ngắn gọn bằng **Tiếng Anh**, bắt đầu bằng động từ ở thì hiện tại, không viết hoa chữ cái đầu và không có dấu chấm ở cuối.
:::

---

## 🏷️ Các loại Commit (Types) được phép sử dụng

Dưới đây là danh sách các nhãn (type) bắt buộc phải sử dụng ở đầu mỗi commit message:

| 🏷️ Type | 📝 Ý nghĩa | 💡 Ví dụ |
| :--- | :--- | :--- |
| **feat** | Thêm một tính năng mới vào hệ thống. | `feat: add user authentication` |
| **fix** | Sửa một lỗi (bug) đang tồn tại. | `fix: resolve login crash issue` |
| **docs** | Thêm hoặc sửa đổi tài liệu (README, swagger...). | `docs: update API endpoints for user` |
| **style** | Chỉnh sửa format code (khoảng trắng, dấu phẩy, v.v.) không làm thay đổi logic. | `style: format code with Prettier` |
| **refactor** | Cải trúc lại mã nguồn, không thêm tính năng hay sửa lỗi nhưng code sạch hơn. | `refactor: simplify user fetch logic` |
| **test** | Thêm hoặc sửa các đoạn code kiểm thử (Unit test). | `test: add unit tests for payment webhook` |
| **chore** | Cập nhật các tác vụ phụ (cấu hình build, dependencies, tooling). | `chore: update Laravel framework to 11.2` |
| **perf** | Tối ưu hóa hiệu năng đoạn code hiện tại. | `perf: improve database query speed` |
| **revert** | Hoàn tác lại một commit trước đó. | `revert: undo previous commit due to bug` |

---

## ✅ Ví dụ về các Commit hợp lệ và không hợp lệ

### 🟢 Hợp lệ (Nên làm)
```bash
git commit -m "feat: add mapbox integration for shipper"
git commit -m "fix: resolve undefined variable in payment controller"
git commit -m "docs: update system architecture diagram"
```

### 🔴 Không hợp lệ (Tuyệt đối tránh)
```bash
git commit -m "Fix lỗi đăng nhập" # Sai type (viết hoa), subject tiếng Việt.
git commit -m "update code" # Không có type, subject quá chung chung.
git commit -m "feat: Add new map." # Subject viết hoa chữ đầu, có dấu chấm ở cuối.
```

:::tip Mẹo nhỏ
Nếu bạn muốn giải thích chi tiết hơn về commit, hãy sử dụng flag `-m` nhiều lần:
`git commit -m "feat: add push notifications" -m "This feature uses Firebase Cloud Messaging to send real-time alerts."`
:::
