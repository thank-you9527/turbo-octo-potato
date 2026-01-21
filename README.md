# Baseware MVP

This repository contains a minimal Baseware MVP implementation based on the provided spec.

## Run

```bash
python -m baseware.app
```

The interactive prompt accepts:

- `click` to simulate a hitbox click on the default ghost.
- any other signal name to broadcast a custom world signal.
- `quit` to shut down.

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
