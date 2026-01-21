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
                file=details.get("file"),
                hitboxes=hitboxes,
            )
        bubble_offset = self._load_bubble_offset(shell_dir)
        return ShellDefinition(
            default_surface=data.get("default", "idle"),
            surfaces=surfaces,
            bubble_offset=bubble_offset,
        )

    def _load_bubble_offset(self, shell_dir: Path) -> tuple[int, int] | None:
        meta_path = shell_dir / "meta.json"
        if not meta_path.exists():
            return None
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        descript = meta.get("descript", {})
        raw_offset = descript.get("balloon.offset")
        if not isinstance(raw_offset, str):
            return None
        parts = [part.strip() for part in raw_offset.split(",")]
        if len(parts) != 2:
            return None
        try:
            return int(parts[0]), int(parts[1])
        except ValueError:
            return None
