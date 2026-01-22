export {};

declare global {
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

  interface Window {
    baseware: {
      loadGhost: (options?: LoadGhostOptions) => Promise<GhostPayload>;
      onGhostChange: (callback: (options: LoadGhostOptions) => void) => void;
      onGhostReload: (callback: (options: LoadGhostOptions) => void) => void;
      onHitboxToggle: (callback: (payload: { enabled: boolean }) => void) => void;
      onShellScale: (callback: (payload: { scale: number }) => void) => void;
      onBalloonScale: (callback: (payload: { scale: number }) => void) => void;
      onOptionsOpen: (callback: () => void) => void;
      emitWorldEvent: (type: string, payload: Record<string, unknown>) => void;
    };
  }
}
