from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class SaveStore:
    def __init__(self, save_path: Path) -> None:
        self.save_path = save_path

    def ensure_initialized(self) -> None:
        if self.save_path.exists():
            return
        self.save_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "created_at": datetime.now().astimezone().isoformat(),
            "vars": {},
        }
        self.save_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
