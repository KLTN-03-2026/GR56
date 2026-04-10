# Git Menu Workflow Guide

Tai lieu nay huong dan chi tiet cach dung script [git-menu.ps1](../git-rules/git-menu.ps1) va giai thich flow chay tung buoc.

## 1. Muc tieu script

Script tao mot menu don gian de thao tac Git nhanh trong terminal:

- Tao branch theo convention
- Commit voi prefix tu dong (`feat:`, `fix:`, ...)
- Push branch hien tai
- Cleanup branch sau khi merge

Script duoc viet bang PowerShell va chay theo vong lap menu.

## 2. File lien quan

- Script chinh: `git-rules/git-menu.ps1`
- Rule commit convention (neu da bat): `.githooks/commit-msg`
- Huong dan commit rule: `docs/GIT_COMMIT_RULE.md`

## 3. Cach chay script

Chay tu thu muc goc repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\git-rules\git-menu.ps1
```

Sau khi chay, menu hien cac option:

- `[1] Create Branch`
- `[2] Commit (auto prefix)`
- `[3] Push`
- `[4] Pull` (dang hien thi nhu vay trong menu)
- `[5] Cleanup Branch`
- `[0] Exit`

## 4. Giai thich flow tong quan

Flow chay la mot `while ($true)`:

1. Hien menu.
2. Nhan lua chon nguoi dung.
3. Chay function tuong ung.
4. Quay lai menu cho den khi chon `0`.

## 5. Giai thich tung option

### Option 1 - Create Branch

Function: `Create-Branch`

Flow:

1. Nguoi dung chon loai branch:
- `1 -> feature`
- `2 -> bugfix`
- `3 -> hotfix`
2. Nguoi dung nhap `Branch name`.
3. Script goi `Update-Base`:
- Uu tien base la `develop`.
- Neu repo khong co `develop` thi fallback sang `main`.
- `git checkout <base>`
- `git pull origin <base>`
4. Tao branch moi: `git checkout -b <type>/<branch-name>`.

Vi du:

```text
feature/login-form
bugfix/fix-null-user
hotfix/fix-prod-timeout
```

### Option 2 - Commit (auto prefix)

Function: `Commit-Changes`

Flow:

1. Lay branch hien tai (`git branch --show-current`).
2. Nguoi dung chon commit type:
- `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`
3. Nguoi dung nhap message khong prefix.
4. Script ghep message thanh: `<type>: <message>`.
5. Chay:
- `git add .`
- `git commit -m "<type>: <message>"`

Vi du:

```text
feat: add login form validation
fix: handle null profile response
```

### Option 3 - Push

Function: `Push-Branch`

Flow:

1. Lay branch hien tai.
2. Chay `git push origin <current-branch>`.

### Option 4 va 5 - Luu y quan trong

Theo code hien tai:

- Lua chon `"4"` dang goi `Cleanup-Branch`.
- Lua chon `"5"` khong duoc map trong `switch`.

Dieu nay co nghia:

- Menu hien `[4] Pull` nhung thuc te lai xoa branch.
- `[5] Cleanup Branch` hien thi tren menu nhung bam se ra `Invalid option`.

Ban can can than truoc khi bam option `4`.

## 6. Cleanup Branch dang chay the nao

Function: `Cleanup-Branch`

Flow:

1. Nhap ten branch can xoa.
2. Goi `Update-Base` (checkout/pull base branch).
3. Xoa local branch: `git branch -d <branch>`.
4. Xoa remote branch: `git push origin --delete <branch>`.

Chi dung khi branch da merge an toan.

## 7. Flow de xuat cho team

1. Chon `1` de tao branch moi tu `develop/main`.
2. Code thay doi.
3. Chon `2` de commit theo convention.
4. Chon `3` de push branch.
5. Tao PR vao `develop`.
6. Sau khi merge, cleanup branch.

## 8. Gioi han hien tai cua script

- Chua check `$LASTEXITCODE` sau moi lenh Git, nen co the bao thanh cong du lenh fail.
- Chua co ham `Pull` rieng du menu dang hien thi `Pull`.
- `git add .` se add toan bo file thay doi, can chu y de tranh commit nham.

## 9. De xuat nang cap (optional)

1. Sua mapping menu de `4 = Pull`, `5 = Cleanup`.
2. Them function `Pull-Branch` ro rang.
3. Dung ngay khi lenh Git fail (`if ($LASTEXITCODE -ne 0) { ...; return }`).
4. Them xac nhan truoc khi xoa branch remote.

