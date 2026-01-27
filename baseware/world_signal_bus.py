from __future__ import annotations

import threading
from typing import Dict, List

from baseware.models import Subscriber, WorldSignal


class WorldSignalBus:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subscribers: Dict[str, List[Subscriber]] = {}

    def subscribe(self, signal_type: str, callback: Subscriber) -> None:
        with self._lock:
            self._subscribers.setdefault(signal_type, []).append(callback)

    def unsubscribe(self, signal_type: str, callback: Subscriber) -> None:
        with self._lock:
            subscribers = self._subscribers.get(signal_type, [])
            if callback in subscribers:
                subscribers.remove(callback)

    def publish(self, signal: WorldSignal) -> None:
        with self._lock:
            subscribers = list(self._subscribers.get(signal.type, []))
            subscribers += self._subscribers.get("*", [])
        for callback in subscribers:
            callback(signal)
