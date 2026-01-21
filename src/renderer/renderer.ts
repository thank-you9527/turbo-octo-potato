type GhostPayload = {
  name: string;
  surfaceFile: string | null;
  bubbleOffset: { x: number; y: number } | null;
};

declare global {
  interface Window {
    baseware: {
      loadGhost: () => Promise<GhostPayload>;
    };
  }
}

const applyGhost = (payload: GhostPayload): void => {
  const bubble = document.getElementById("bubble") as HTMLDivElement;
  const bubbleText = document.getElementById("bubble-text") as HTMLDivElement;
  const surface = document.getElementById("surface") as HTMLImageElement;
  const placeholder = document.getElementById("placeholder") as HTMLDivElement;

  bubbleText.textContent = `${payload.name} ready`;

  if (payload.surfaceFile) {
    surface.src = `file://${payload.surfaceFile}`;
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
  const payload = await window.baseware.loadGhost();
  applyGhost(payload);
});
