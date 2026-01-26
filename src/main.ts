import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from "electron";
import path from "path";
import fs from "fs";

interface ShellSurface {
  file: string | null;
}

interface GhostPayload {
  ghostId: string;
  name: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
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

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const buildMenu = (): void => {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Close",
          accelerator: "Alt+F4",
          click: () => {
            mainWindow?.hide();
          },
        },
        {
          label: "Quit",
          accelerator: "Ctrl+Q",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const buildTray = (): void => {
  if (tray) {
    return;
  }
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAEUlEQVR4nGNgGAWjYBSMglEAAf8AAc1T6rQAAAAASUVORK5CYII="
  );
  tray = new Tray(icon);
  tray.setToolTip("UkaiHost");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "Hide",
        click: () => {
          mainWindow?.hide();
        },
      },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
};

const getBasewareRoot = (): string => {
  if (app.isPackaged) {
    const portableRoot = path.join(path.dirname(process.execPath), "baseware_root");
    if (fs.existsSync(portableRoot)) {
      return portableRoot;
    }
    return path.join(process.resourcesPath, "baseware_root");
  }
  return path.join(process.cwd(), "baseware_root");
};

const scanGhosts = (): { id: string; name: string }[] => {
  const basewareRoot = getBasewareRoot();
  const ghostsDir = path.join(basewareRoot, "ghosts");
  const result: { id: string; name: string }[] = [];
  if (!fs.existsSync(ghostsDir)) {
    console.warn("ghosts directory missing:", ghostsDir);
    return result;
  }
  const entries = fs.readdirSync(ghostsDir, { withFileTypes: true });
  console.log("ghosts directories:", entries.map((entry) => entry.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = path.join(ghostsDir, entry.name, "manifest.json");
    const manifestExists = fs.existsSync(manifestPath);
    console.log(`manifest ${entry.name}:`, manifestPath, "exists:", manifestExists);
    if (!manifestExists) {
      continue;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      result.push({ id: manifest.id ?? entry.name, name: manifest.name ?? entry.name });
    } catch (error) {
      console.error("Failed to read manifest:", manifestPath, error);
    }
  }
  return result;
};

const loadGhostPayload = (ghostId?: string, shellId?: string): GhostPayload => {
  const basewareRoot = getBasewareRoot();
  const availableGhosts = scanGhosts();
  const chosenGhostId =
    ghostId && availableGhosts.find((ghost) => ghost.id === ghostId)
      ? ghostId
      : availableGhosts[0]?.id ?? "default_ghost";
  const ghostRoot = path.join(basewareRoot, "ghosts", chosenGhostId);
  const manifestPath = path.join(ghostRoot, "manifest.json");
  console.log("load ghost manifest:", manifestPath, "exists:", fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const shellRoot = shellId ?? manifest.shell.default;
  const shellDir = path.join(ghostRoot, shellRoot);
  const surfacesPath = path.join(shellDir, manifest.shell.surfaces);
  console.log("load shell:", shellDir, "surfaces:", surfacesPath, "exists:", fs.existsSync(surfacesPath));
  const surfaces = JSON.parse(fs.readFileSync(surfacesPath, "utf-8"));
  const defaultSurfaceId = surfaces.default;
  const surface: ShellSurface | undefined = surfaces.surfaces?.[defaultSurfaceId];
  const surfaceFile = surface?.file
    ? path.join(shellDir, surface.file)
    : null;
  const resolvedSurfaceFile = surfaceFile && fs.existsSync(surfaceFile) ? surfaceFile : null;
  console.log("surface file:", surfaceFile, "exists:", Boolean(resolvedSurfaceFile));
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
    ghostId: chosenGhostId,
    name: manifest.name,
    surfaceFile: resolvedSurfaceFile,
    bubbleOffset,
  };
};

app.whenReady().then(() => {
  console.log("execPath:", process.execPath);
  console.log("cwd:", process.cwd());
  console.log("appPath:", app.getAppPath());
  console.log("resourcesPath:", process.resourcesPath);
  const basewareRoot = getBasewareRoot();
  console.log("baseware_root:", basewareRoot, "exists:", fs.existsSync(basewareRoot));
  ipcMain.handle("ghost:load", (_event, options?: { ghostId?: string; shellId?: string }) =>
    loadGhostPayload(options?.ghostId, options?.shellId)
  );
  ipcMain.handle("ghost:list", () => scanGhosts());
  ipcMain.handle("window:hide", () => {
    mainWindow?.hide();
  });
  ipcMain.handle("app:quit", () => {
    isQuitting = true;
    app.quit();
  });
  ipcMain.handle("menu:context", (_event, payload?: { ghostId?: string }) => {
    const ghosts = scanGhosts();
    const ghostItems = ghosts.length
      ? ghosts.map((ghost) => ({
          label: ghost.name,
          type: "radio" as const,
          checked: ghost.id === payload?.ghostId,
          click: () => {
            mainWindow?.webContents.send("ghost:switch", ghost.id);
          },
        }))
      : [{ label: "No ghosts found", enabled: false }];
    const menu = Menu.buildFromTemplate([
      {
        label: "Reload ghost",
        click: () => {
          mainWindow?.webContents.send("ghost:reload");
        },
      },
      {
        label: "Switch ghost",
        submenu: ghostItems,
      },
      { type: "separator" },
      {
        label: "Close",
        click: () => {
          mainWindow?.hide();
        },
      },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    if (mainWindow) {
      menu.popup({ window: mainWindow });
    }
  });
  createWindow();
  buildMenu();
  buildTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});
