from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from baseware.ghost_manager import GhostManager
from baseware.models import WorldSignal
from baseware.renderer import Renderer
from baseware.scheduler import Scheduler
from baseware.system_info import SystemInfoProvider
from baseware.world_signal_bus import WorldSignalBus


class UkaiHostApp:
    def __init__(self, baseware_root: Path) -> None:
        self.baseware_root = baseware_root
        self.signal_bus = WorldSignalBus()
        self.renderer = Renderer()
        self.system_info = SystemInfoProvider()
        self.scheduler = Scheduler(self.signal_bus, self.system_info)
        self.ghost_manager = GhostManager(baseware_root, self.signal_bus, self.renderer)

    def boot(self) -> None:
        self.ghost_manager.scan_installed()
        self._publish_boot()
        self._publish_power()
        self._publish_network()
        self.scheduler.start()

    def shutdown(self) -> None:
        self.scheduler.stop()
        payload = {"type": "world.shutdown"}
        self.signal_bus.publish(WorldSignal(type="world.shutdown", payload=payload))

    def launch_default(self) -> None:
        if not self.ghost_manager.listGhosts():
            return
        self.ghost_manager.launchGhost("default_ghost")

    def _publish_boot(self) -> None:
        payload = {"type": "world.boot"}
        self.signal_bus.publish(WorldSignal(type="world.boot", payload=payload))

    def _publish_power(self) -> None:
        status = self.system_info.power_status()
        payload = {
            "type": "world.power",
            "level": status.level,
            "charging": status.charging,
        }
        self.signal_bus.publish(WorldSignal(type="world.power", payload=payload))

    def _publish_network(self) -> None:
        status = self.system_info.network_status()
        payload = {
            "type": "world.network",
            "online": status.online,
            "connection_type": status.connection_type,
        }
        self.signal_bus.publish(WorldSignal(type="world.network", payload=payload))


def configure_logging(baseware_root: Path) -> None:
    logs_dir = baseware_root / "runtime" / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / "ukaihost.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[logging.FileHandler(log_path), logging.StreamHandler()],
    )


def main(baseware_root: Optional[str] = None) -> None:
    root = Path(baseware_root or Path(__file__).resolve().parent.parent / "baseware_root")
    configure_logging(root)
    app = UkaiHostApp(root)
    app.boot()
    app.launch_default()
    logging.info("UkaiHost running. Press Ctrl+C to exit.")
    try:
        while True:
            signal = input("ukaihost> ").strip()
            if signal == "quit":
                break
            if signal == "click":
                instance = app.ghost_manager._running.get("default_ghost")
                if instance:
                    instance.character.simulate_click(10, 10)
            if signal:
                payload = {"type": signal}
                app.signal_bus.publish(WorldSignal(type=signal, payload=payload))
    except KeyboardInterrupt:
        pass
    finally:
        app.shutdown()
        logging.info("UkaiHost shutdown complete.")


if __name__ == "__main__":
    main()
