import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import fs from "fs";

interface ShellSurface {
  file: string | null;
  hitboxes: Hitbox[];
}

interface GhostPayload {
  ghostId: string;
  name: string;
  shellId: string;
  surfaceId: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
  hitboxes: Hitbox[];
}

interface Hitbox {
  id: string;
  rect: [number, number, number, number];
}

interface LoadGhostOptions {
  ghostId?: string;
  shellId?: string;
}

const DEFAULT_GHOST_ID = "blank_ghost";
const DEFAULT_SHELL_ID = "001";

const createWindow = (): BrowserWindow => {
  const mainWindow: BrowserWindow = new BrowserWindow({
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

  return mainWindow;
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

const getGhostRoot = (ghostId: string): string => {
  const basewareRoot = getBasewareRoot();
  return path.join(basewareRoot, "ghosts", ghostId);
};

const getGhostIds = (): string[] => {
  const ghostsRoot = path.join(getBasewareRoot(), "ghosts");
  if (!fs.existsSync(ghostsRoot)) {
    return [];
  }
  return fs
    .readdirSync(ghostsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const getShellIds = (ghostId: string): string[] => {
  const shellRoot = path.join(getGhostRoot(ghostId), "shell");
  if (!fs.existsSync(shellRoot)) {
    return [];
  }
  return fs
    .readdirSync(shellRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const parseHitboxes = (rawHitboxes: unknown): Hitbox[] => {
  if (!Array.isArray(rawHitboxes)) {
    return [];
  }
  return rawHitboxes
    .map((hitbox) => {
      if (!hitbox || typeof hitbox !== "object") {
        return null;
      }
      const record = hitbox as Record<string, unknown>;
      if (Array.isArray(record.rect) && record.rect.length === 4) {
        const rect = record.rect.map((value) => Number(value)) as [number, number, number, number];
        if (rect.every((value) => Number.isFinite(value))) {
          return { id: String(record.id ?? ""), rect };
        }
      }
      return null;
    })
    .filter((hitbox): hitbox is Hitbox => Boolean(hitbox?.id));
};

const parseLegacyHitboxes = (rawHitboxes: unknown): Hitbox[] => {
  if (!Array.isArray(rawHitboxes)) {
    return [];
  }
  return rawHitboxes
    .map((hitbox) => {
      if (!hitbox || typeof hitbox !== "object") {
        return null;
      }
      const record = hitbox as Record<string, unknown>;
      const x = Number(record.x);
      const y = Number(record.y);
      const w = Number(record.w);
      const h = Number(record.h);
      if ([x, y, w, h].every((value) => Number.isFinite(value))) {
        return { id: String(record.id ?? ""), rect: [x, y, x + w, y + h] };
      }
      return null;
    })
    .filter((hitbox): hitbox is Hitbox => Boolean(hitbox?.id));
};

const loadSurfacesFromJson = (surfacesPath: string): {
  defaultSurfaceId: string;
  surfaces: Record<string, ShellSurface>;
} | null => {
  if (!fs.existsSync(surfacesPath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(surfacesPath, "utf-8")) as Record<string, unknown>;
  const defaultSurfaceId =
    String(raw.default_surface ?? raw.default ?? "0") || "0";
  const surfacesRecord = (raw.surfaces ?? {}) as Record<string, unknown>;
  const surfaces: Record<string, ShellSurface> = {};
  Object.entries(surfacesRecord).forEach(([surfaceId, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }
    const surfaceRecord = value as Record<string, unknown>;
    const fileValue = surfaceRecord.file;
    const file =
      typeof fileValue === "string" && fileValue.trim().length > 0
        ? fileValue.trim()
        : null;
    const parsedHitboxes = parseHitboxes(surfaceRecord.hitboxes);
    const hitboxes = parsedHitboxes.length > 0
      ? parsedHitboxes
      : parseLegacyHitboxes(surfaceRecord.hitbox);
    surfaces[surfaceId] = { file, hitboxes };
  });
  return { defaultSurfaceId, surfaces };
};

const parseSurfacesFallback = (surfacesPath: string): {
  defaultSurfaceId: string;
  surfaces: Record<string, ShellSurface>;
} | null => {
  if (!fs.existsSync(surfacesPath)) {
    return null;
  }
  const lines = fs.readFileSync(surfacesPath, "utf-8").split(/\r?\n/);
  const surfaces: Record<string, ShellSurface> = {};
  let defaultSurfaceId = "";
  lines.forEach((line) => {
    const trimmed = line.split("#")[0]?.trim();
    if (!trimmed) {
      return;
    }
    let id = "0";
    let file = trimmed;
    if (trimmed.includes(":")) {
      const [left, right] = trimmed.split(":").map((value) => value.trim());
      if (right) {
        id = left || id;
        file = right;
      }
    } else if (trimmed.includes(",")) {
      const [left, right] = trimmed.split(",").map((value) => value.trim());
      if (right) {
        id = left || id;
        file = right;
      }
    } else if (/\s/.test(trimmed)) {
      const [left, right] = trimmed.split(/\s+/, 2);
      if (right) {
        id = left || id;
        file = right;
      }
    } else if (trimmed.startsWith("surface")) {
      const match = trimmed.match(/\d+/);
      if (match) {
        id = match[0];
      }
    }
    if (!defaultSurfaceId) {
      defaultSurfaceId = id;
    }
    surfaces[id] = { file, hitboxes: [] };
  });
  return { defaultSurfaceId: defaultSurfaceId || "0", surfaces };
};

const parseBubbleOffsetFromMeta = (metaPath: string): { x: number; y: number } | null => {
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as Record<string, unknown>;
  const descript = (meta.descript ?? {}) as Record<string, unknown>;
  const offsetString = descript["balloon.offset"];
  if (typeof offsetString === "string") {
    const parts = offsetString.split(",").map((part) => Number(part.trim()));
    if (parts.length === 2 && parts.every((part) => Number.isFinite(part))) {
      return { x: parts[0], y: parts[1] };
    }
  }
  const offsetX = Number(descript["balloon.offsetx"]);
  const offsetY = Number(descript["balloon.offsety"]);
  if (Number.isFinite(offsetX) && Number.isFinite(offsetY)) {
    return { x: offsetX, y: offsetY };
  }
  return null;
};

const parseBubbleOffsetFromDescript = (descriptPath: string): { x: number; y: number } | null => {
  if (!fs.existsSync(descriptPath)) {
    return null;
  }
  const lines = fs.readFileSync(descriptPath, "utf-8").split(/\r?\n/);
  let offsetX: number | null = null;
  let offsetY: number | null = null;
  lines.forEach((line) => {
    const trimmed = line.split("#")[0]?.trim();
    if (!trimmed || !trimmed.includes("=")) {
      return;
    }
    const [key, value] = trimmed.split("=").map((part) => part.trim());
    if (key === "sakura.balloon.offsetx") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        offsetX = numeric;
      }
    }
    if (key === "sakura.balloon.offsety") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        offsetY = numeric;
      }
    }
  });
  if (offsetX !== null && offsetY !== null) {
    return { x: offsetX, y: offsetY };
  }
  return null;
};

const loadGhostPayload = (options: LoadGhostOptions = {}): GhostPayload => {
  const ghostId = options.ghostId ?? DEFAULT_GHOST_ID;
  const shellId = options.shellId ?? DEFAULT_SHELL_ID;
  const ghostRoot = getGhostRoot(ghostId);
  const manifestPath = path.join(ghostRoot, "manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? (JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, unknown>)
    : {};
  const ghostName = typeof manifest.name === "string" ? manifest.name : ghostId;
  const shellRoot = path.join(ghostRoot, "shell");
  const shellAssetsRoot = path.join(shellRoot, shellId);
  const surfacesPath = path.join(shellRoot, "surfaces.json");
  const metaPath = path.join(shellRoot, "meta.json");
  const fallbackSurfacesPath = path.join(shellAssetsRoot, "surfaces.txt");
  const fallbackDescriptPath = path.join(shellAssetsRoot, "descript.txt");
  const surfacesJson = loadSurfacesFromJson(surfacesPath) ?? parseSurfacesFallback(fallbackSurfacesPath);
  const defaultSurfaceId = surfacesJson?.defaultSurfaceId ?? "0";
  const surface: ShellSurface | undefined = surfacesJson?.surfaces?.[defaultSurfaceId];
  const surfaceFile = surface?.file
    ? path.resolve(shellRoot, surface.file)
    : null;
  const resolvedSurfaceFile = surfaceFile && fs.existsSync(surfaceFile) ? surfaceFile : null;
  let bubbleOffset: { x: number; y: number } | null = null;
  bubbleOffset = parseBubbleOffsetFromMeta(metaPath) ?? parseBubbleOffsetFromDescript(fallbackDescriptPath);

  return {
    ghostId,
    name: ghostName,
    shellId,
    surfaceId: defaultSurfaceId,
    surfaceFile: resolvedSurfaceFile,
    bubbleOffset,
    hitboxes: surface?.hitboxes ?? [],
  };
};

app.whenReady().then(() => {
  let currentGhostId = DEFAULT_GHOST_ID;
  let currentShellId = DEFAULT_SHELL_ID;
  let shellScale = 100;
  let balloonScale = 100;
  let hitboxOverlayEnabled = false;
  const mainWindow = createWindow();

  ipcMain.handle("ghost:load", (_event, options: LoadGhostOptions = {}) => {
    if (options.ghostId) {
      currentGhostId = options.ghostId;
    }
    if (options.shellId) {
      currentShellId = options.shellId;
    }
    return loadGhostPayload({ ghostId: currentGhostId, shellId: currentShellId });
  });

  ipcMain.on("world.input.click", (_event, payload) => {
    console.log("world.input.click", payload);
  });

  const buildContextMenu = (): Menu => {
    const ghostIds = getGhostIds();
    const shellIds = getShellIds(currentGhostId);
    return Menu.buildFromTemplate([
      {
        label: "Change ghost",
        submenu: ghostIds.map((ghostId) => ({
          label: ghostId,
          type: "radio",
          checked: ghostId === currentGhostId,
          click: () => {
            currentGhostId = ghostId;
            if (!getShellIds(currentGhostId).includes(currentShellId)) {
              currentShellId = DEFAULT_SHELL_ID;
            }
            mainWindow.webContents.send("ghost:change", {
              ghostId: currentGhostId,
              shellId: currentShellId,
            });
          },
        })),
      },
      {
        label: "Shell",
        submenu: shellIds.map((shellId) => ({
          label: shellId,
          type: "radio",
          checked: shellId === currentShellId,
          click: () => {
            currentShellId = shellId;
            mainWindow.webContents.send("ghost:change", {
              ghostId: currentGhostId,
              shellId: currentShellId,
            });
          },
        })),
      },
      {
        label: "Balloon",
        submenu: [{ label: "Default balloon (stub)", enabled: false }],
      },
      {
        label: "Shell scaling",
        submenu: [50, 75, 100, 125, 150].map((scale) => ({
          label: `${scale}%`,
          type: "radio",
          checked: scale === shellScale,
          click: () => {
            shellScale = scale;
            mainWindow.webContents.send("shell:scale", { scale });
          },
        })),
      },
      {
        label: "Balloon scaling",
        submenu: [50, 75, 100, 125, 150].map((scale) => ({
          label: `${scale}%`,
          type: "radio",
          checked: scale === balloonScale,
          click: () => {
            balloonScale = scale;
            mainWindow.webContents.send("balloon:scale", { scale });
          },
        })),
      },
      {
        label: "Options",
        click: () => {
          mainWindow.webContents.send("options:open");
        },
      },
      { type: "separator" },
      {
        label: "Close",
        click: () => {
          mainWindow.hide();
        },
      },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
      { type: "separator" },
      {
        label: "Debug",
        submenu: [
          {
            label: "Toggle hitbox overlay",
            type: "checkbox",
            checked: hitboxOverlayEnabled,
            click: () => {
              hitboxOverlayEnabled = !hitboxOverlayEnabled;
              mainWindow.webContents.send("hitbox:toggle", { enabled: hitboxOverlayEnabled });
            },
          },
          {
            label: "Reload current ghost",
            click: () => {
              mainWindow.webContents.send("ghost:reload", {
                ghostId: currentGhostId,
                shellId: currentShellId,
              });
            },
          },
        ],
      },
    ]);
  };

  mainWindow.webContents.on("context-menu", () => {
    const menu = buildContextMenu();
    menu.popup({ window: mainWindow });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    return;
  }
  // Keep the app running until Quit is selected.
});
