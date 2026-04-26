# Hướng Dẫn Sử Dụng Git Workflow Menu (`git-menu.ps1`)

`git-menu.ps1` là một bộ script viết bằng PowerShell có kèm giao diện dòng lệnh tương tác. Chức năng chính là tự động hóa và chuẩn hóa quy trình làm việc với Git, đặc biệt trong việc tuân thủ cấu trúc tạo nhánh và tạo commit theo chuẩn **Conventional Commits**.

---

## 🚀 Cách Khởi Chạy

Mở trỉnh duyệt PowerShell (hoặc sử dụng Terminal hỗ trợ PowerShell trên VSCode, Windows Terminal) tại thư mục `git-rules` hoặc thư mục dự án nơi chứa file và tiếp tục gõ:

```powershell
.\git-menu.ps1
```

> **Lưu ý:** Đôi khi chính sách bảo mật hệ thống Windows (Execution Policy) sẽ không cho bạn chạy file `.ps1`. Nếu sinh lỗi đỏ chữ dòng bạn có thể khắc phục nhanh bằng cách chạy lệnh cho phép quyền truy cập script:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` sau đó chạy lại.

---

## 🛠 Các Tính Năng Trong Menu

Khi khởi chạy, thiết bị terminal sẽ hiển thị danh sách Menu có định dạng như dưới đây:

```text
====================================
       GIT WORKFLOW MENU
====================================
[1] Create Branch
[2] Commit
[3] Push
[4] Pull
[5] Cleanup Branch
[6] Checkout Branch
[0] Exit
------------------------------------
```

Từ bàn phím gõ trực tiếp các số từ `1-6` hoặc `0` để chọn chức năng.

Dưới đây sẽ là chi tiết sử dụng cho các chức năng:

### `[1] Create Branch` (Tạo Nhánh Mới)

Hỗ trợ quy trình chuẩn cho việc tách chi nhánh:

1. Chọn theo loại hình công việc bạn đang thực hiện (Branch type):
   - `1. feature` (Hỗ trợ code tạo chức năng mới).
   - `2. bugfix` (Sửa lỗi cho quy trình bình thường).
   - `3. hotfix` (Giải pháp sửa lỗi đặc biệt ngay ở môi trường vận hành lớn).
2. Nhập **Tên nhánh** mong muốn với mô tả ngắn gọn và ko dấu (ví dụ: `update-login-ui`).
3. Khai báo **Nhánh gốc**. Hệ thống sẽ truy vấn vào Github (remote) danh mục nhánh hiện tại để bạn lấy cơ sở phân nhánh (thường là `main` hặc `develop`).
4. Script tự động lấy và phân nhánh sang môi trường branch với định dạng `<loại_nhánh>/<tên_nhánh>`.

### `[2] Commit` (Tạo Commit Chuẩn Conventional)

Đóng gói (Commit) những dòng sự thay đổi trên File:

1. Sẽ là câu hỏi các nhánh thông thường bao gồm: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Theo danh sách tuỳ chọn bấm số từ [1-10].
2. **Scope**: Lĩnh vực tuỳ chọn, phạm vi thay đổi file, bỏ trống bằng cách ấn enter. Được ứng dụng như `<auth, users, login, ui>...`
3. **Commit header**: Tiêu đề ngắn gọn tóm tắt việc bạn vừa làm (không để trống).
4. **Commit body**: Bạn có thể giải thích dài dòng ở đây trên nhiều dòng chữ. Điểm đặc biệt là ấn **Enter 2 Lần** để đóng quá trình viết Body này lại.
5. **Breaking Change**: Nếu bản cập nhật làm hỏng đi logic cũ hệ thống, bạn cần Ghi "Y" (đồng ý) và diễn giải chi tiết sau.
6. Xem lại (`Preview`) nội dung vừa hoàn thành. Chọn `Y` để chốt. Mọi source file có độ lệch chuẩn sẽ được `git add .` và đưa nội dung Commit này hoàn thiện vào History thay đổi.

### `[3] Push` (Đẩy Code Lên Máy Chủ / Github)

Lấy chi nhánh trên local và tự động push cấu trúc này lên máy chủ bằng `git push -u origin <branch hiện tại>`.

### `[4] Pull` (Đồng Bộ & Lấy Dữ Liệu Máy Chủ)

> ⚠️ **CẢNH BÁO:** Chức năng này mang tuỳ chỉnh `Hard Reset`. Có nghĩa nếu bạn có file thay đổi, chưa Commit thành công thì toàn bộ dữ liệu code local của bạn sẽ xoá sổ và mất mãi mãi.

1. Thiết lập chọn nhánh để pull từ remote.
2. Terminal đưa ra dòng xác nhận `"Warning: Reset local changes? (y/n)"`, nhấn `y` để nhất trí.
3. Chức năng sẽ `checkout` thay đổi trên remote sau đó ép đè mã nguồn thay thế thành mới nhất (`git reset --hard` và x xoá bỏ rác dư bằng lệnh `git clean -df`).
4. Lấy hoàn toàn nội dung cập nhật nhanh qua bước `git pull origin <branch>`.

### `[5] Cleanup Branch` (Dọn Dẹp Nhánh Rác)

Được hỗ trợ dọn nhánh dư rác sau khi sáp nhập nội dung trên remote hoàn thiện.

1. Chọn một chi nhánh trên máy chủ đang muốn tiêu huỷ.
2. Nếu chắc chắn ấn phím `y`. Tiến trình sẽ xoá dứt điểm nhánh đó từ remote bằng chỉ dẫn `git push origin --delete <branch>`.

### `[6] Checkout Branch` (Đổi Nhánh)

Giúp đổi nhánh và chuyển đổi giao diện an toàn:

1. Danh sách có mặt ở trên server sẽ hiển thị.
2. Nếu máy của bạn không mang branch đấy, hệ thống tự fetch và checkout chuyển thẳng nhánh.

### `[0] Exit` (Thoát Ứng Dụng)

Dừng chức năng tự sửa giao diện quay về Terminal thường.

---

## 📌 Các Lưu Ý Quan Trọng

- **Khả Năng Huỷ Bỏ Giữa Chừng:** Tại bất kì bước nào thiết bị đưa ra lệnh bắt nhập biến dạng dòng `Your choice` hoặc có tuỳ chọn **`[0] Cancel`** bạn có thể huỷ ngang quy trình hiện tại mà không làm hỏng git của bạn để về mục chọn menu nhánh chính.
- Script đã được fix UTF-8 chuẩn Việt hoá hỗ trợ có dấu ngay trên cửa sổ Windows Command line ở quy trình bạn viết nội dung Body lúc commit sẽ không bị hỏng cấu trúc.
