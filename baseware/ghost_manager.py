from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from baseware.ghost_runner import GhostRunnerStub
from baseware.models import GhostManifest, PresenceRegistry, WorldSignal
from baseware.renderer import BalloonWindow, CharacterWindow, Renderer
from baseware.save_store import SaveStore
from baseware.shell_loader import ShellLoader
from baseware.world_signal_bus import WorldSignalBus


@dataclass
class GhostInstance:
    manifest: GhostManifest
    runner: GhostRunnerStub
    character: CharacterWindow
    balloon: BalloonWindow
    save_store: SaveStore


class GhostManager:
    def __init__(
        self,
        baseware_root: Path,
        signal_bus: WorldSignalBus,
        renderer: Renderer,
    ) -> None:
        self.baseware_root = baseware_root
        self.signal_bus = signal_bus
        self.renderer = renderer
        self.shell_loader = ShellLoader()
        self.presence = PresenceRegistry()
        self._installed: Dict[str, GhostManifest] = {}
        self._running: Dict[str, GhostInstance] = {}

    def scan_installed(self) -> None:
        ghosts_dir = self.baseware_root / "ghosts"
        self._installed.clear()
        if not ghosts_dir.exists():
            return
        for manifest_path in ghosts_dir.glob("*/manifest.json"):
            manifest = self._load_manifest(manifest_path)
            self._installed[manifest.id] = manifest

    def listGhosts(self) -> List[GhostManifest]:
        return list(self._installed.values())

    def listRunningGhosts(self) -> List[GhostManifest]:
        return [instance.manifest for instance in self._running.values()]

    def launchGhost(self, ghost_id: str) -> Optional[GhostInstance]:
        if ghost_id in self._running:
            return self._running[ghost_id]
        manifest = self._installed.get(ghost_id)
        if not manifest:
            logging.warning("Ghost %s not installed", ghost_id)
            return None
        ghost_dir = self.baseware_root / "ghosts" / ghost_id
        shell_dir = ghost_dir / manifest.shell_default
        shell = self.shell_loader.load(shell_dir, manifest.shell_surfaces)
        save_path = ghost_dir / manifest.storage_path
        save_store = SaveStore(save_path)
        save_store.ensure_initialized()
        runner = GhostRunnerStub(ghost_id)
        character = self.renderer.create_character(ghost_id, shell, self._on_click_factory(ghost_id))
        balloon = self.renderer.create_balloon(ghost_id, self._load_balloon_style(manifest))
        instance = GhostInstance(
            manifest=manifest,
            runner=runner,
            character=character,
            balloon=balloon,
            save_store=save_store,
        )
        self._running[ghost_id] = instance
        self.presence.running[ghost_id] = manifest.name
        self._publish_presence()
        self.signal_bus.subscribe("*", lambda signal, gid=ghost_id: self._dispatch_to_ghost(gid, signal))
        return instance

    def closeGhost(self, ghost_id: str) -> None:
        instance = self._running.pop(ghost_id, None)
        if not instance:
            return
        self.renderer.close(ghost_id)
        self.presence.running.pop(ghost_id, None)
        self._publish_presence()

    def request_delete(self, ghost_id: str) -> None:
        if ghost_id in self._running:
            self.closeGhost(ghost_id)
        ghost_dir = self.baseware_root / "ghosts" / ghost_id
        if ghost_dir.exists():
            for path in ghost_dir.rglob("*"):
                if path.is_file():
                    path.unlink()
            for path in sorted(ghost_dir.glob("**/*"), reverse=True):
                if path.is_dir():
                    path.rmdir()
            ghost_dir.rmdir()
        self._installed.pop(ghost_id, None)

    def _dispatch_to_ghost(self, ghost_id: str, signal: WorldSignal) -> None:
        instance = self._running.get(ghost_id)
        if not instance:
            return
        actions = instance.runner.handle_signal(signal)
        for action in actions:
            if action.type == "say" and action.text is not None:
                instance.balloon.say(action.text)
            elif action.type == "set_surface" and action.id is not None:
                instance.character.set_surface(action.id)
            elif action.type == "noop":
                continue

    def _load_manifest(self, manifest_path: Path) -> GhostManifest:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        return GhostManifest(
            id=data["id"],
            name=data["name"],
            version=data["version"],
            author=data["author"],
            entry_type=data["entry"]["type"],
            shell_default=data["shell"]["default"],
            shell_surfaces=data["shell"]["surfaces"],
            balloon_default=data["balloon"]["default"],
            storage_mode=data["storage"]["mode"],
            storage_path=data["storage"]["path"],
        )

    def _on_click_factory(self, ghost_id: str):
        def _on_click(hitbox_id: str, x: int, y: int, button: str) -> None:
            payload = {
                "type": "world.input.click",
                "ghost_id": ghost_id,
                "hitbox": hitbox_id,
                "button": button,
                "x": x,
                "y": y,
            }
            self.signal_bus.publish(WorldSignal(type="world.input.click", payload=payload))

        return _on_click

    def _publish_presence(self) -> None:
        payload = {
            "type": "world.presence.changed",
            "running": self.presence.snapshot(),
        }
        self.signal_bus.publish(WorldSignal(type="world.presence.changed", payload=payload))

    def _load_balloon_style(self, manifest: GhostManifest) -> Optional[dict]:
        balloon_path = self.baseware_root / "balloons" / manifest.balloon_default / "balloon.json"
        if not balloon_path.exists():
            return None
        return json.loads(balloon_path.read_text(encoding="utf-8")).get("style")
