# 📘 Git Workflow Chuẩn Doanh Nghiệp

Tài liệu này mô tả quy trình sử dụng Git theo chuẩn doanh nghiệp, phù hợp cho teamwork, đồ án lớn và môi trường production.

---

# 1. Mô hình Git Flow

Sử dụng mô hình phân nhánh rõ ràng:

```
main (production)
  ↑
develop (integration)
  ↑
feature / bugfix / hotfix
```

## Vai trò từng branch

- `main`: code chạy production, luôn ổn định
- `develop`: nơi tích hợp các feature trước khi release
- `feature/*`: phát triển tính năng mới
- `bugfix/*`: sửa lỗi trong develop
- `hotfix/*`: sửa lỗi khẩn cấp trên production

---

# 2. Quy tắc đặt tên branch

Format:
```
<type>/<task-name>
```

Ví dụ:
```bash
feature/auth-login
feature/user-profile
bugfix/fix-null-pointer
hotfix/fix-payment-critical
```

---

# 3. Quy trình làm việc chuẩn

## Bước 1: Cập nhật code mới nhất
```bash
git checkout develop
git pull origin develop
```

## Bước 2: Tạo branch mới
```bash
git checkout -b feature/auth-login
```

## Bước 3: Code + commit
```bash
git add .
git commit -m "feat: implement login API"
```

## Bước 4: Push branch
```bash
git push origin feature/auth-login
```

## Bước 5: Tạo Pull Request (PR)
- Base: `develop`
- Review bởi team
- Chạy CI/CD (nếu có)

## Bước 6: Merge
- Chỉ merge khi:
  - Code đã được review
  - Test pass

---

# 4. Quy tắc Commit Message (Chuẩn Conventional Commits)

Format:
```
<type>(scope): <message>
```

## Các type chính:
- `feat`: thêm tính năng
- `fix`: sửa lỗi
- `refactor`: cải thiện code
- `docs`: tài liệu
- `style`: format
- `test`: test
- `chore`: config, build

## Ví dụ:
```bash
feat(auth): add login API
fix(user): handle null exception
refactor(db): optimize query
```

---

# 5. Quy tắc Pull Request (PR)

Mỗi PR cần:
- Tiêu đề rõ ràng
- Mô tả:
  - Làm gì?
  - Tại sao?
  - Ảnh hưởng gì?
- Link task (Jira/Trello nếu có)

## Checklist PR
- [ ] Code build OK
- [ ] Không conflict
- [ ] Đã test
- [ ] Không chứa file nhạy cảm

---

# 6. Code Review

Nguyên tắc:
- Review logic trước style
- Không approve nếu:
  - Code khó hiểu
  - Có bug
- Suggest cải thiện, không chỉ trích

---

# 7. Quản lý Conflict

Khi conflict:
```bash
git pull origin develop
```

Sửa file → commit lại

⚠️ Không merge khi chưa resolve xong

---

# 8. Quy tắc bảo mật

Không commit:
- `.env`
- API keys
- mật khẩu

Sử dụng:
```
.gitignore
```

---

# 9. Quy trình Release

## Release thường
```
develop → main
```

## Hotfix
```
main → hotfix → main → develop
```

---

# 10. Cleanup branch

Sau khi merge:
```bash
git branch -d feature/auth-login
git push origin --delete feature/auth-login
```

---

# 11. Best Practices

- Commit nhỏ, rõ ràng
- Không push code lỗi
- Luôn pull trước khi push
- Không làm việc trực tiếp trên main
- Viết code dễ đọc hơn code thông minh

---

# 12. Công cụ hỗ trợ

- GitHub / GitLab
- CI/CD (GitHub Actions, GitLab CI)
- Code Review tools

---

# 🚀 Tổng kết

Workflow chuẩn:
```
develop → feature → PR → review → merge → release
```

Áp dụng đúng quy trình giúp:
- Giảm conflict
- Dễ quản lý code
- Tăng chất lượng sản phẩm

---

**Phiên bản:** Enterprise Git Workflow  
**Mục đích:** Đồ án / Doanh nghiệp / Teamwork chuyên nghiệp 🚀

