from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from baseware.models import Action, WorldSignal
from baseware.save_store import SaveStore
from baseware.yaml_loader import parse_yaml


@dataclass
class YamlEvent:
    name: str
    conditions: List[dict]
    actions: List[dict]


class YamlGhostRunner:
    def __init__(self, ghost_id: str, ghost_dir: Path, save_store: SaveStore) -> None:
        self.ghost_id = ghost_id
        self.ghost_dir = ghost_dir
        self.save_store = save_store
        self.events = self._load_events()
        self.vars = self._load_vars()
        self._apply_initial_state()
        self._save_vars()

    def handle_signal(self, signal: WorldSignal) -> list[Action]:
        actions: list[Action] = []
        context = self._build_context(signal)
        for event in self.events:
            if not self._matches_event(event.name, signal.type):
                continue
            if not self._conditions_met(event.conditions, context):
                continue
            actions.extend(self._execute_actions(event.actions, context))
        return actions

    def _load_events(self) -> list[YamlEvent]:
        events_dir = self.ghost_dir / "ghost" / "events"
        if not events_dir.exists():
            return []
        events: list[YamlEvent] = []
        for path in sorted(events_dir.glob("*.yaml")):
            data = parse_yaml(path.read_text(encoding="utf-8"))
            if not data:
                continue
            events.append(
                YamlEvent(
                    name=str(data.get("event", "")),
                    conditions=data.get("when", []),
                    actions=data.get("actions", []),
                )
            )
        return events

    def _load_vars(self) -> dict[str, Any]:
        payload = self.save_store.load()
        return payload.get("vars", {})

    def _apply_initial_state(self) -> None:
        state_path = self.ghost_dir / "ghost" / "state.yaml"
        if not state_path.exists():
            return
        data = parse_yaml(state_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            for key, value in data.items():
                self.vars.setdefault(key, value)

    def _save_vars(self) -> None:
        self.save_store.save(self.vars)

    def _matches_event(self, event_name: str, signal_type: str) -> bool:
        return event_name == signal_type or event_name.startswith(f"{signal_type}.")

    def _conditions_met(self, conditions: list[dict], context: dict[str, Any]) -> bool:
        if not conditions:
            return True
        return all(self._evaluate_condition(condition, context) for condition in conditions)

    def _evaluate_condition(self, condition: dict, context: dict[str, Any]) -> bool:
        if not condition:
            return True
        if "eq" in condition:
            left, right = condition["eq"]
            return self._resolve_value(left, context) == self._resolve_value(right, context)
        if "lt" in condition:
            left, right = condition["lt"]
            return self._resolve_value(left, context) < self._resolve_value(right, context)
        if "gt" in condition:
            left, right = condition["gt"]
            return self._resolve_value(left, context) > self._resolve_value(right, context)
        if "and" in condition:
            return all(self._evaluate_condition(item, context) for item in condition["and"])
        if "or" in condition:
            return any(self._evaluate_condition(item, context) for item in condition["or"])
        return False

    def _execute_actions(self, actions: list[dict], context: dict[str, Any]) -> list[Action]:
        results: list[Action] = []
        for action in actions:
            if "say" in action:
                text = self._interpolate(str(action["say"]), context)
                results.append(Action(type="say", text=text))
            elif "set_surface" in action:
                surface_id = str(action["set_surface"])
                results.append(Action(type="set_surface", id=surface_id))
            elif "set_var" in action:
                payload = action["set_var"]
                key = str(payload["key"])
                value = self._resolve_value(payload["value"], context)
                self.vars[key] = value
                self._save_vars()
            elif "add_var" in action:
                payload = action["add_var"]
                key = str(payload["key"])
                delta = self._resolve_value(payload["value"], context)
                current = self.vars.get(key, 0)
                self.vars[key] = current + delta
                self._save_vars()
            elif "noop" in action:
                results.append(Action(type="noop"))
        return results

    def _build_context(self, signal: WorldSignal) -> dict[str, Any]:
        context = dict(signal.payload)
        context.setdefault("type", signal.type)
        context.setdefault("vars", self.vars)
        strings_path = self.ghost_dir / "ghost" / "strings.yaml"
        if strings_path.exists():
            data = parse_yaml(strings_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                context["strings"] = data
        return context

    def _resolve_value(self, value: Any, context: dict[str, Any]) -> Any:
        if isinstance(value, str):
            return self._interpolate(value, context)
        return value

    def _interpolate(self, template: str, context: dict[str, Any]) -> str:
        result = template
        for placeholder in self._extract_placeholders(template):
            replacement = self._lookup_placeholder(placeholder, context)
            result = result.replace(f"${{{placeholder}}}", str(replacement))
        return result

    @staticmethod
    def _extract_placeholders(text: str) -> list[str]:
        placeholders: list[str] = []
        start = 0
        while True:
            start = text.find("${", start)
            if start == -1:
                break
            end = text.find("}", start)
            if end == -1:
                break
            placeholders.append(text[start + 2 : end])
            start = end + 1
        return placeholders

    @staticmethod
    def _lookup_placeholder(path: str, context: dict[str, Any]) -> Any:
        parts = path.split(".")
        current: Any = context
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return ""
        return current
