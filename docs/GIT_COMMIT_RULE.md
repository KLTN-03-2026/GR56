# Git Commit Rule (Conventional Commits)

Tai lieu nay huong dan cach viet commit message theo chuan:
https://www.conventionalcommits.org/en/v1.0.0/#summary

## 1) Format bat buoc

```
<type>[optional scope][!]: <description>
```

Vi du:

```
feat(auth): add login with Google
fix: handle null profile response
refactor(api)!: rename user endpoint
```

## 2) Danh sach `type` hop le

- `build`
- `chore`
- `ci`
- `docs`
- `feat`
- `fix`
- `perf`
- `refactor`
- `revert`
- `style`
- `test`

## 3) Y nghia nhanh

- `scope` la tuy chon, dung de chi module (`auth`, `ui`, `api`, ...)
- `!` danh dau breaking change
- `description` viet ngan gon, ro rang, dung tieng Anh

## 4) Vi du sai format

- `update homepage`
- `feat add login`
- `fix(auth) add null check`

## 5) Kich hoat hook cho repo local

Sau khi clone repo, moi thanh vien can chay:

```bash
git config core.hooksPath .githooks
```

Kiem tra da set dung chua:

```bash
git config --get core.hooksPath
```

Ket qua mong doi:

```
.githooks
```

## 6) Luu y

- Hook nay kiem tra dong dau tien cua commit message.
- `Merge` va `Revert` message do Git tu sinh duoc cho phep.
- Co the bo qua hook bang `--no-verify`, chi nen dung khi that su can.

