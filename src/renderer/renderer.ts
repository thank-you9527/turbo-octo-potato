type RendererGhostPayload = {
  name: string;
  surfaceFile: string | null;
  surfaceUrl: string | null;
  bubbleOffset: { x: number; y: number } | null;
  ghostId: string;
};

type BasewareApi = {
  loadGhost: (options?: { ghostId?: string; shellId?: string }) => Promise<RendererGhostPayload>;
  listGhosts: () => Promise<{ id: string; name: string }[]>;
  showContextMenu: (payload: { ghostId?: string }) => Promise<void>;
  onGhostSwitch: (callback: (ghostId: string) => void) => void;
  onGhostReload: (callback: () => void) => void;
  hideWindow: () => Promise<void>;
  quitApp: () => Promise<void>;
};

let currentGhostId: string | null = null;

const applyGhost = (payload: RendererGhostPayload): void => {
  const bubble = document.getElementById("bubble") as HTMLDivElement;
  const bubbleText = document.getElementById("bubble-text") as HTMLDivElement;
  const surface = document.getElementById("surface") as HTMLImageElement;
  const placeholder = document.getElementById("placeholder") as HTMLDivElement;

  bubbleText.textContent = `${payload.name} ready`;
  currentGhostId = payload.ghostId;

  if (payload.surfaceFile) {
    surface.src = payload.surfaceUrl ?? "";
    surface.style.display = "block";
    placeholder.style.display = "none";
  } else {
    surface.style.display = "none";
    placeholder.style.display = "flex";
  }

  if (payload.bubbleOffset) {
    const x = payload.bubbleOffset.x;
    const y = payload.bubbleOffset.y;
    bubble.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
  }
};

const loadGhost = async (ghostId?: string): Promise<void> => {
  const api = (window as unknown as { baseware: BasewareApi }).baseware;
  const payload = await api.loadGhost(ghostId ? { ghostId } : undefined);
  applyGhost(payload);
};

window.addEventListener("DOMContentLoaded", async () => {
  const api = (window as unknown as { baseware: BasewareApi }).baseware;
  await loadGhost();
  api.onGhostSwitch((ghostId) => {
    void loadGhost(ghostId);
  });
  api.onGhostReload(() => {
    void loadGhost(currentGhostId ?? undefined);
  });
  window.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    void api.showContextMenu({ ghostId: currentGhostId ?? undefined });
  });
});

export {};
