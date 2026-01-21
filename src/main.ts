import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";

interface ShellSurface {
  file: string | null;
}

interface GhostPayload {
  name: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const rendererPath = path.join(__dirname, "renderer", "index.html");
  mainWindow.loadFile(rendererPath).catch((error) => {
    console.error("Failed to load renderer:", error);
  });
};

const getBasewareRoot = (): string => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "baseware_root");
  }
  return path.join(process.cwd(), "baseware_root");
};

const loadGhostPayload = (): GhostPayload => {
  const basewareRoot = getBasewareRoot();
  const ghostRoot = path.join(basewareRoot, "ghosts", "default_ghost");
  const manifestPath = path.join(ghostRoot, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const shellDir = path.join(ghostRoot, manifest.shell.default);
  const surfacesPath = path.join(shellDir, manifest.shell.surfaces);
  const surfaces = JSON.parse(fs.readFileSync(surfacesPath, "utf-8"));
  const defaultSurfaceId = surfaces.default;
  const surface: ShellSurface | undefined = surfaces.surfaces?.[defaultSurfaceId];
  const surfaceFile = surface?.file
    ? path.join(shellDir, surface.file)
    : null;
  const resolvedSurfaceFile = surfaceFile && fs.existsSync(surfaceFile) ? surfaceFile : null;
  const metaPath = path.join(shellDir, "meta.json");
  let bubbleOffset: { x: number; y: number } | null = null;
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const rawOffset = meta?.descript?.["balloon.offset"];
    if (typeof rawOffset === "string") {
      const parts = rawOffset.split(",").map((part: string) => Number(part.trim()));
      if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        bubbleOffset = { x: parts[0], y: parts[1] };
      }
    }
  }

  return {
    name: manifest.name,
    surfaceFile: resolvedSurfaceFile,
    bubbleOffset,
  };
};

app.whenReady().then(() => {
  ipcMain.handle("ghost:load", () => loadGhostPayload());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
