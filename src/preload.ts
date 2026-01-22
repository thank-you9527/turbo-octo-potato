import { contextBridge, ipcRenderer } from "electron";

type GhostPayload = {
  ghostId: string;
  name: string;
  shellId: string;
  surfaceId: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
  hitboxes: { id: string; rect: [number, number, number, number] }[];
};

type LoadGhostOptions = {
  ghostId?: string;
  shellId?: string;
};

contextBridge.exposeInMainWorld("baseware", {
  loadGhost: (options: LoadGhostOptions = {}): Promise<GhostPayload> =>
    ipcRenderer.invoke("ghost:load", options),
  onGhostChange: (callback: (options: LoadGhostOptions) => void): void => {
    ipcRenderer.on("ghost:change", (_event, options: LoadGhostOptions) => callback(options));
  },
  onGhostReload: (callback: (options: LoadGhostOptions) => void): void => {
    ipcRenderer.on("ghost:reload", (_event, options: LoadGhostOptions) => callback(options));
  },
  onHitboxToggle: (callback: (payload: { enabled: boolean }) => void): void => {
    ipcRenderer.on("hitbox:toggle", (_event, payload: { enabled: boolean }) => callback(payload));
  },
  onShellScale: (callback: (payload: { scale: number }) => void): void => {
    ipcRenderer.on("shell:scale", (_event, payload: { scale: number }) => callback(payload));
  },
  onBalloonScale: (callback: (payload: { scale: number }) => void): void => {
    ipcRenderer.on("balloon:scale", (_event, payload: { scale: number }) => callback(payload));
  },
  onOptionsOpen: (callback: () => void): void => {
    ipcRenderer.on("options:open", () => callback());
  },
  emitWorldEvent: (type: string, payload: Record<string, unknown>): void => {
    ipcRenderer.send(type, payload);
  },
});
