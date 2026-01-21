import { contextBridge, ipcRenderer } from "electron";

type GhostPayload = {
  name: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
};

contextBridge.exposeInMainWorld("baseware", {
  loadGhost: (): Promise<GhostPayload> => ipcRenderer.invoke("ghost:load"),
});
