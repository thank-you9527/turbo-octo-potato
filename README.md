# UkaiHost MVP

## What this repo is / what users can do now

UkaiHost MVP is a minimal desktop shell that loads a ghost from `baseware_root/ghosts/`, shows a character window, and displays a bubble with text. It is packaged as a **portable Windows app** so players can drop new ghost folders into `baseware_root/ghosts/` and launch the app by double-clicking `UkaiHost.exe`.

Current capabilities:
- Loads the default ghost from `baseware_root/ghosts/default_ghost/`.
- Shows a transparent character window with a placeholder if PNG assets are missing.
- Shows a bubble window and applies the balloon offset from shell metadata.

## Quick start (download & run)

1. Go to **GitHub Releases** for this repo.
2. Download the latest `UkaiHost-win-portable.zip` (not “Source code”).
3. Unzip the archive.
4. Double-click `UkaiHost.exe`.
5. To add new ghosts, drop folders into `baseware_root/ghosts/` next to `UkaiHost.exe`.

> Note: the GitHub “Source code” zip **does not** include `dist/` or `UkaiHost.exe`.

## Portable package layout (what files should exist)

After unzipping, you should see this layout:

```
UkaiHost.exe
baseware_root/
  ghosts/
    default_ghost/
      manifest.json
      shell/
        surfaces.json
    blank_ghost/
      manifest.json
      ghost/
        events/
      shell/
        surfaces.json
  balloons/
  shells/
  plugins/
  runtime/
```

**Important paths:**
- `UkaiHost.exe` lives next to `baseware_root/`.
- Ghosts go in `baseware_root/ghosts/`.

## Close vs Quit behavior (IMPORTANT)

This app uses a tray icon to restore the window when it is hidden.

- **Close** (File menu or Alt+F4) **hides the app to the tray**.
- **Quit** (File menu or Ctrl+Q) **exits the app**.

Tray menu includes **Show**, **Hide**, and **Quit**.

## How to build locally (dev + build)

> Local builds require Node.js 20 and Git LFS (for PNG assets). If your environment cannot access npm, use the GitHub Actions build instead.

```bash
# Install dependencies
npm install

# Start dev window
npm run dev

# Build portable Windows exe
npm run build
```

Expected outputs:
- `dist/UkaiHost.exe`
- `dist/UkaiHost-win-portable.zip`

## How to build via GitHub Actions (recommended)

We use GitHub Actions to build the portable Windows executable in a clean environment.

1. Run the **Build Windows Portable** workflow or push a `v*` tag.
3. Download artifacts from the workflow run:
   - `UkaiHost-win-portable.zip`
   - `UkaiHost.exe`

The build workflow:
- Clears proxy settings.
- Validates npm registry access.
- Uses `npm install` (no lockfile required).
- Uploads build artifacts.

## How to create a release/tag so artifacts exist

Artifacts are generated on tag pushes that match `v*`.

1. Create a tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
2. GitHub Actions will build and upload artifacts.
3. Create a GitHub Release and attach `UkaiHost-win-portable.zip` if desired.

## How to merge Codex branch into main (step-by-step)

This is the **How to contribute** guide (from merge step onwards):

1. Open a PR from the Codex branch into `main`.
2. Review:
   - Verify the README updates match behavior changes.
   - Confirm build artifacts are expected (`UkaiHost.exe`, `UkaiHost-win-portable.zip`).
3. Merge the PR (squash or merge commit is fine).
4. Pull `main` locally and tag a release (`vX.Y.Z`) if you want artifacts.
5. Confirm the Release page contains the artifacts or that the Actions run exposes them for download.

## Troubleshooting

- **PNG files look like text / images fail to load**
  - Git LFS is missing. Run:
    ```bash
    git lfs install
    git lfs pull
    ```
  - If an LFS object is missing, re-run `git lfs pull` or re-download the release artifact. The Windows build workflow currently checks out without LFS as a temporary mitigation, so missing LFS objects will appear as placeholder PNGs in CI builds.
  - The default ghost PNGs in this repo are currently tiny placeholder images to avoid missing-object failures until LFS assets are restored.

- **No `dist/` or `.exe` after downloading from GitHub**
  - You downloaded the **Source code zip**. Use Releases instead.

- **`ffmpeg.dll` missing on Windows**
  - Ensure you built with `electron-builder` and that the build completed successfully.
  - Re-run the build in GitHub Actions (recommended) to get a clean portable output.

- **“No workflow” / Actions didn’t run**
  - Confirm the workflow file exists in `.github/workflows/` on the target branch.
  - Ensure the workflow trigger matches your action (manual dispatch or tag push).

- **`npm install` / `npm ci` fails with 403**
  - The environment is likely forcing a proxy. The Windows build workflow clears proxy settings before installing.
  - If GitHub-hosted runners are blocked, configure an internal npm registry and update the workflow.

- **`npm install` fails because of missing dependencies**
  - Re-run the build or ensure the npm registry is reachable in the workflow.

## Maintenance rules

When behavior or structure changes, **update this README**:
- **Menu items or Close/Quit behavior** → update “Close vs Quit behavior”.
- **Build output names/paths** → update “How to build locally” + “How to build via GitHub Actions”.
- **Folder layout** (`baseware_root`, `ghosts`, `shells`, `balloons`) → update “Portable package layout”.
- **Runtime requirements** (Node version, Git LFS) → update “How to build locally” + Troubleshooting.

## Keeping README accurate (checklist)

- If you rename a menu item → update **Close vs Quit behavior** (and screenshots if added).
- If you change workflows → update **How to build via GitHub Actions**.
- If you change file layout → update **Portable package layout**.
- If you change build output names/paths → update **How to build locally** + **How to build via GitHub Actions**.
- If you add new runtime requirements → update **How to build locally** + **Troubleshooting**.
