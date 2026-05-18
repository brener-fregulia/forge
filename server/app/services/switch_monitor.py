"""Monitor SNMP do switch — mantém DevicePresence para MACs offline."""
import asyncio
from app.state import state
from app.routes.api.server.switch import get_mac_port_map
from app.db.base import AsyncSessionLocal
from app.db.services.machine import get_or_create_machine
from app.services.forge_log import forge_log

POLL_INTERVAL = 5.0


async def switch_monitor_loop() -> None:
    forge_log("switch", "monitor iniciado")
    while True:
        try:
            mac_port = await get_mac_port_map()

            # Atualiza switch_port nos clientes ativos
            for client in state.clients.values():
                client.switch_port = mac_port.get(client.mac)

            # Gerencia DevicePresence para MACs sem WebSocket
            seen_macs = set(mac_port.keys())
            active_macs = set(state.clients.keys())
            offline_macs = seen_macs - active_macs

            for mac in offline_macs:
                is_new = mac not in state.devices
                device = state.upsert_device(mac, mac_port[mac])
                if device and not device.alias:
                    async with AsyncSessionLocal() as db:
                        machine = await get_or_create_machine(db, mac=mac)
                        device.alias    = machine.alias
                        device.hostname = machine.hostname
                if is_new:
                    forge_log("switch", f"dispositivo detectado: {mac} em {mac_port[mac]}")

            # Remove DevicePresence de MACs que sumiram do switch
            vanished = set(state.devices.keys()) - seen_macs
            for mac in vanished:
                state.remove_device(mac)
                forge_log("switch", f"dispositivo sumiu: {mac}")
                await state.broadcast_to_dashboard({
                    "type": "device_disconnected",
                    "mac":  mac,
                })

            # Broadcast de novos/atualizados devices
            for mac in offline_macs:
                if mac in state.devices:
                    await state.broadcast_to_dashboard({
                        "type":   "device_update",
                        "mac":    mac,
                        "device": state.devices[mac].to_summary(),
                    })

        except Exception as e:
            forge_log("switch", f"erro: {e}")

        await asyncio.sleep(POLL_INTERVAL)