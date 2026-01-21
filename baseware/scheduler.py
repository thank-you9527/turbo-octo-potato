from __future__ import annotations

import threading
import time
from typing import Optional

from baseware.models import ClockPayload, WorldSignal
from baseware.system_info import SystemInfoProvider
from baseware.world_signal_bus import WorldSignalBus


class Scheduler:
    def __init__(self, bus: WorldSignalBus, system_info: SystemInfoProvider) -> None:
        self.bus = bus
        self.system_info = system_info
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            now = self.system_info.now()
            payload = ClockPayload(
                time=now,
                timezone=self.system_info.timezone(),
                minute=now.minute,
                hour=now.hour,
                weekday=now.weekday(),
            ).to_payload()
            self.bus.publish(WorldSignal(type="world.clock", payload=payload))
            uptime_payload = {
                "type": "world.uptime",
                "seconds": self.system_info.uptime_seconds(),
            }
            self.bus.publish(WorldSignal(type="world.uptime", payload=uptime_payload))
            self._stop_event.wait(timeout=self._seconds_until_next_minute(now))

    @staticmethod
    def _seconds_until_next_minute(now) -> float:
        return 60 - (now.second + now.microsecond / 1_000_000)
