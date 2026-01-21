from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Optional

from baseware.models import ShellDefinition


@dataclass
class CharacterWindow:
    ghost_id: str
    shell: ShellDefinition
    on_click: Callable[[str, int, int, str], None]
    current_surface: str

    def set_surface(self, surface_id: str) -> None:
        if surface_id not in self.shell.surfaces:
            logging.warning("Unknown surface: %s", surface_id)
            return
        self.current_surface = surface_id
        logging.info("[%s] surface -> %s", self.ghost_id, surface_id)

    def simulate_click(self, x: int, y: int, button: str = "left") -> None:
        surface = self.shell.surfaces.get(self.current_surface)
        if not surface:
            logging.warning("No surface for click on %s", self.ghost_id)
            return
        for hitbox in surface.hitboxes:
            if hitbox.x <= x <= hitbox.x + hitbox.w and hitbox.y <= y <= hitbox.y + hitbox.h:
                self.on_click(hitbox.id, x, y, button)
                return
        logging.info("[%s] click miss (%s,%s)", self.ghost_id, x, y)


@dataclass
class BalloonWindow:
    ghost_id: str
    style: Optional[dict]

    def say(self, text: str) -> None:
        logging.info("[%s] says: %s", self.ghost_id, text)


class Renderer:
    def __init__(self) -> None:
        self._characters: dict[str, CharacterWindow] = {}
        self._balloons: dict[str, BalloonWindow] = {}

    def create_character(self, ghost_id: str, shell: ShellDefinition, on_click: Callable[[str, int, int, str], None]) -> CharacterWindow:
        character = CharacterWindow(
            ghost_id=ghost_id,
            shell=shell,
            on_click=on_click,
            current_surface=shell.default_surface,
        )
        self._characters[ghost_id] = character
        return character

    def create_balloon(self, ghost_id: str, style: Optional[dict]) -> BalloonWindow:
        balloon = BalloonWindow(ghost_id=ghost_id, style=style)
        self._balloons[ghost_id] = balloon
        return balloon

    def close(self, ghost_id: str) -> None:
        self._characters.pop(ghost_id, None)
        self._balloons.pop(ghost_id, None)
