from __future__ import annotations

from baseware.models import Action, WorldSignal


class GhostRunnerStub:
    def __init__(self, ghost_id: str) -> None:
        self.ghost_id = ghost_id

    def handle_signal(self, signal: WorldSignal) -> list[Action]:
        message = f"（stub）收到 {signal.type} 了"
        return [
            Action(type="say", text=message),
            Action(type="set_surface", id="smile"),
        ]
