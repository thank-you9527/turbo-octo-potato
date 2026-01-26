from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


class SaveStore:
    def __init__(self, save_path: Path) -> None:
        self.save_path = save_path
        self._created_at: str | None = None

    def ensure_initialized(self) -> None:
        if self.save_path.exists():
            payload = json.loads(self.save_path.read_text(encoding="utf-8"))
            self._created_at = payload.get("created_at")
            return
        self.save_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "created_at": datetime.now().astimezone().isoformat(),
            "vars": {},
        }
        self._created_at = payload["created_at"]
        self.save_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def load(self) -> dict:
        self.ensure_initialized()
        payload = json.loads(self.save_path.read_text(encoding="utf-8"))
        self._created_at = payload.get("created_at")
        return payload

    def save(self, vars_payload: dict) -> None:
        self.ensure_initialized()
        created_at = self._created_at or datetime.now().astimezone().isoformat()
        payload = {
            "created_at": created_at,
            "vars": vars_payload,
        }
        self.save_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
