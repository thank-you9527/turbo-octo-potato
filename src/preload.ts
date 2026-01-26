import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "url";

type GhostPayload = {
  name: string;
  surfaceFile: string | null;
  surfaceUrl: string | null;
  bubbleOffset: { x: number; y: number } | null;
};

contextBridge.exposeInMainWorld("baseware", {
  loadGhost: async (): Promise<GhostPayload> => {
    const payload = (await ipcRenderer.invoke("ghost:load")) as GhostPayload;
    const surfaceUrl = payload.surfaceFile
      ? pathToFileURL(payload.surfaceFile).toString()
      : null;
    return {
      ...payload,
      surfaceUrl,
    };
  },
});
