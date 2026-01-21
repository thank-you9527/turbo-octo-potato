# Baseware MVP

This repository contains a minimal Baseware MVP implementation based on the provided spec.

## 玩家版使用方式 (Windows)

1. 從 GitHub Releases 下載 Baseware 發行包（不要用原始碼 zip）。
2. 確認 `Baseware.exe` 與 `baseware_root/` 在同一層資料夾。
3. 雙擊 `Baseware.exe` 啟動。
4. 要新增人格時，直接把人格資料夾放到 `baseware_root/ghosts/`。

> 提醒：GitHub 的「Source code.zip」只包含原始碼，不會有 `dist/` 或 `.exe`。

## Git LFS setup (required for PNG assets)

This repo tracks `*.png` via Git LFS. If Git LFS is missing, images will appear as text
pointer files and runtime image loading will fail.

**First-time clone steps:**

```bash
git lfs install
git lfs pull
```

**Notes:**

- Adding `.gitattributes` does not retroactively convert already-committed PNGs to LFS.
  If someone commits PNGs before enabling LFS, migrate or re-add them to LFS afterward.
- CI/build runners must have Git LFS available and perform `git lfs pull` (or equivalent)
  before rendering, packaging, or tests that read images.
