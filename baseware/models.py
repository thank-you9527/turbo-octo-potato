from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional


@dataclass(frozen=True)
class Hitbox:
    id: str
    x: int
    y: int
    w: int
    h: int


@dataclass(frozen=True)
class Surface:
    id: str
    file: str
    hitboxes: List[Hitbox]


@dataclass(frozen=True)
class ShellDefinition:
    default_surface: str
    surfaces: Dict[str, Surface]


@dataclass(frozen=True)
class GhostManifest:
    id: str
    name: str
    version: str
    author: str
    entry_type: str
    shell_default: str
    shell_surfaces: str
    balloon_default: str
    storage_mode: str
    storage_path: str


@dataclass(frozen=True)
class WorldSignal:
    type: str
    payload: Dict[str, Any]


@dataclass(frozen=True)
class Action:
    type: str
    text: Optional[str] = None
    id: Optional[str] = None


@dataclass
class PresenceRegistry:
    running: Dict[str, str] = field(default_factory=dict)

    def snapshot(self) -> List[Dict[str, str]]:
        return [{"id": ghost_id, "name": name} for ghost_id, name in self.running.items()]


Subscriber = Callable[[WorldSignal], None]


@dataclass(frozen=True)
class PowerStatus:
    level: Optional[int]
    charging: Optional[bool]


@dataclass(frozen=True)
class NetworkStatus:
    online: Optional[bool]
    connection_type: Optional[str]


@dataclass
class ClockPayload:
    time: datetime
    timezone: str
    minute: int
    hour: int
    weekday: int

    def to_payload(self) -> Dict[str, Any]:
        return {
            "type": "world.clock",
            "time": self.time.isoformat(),
            "timezone": self.timezone,
            "minute": self.minute,
            "hour": self.hour,
            "weekday": self.weekday,
        }
