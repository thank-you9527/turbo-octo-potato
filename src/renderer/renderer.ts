type GhostPayload = {
  name: string;
  surfaceFile: string | null;
  surfaceUrl: string | null;
  bubbleOffset: { x: number; y: number } | null;
};

type BasewareApi = {
  loadGhost: () => Promise<GhostPayload>;
};

const applyGhost = (payload: GhostPayload): void => {
  const bubble = document.getElementById("bubble") as HTMLDivElement;
  const bubbleText = document.getElementById("bubble-text") as HTMLDivElement;
  const surface = document.getElementById("surface") as HTMLImageElement;
  const placeholder = document.getElementById("placeholder") as HTMLDivElement;

  bubbleText.textContent = `${payload.name} ready`;

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

window.addEventListener("DOMContentLoaded", async () => {
  const api = (window as Window & { baseware: BasewareApi }).baseware;
  const payload = await api.loadGhost();
  applyGhost(payload);
});

export {};
