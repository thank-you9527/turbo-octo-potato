from __future__ import annotations

from datetime import datetime
from typing import Optional

from baseware.models import NetworkStatus, PowerStatus


class SystemInfoProvider:
    def __init__(self) -> None:
        self._boot_time = datetime.now().astimezone()

    def now(self) -> datetime:
        return datetime.now().astimezone()

    def uptime_seconds(self) -> int:
        delta = self.now() - self._boot_time
        return int(delta.total_seconds())

    def power_status(self) -> PowerStatus:
        return PowerStatus(level=None, charging=None)

    def network_status(self) -> NetworkStatus:
        return NetworkStatus(online=None, connection_type=None)

    def timezone(self) -> str:
        return self.now().tzinfo.tzname(self.now()) or "UTC"
