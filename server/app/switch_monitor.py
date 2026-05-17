"""Monitor SNMP do switch — atualiza switch_port nos clientes conectados."""
import asyncio
from app.state import state
from app.routes.api.switch import get_mac_port_map

POLL_INTERVAL = 5.0


async def switch_monitor_loop() -> None:
    while True:
        try:
            mac_port = await get_mac_port_map()
            for client in state.clients.values():
                client.switch_port = mac_port.get(client.mac)
        except Exception as e:
            print(f"[switch_monitor] erro: {e}")
        await asyncio.sleep(POLL_INTERVAL)