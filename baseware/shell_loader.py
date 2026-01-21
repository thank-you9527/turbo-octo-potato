from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from baseware.models import Hitbox, ShellDefinition, Surface


class ShellLoader:
    def load(self, shell_dir: Path, surfaces_file: str) -> ShellDefinition:
        data = json.loads((shell_dir / surfaces_file).read_text(encoding="utf-8"))
        surfaces: Dict[str, Surface] = {}
        for surface_id, details in data.get("surfaces", {}).items():
            hitboxes = [
                Hitbox(
                    id=hitbox["id"],
                    x=int(hitbox["x"]),
                    y=int(hitbox["y"]),
                    w=int(hitbox["w"]),
                    h=int(hitbox["h"]),
                )
                for hitbox in details.get("hitbox", [])
            ]
            surfaces[surface_id] = Surface(
                id=surface_id,
                file=details["file"],
                hitboxes=hitboxes,
            )
        return ShellDefinition(default_surface=data.get("default", "idle"), surfaces=surfaces)
