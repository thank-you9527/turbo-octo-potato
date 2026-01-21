# Baseware MVP

This repository contains a minimal Baseware MVP implementation based on the provided spec.

## 玩家版使用方式 (Windows)

1. 下載並解壓縮 Baseware 發行包。
2. 確認 `Baseware.exe` 與 `baseware_root/` 在同一層資料夾。
3. 雙擊 `Baseware.exe` 啟動。
4. 要新增人格時，直接把人格資料夾放到 `baseware_root/ghosts/`。

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
