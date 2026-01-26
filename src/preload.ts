import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "url";

type GhostPayload = {
  name: string;
  surfaceFile: string | null;
  surfaceUrl: string | null;
  bubbleOffset: { x: number; y: number } | null;
  ghostId: string;
};

contextBridge.exposeInMainWorld("baseware", {
  loadGhost: async (options?: { ghostId?: string; shellId?: string }): Promise<GhostPayload> => {
    const payload = (await ipcRenderer.invoke("ghost:load", options)) as GhostPayload;
    const surfaceUrl = payload.surfaceFile
      ? pathToFileURL(payload.surfaceFile).toString()
      : null;
    return {
      ...payload,
      surfaceUrl,
    };
  },
  listGhosts: (): Promise<{ id: string; name: string }[]> => ipcRenderer.invoke("ghost:list"),
  showContextMenu: (payload: { ghostId?: string }) =>
    ipcRenderer.invoke("menu:context", payload),
  onGhostSwitch: (callback: (ghostId: string) => void) => {
    ipcRenderer.on("ghost:switch", (_event, ghostId: string) => callback(ghostId));
  },
  onGhostReload: (callback: () => void) => {
    ipcRenderer.on("ghost:reload", () => callback());
  },
  hideWindow: () => ipcRenderer.invoke("window:hide"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
});
