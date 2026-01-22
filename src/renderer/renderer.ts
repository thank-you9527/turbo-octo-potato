export {};

let currentPayload: GhostPayload | null = null;
let hitboxOverlayEnabled = false;
let shellScale = 100;
let balloonScale = 100;

const applyBubbleOffset = (payload: GhostPayload): void => {
  const bubble = document.getElementById("bubble") as HTMLDivElement;
  if (payload.bubbleOffset) {
    bubble.style.setProperty("--bubble-offset-x", `${payload.bubbleOffset.x}px`);
    bubble.style.setProperty("--bubble-offset-y", `${payload.bubbleOffset.y}px`);
  } else {
    bubble.style.setProperty("--bubble-offset-x", "0px");
    bubble.style.setProperty("--bubble-offset-y", "0px");
  }
  bubble.style.setProperty("--balloon-scale", `${balloonScale / 100}`);
};

const renderHitboxes = (payload: GhostPayload): void => {
  const hitboxLayer = document.getElementById("hitbox-layer") as HTMLDivElement;
  hitboxLayer.innerHTML = "";
  if (!hitboxOverlayEnabled) {
    return;
  }
  payload.hitboxes.forEach((hitbox) => {
    const overlay = document.createElement("div");
    overlay.className = "hitbox";
    const [x1, y1, x2, y2] = hitbox.rect;
    overlay.style.left = `${x1}px`;
    overlay.style.top = `${y1}px`;
    overlay.style.width = `${Math.max(0, x2 - x1)}px`;
    overlay.style.height = `${Math.max(0, y2 - y1)}px`;
    overlay.textContent = hitbox.id;
    hitboxLayer.appendChild(overlay);
  });
};

const applyShellScale = (): void => {
  const character = document.getElementById("character") as HTMLDivElement;
  character.style.setProperty("--shell-scale", `${shellScale / 100}`);
};

const setBubbleText = (text: string): void => {
  const bubbleText = document.getElementById("bubble-text") as HTMLDivElement;
  bubbleText.textContent = text;
};

const applyGhost = (payload: GhostPayload): void => {
  const surface = document.getElementById("surface") as HTMLImageElement;
  const placeholder = document.getElementById("placeholder") as HTMLDivElement;

  if (payload.surfaceFile) {
    surface.src = `file://${payload.surfaceFile}`;
    surface.style.display = "block";
    placeholder.style.display = "none";
  } else {
    surface.style.display = "none";
    placeholder.style.display = "flex";
  }

  applyBubbleOffset(payload);
  applyShellScale();
  renderHitboxes(payload);
};

const resolveHitbox = (payload: GhostPayload, x: number, y: number): string | null => {
  const scaledX = x / (shellScale / 100);
  const scaledY = y / (shellScale / 100);
  const match = payload.hitboxes.find((hitbox) => {
    const [x1, y1, x2, y2] = hitbox.rect;
    return scaledX >= x1 && scaledX <= x2 && scaledY >= y1 && scaledY <= y2;
  });
  return match?.id ?? null;
};

const emitWorldClick = (
  payload: GhostPayload,
  hitboxId: string | null,
  x: number,
  y: number,
): void => {
  window.baseware.emitWorldEvent("world.input.click", {
    hitbox: hitboxId,
    surfaceId: payload.surfaceId,
    x,
    y,
  });
};

const handleGhostLoad = async (options: LoadGhostOptions = {}): Promise<void> => {
  const payload = await window.baseware.loadGhost(options);
  currentPayload = payload;
  applyGhost(payload);
  setBubbleText("我醒了。");
  window.baseware.emitWorldEvent("world.boot", { ghostId: payload.ghostId });
};

window.addEventListener("DOMContentLoaded", async () => {
  await handleGhostLoad();

  const character = document.getElementById("character") as HTMLDivElement;
  character.addEventListener("click", (event) => {
    if (!currentPayload) {
      return;
    }
    const rect = character.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hitboxId = resolveHitbox(currentPayload, x, y);
    emitWorldClick(currentPayload, hitboxId, x, y);
    if (hitboxId === "head") {
      setBubbleText("你摸我頭幹嘛？");
    } else if (hitboxId) {
      setBubbleText(`命中 ${hitboxId}`);
    } else {
      setBubbleText("？");
    }
  });

  window.baseware.onGhostChange((options) => {
    handleGhostLoad(options);
  });

  window.baseware.onGhostReload((options) => {
    handleGhostLoad(options);
  });

  window.baseware.onHitboxToggle((payload) => {
    hitboxOverlayEnabled = payload.enabled;
    if (currentPayload) {
      renderHitboxes(currentPayload);
    }
  });

  window.baseware.onShellScale((payload) => {
    shellScale = payload.scale;
    applyShellScale();
    if (currentPayload) {
      renderHitboxes(currentPayload);
    }
  });

  window.baseware.onBalloonScale((payload) => {
    balloonScale = payload.scale;
    if (currentPayload) {
      applyBubbleOffset(currentPayload);
    }
  });

  window.baseware.onOptionsOpen(() => {
    setBubbleText("Options 尚未提供。");
  });
});
