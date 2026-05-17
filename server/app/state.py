"""Estado global em memória — clientes conectados e suas telemetrias."""
from datetime import datetime
from typing import Any
from fastapi import WebSocket
import asyncio


class Client:
    """Representa um cliente PXE conectado via WebSocket."""

    def __init__(self, mac: str, ip: str, websocket: WebSocket):
        self.mac = mac
        self.ip = ip
        self.websocket = websocket
        self.connected_at = datetime.now()
        self.last_seen = datetime.now()
        self.status = "online"  # online | busy | done | error
        self.hostname: str | None = None
        self.hardware: dict[str, Any] = {}
        self.disks: list[dict[str, Any]] = []
        self.users: list[dict[str, Any]] = []
        self.progress: int = 0
        self.log: list[str] = []
        self.smart: dict[str, Any] = {}
        self.alias: str | None = None
        self.deploy_plan: dict | None = None
        self.drive_letters: list[dict] = []
        self.pending_commands: dict[str, asyncio.Future] = {}
        self.switch_port: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "mac":          self.mac,
            "ip":           self.ip,
            "hostname":     self.hostname,
            "status":       self.status,
            "progress":     self.progress,
            "connected_at": self.connected_at.isoformat(),
            "last_seen":    self.last_seen.isoformat(),
            "hardware":     self.hardware,
            "disks":        self.disks,
            "users":        self.users,
            "smart":        self.smart,
            "log_tail":     self.log[-20:],
            "alias":        self.alias,
            "deploy_plan":  self.deploy_plan,
            "drive_letters": self.drive_letters,
            "switch_port":  self.switch_port,
        }

    def to_summary(self) -> dict[str, Any]:
        return {
            "mac":          self.mac,
            "ip":           self.ip,
            "hostname":     self.hostname,
            "status":       self.status,
            "progress":     self.progress,
            "alias":        self.alias,
            "connected_at": self.connected_at.isoformat(),
            "last_seen":    self.last_seen.isoformat(),
            "switch_port":  self.switch_port,
        }


class DevicePresence:
    """Dispositivo detectado via SNMP no switch — sem WebSocket ativo."""

    def __init__(self, mac: str, switch_port: str):
        self.mac = mac
        self.switch_port = switch_port
        self.first_seen = datetime.now()
        self.last_seen = datetime.now()
        self.status = "offline"  # offline | booting
        self.alias: str | None = None
        self.hostname: str | None = None

    def to_summary(self) -> dict[str, Any]:
        return {
            "mac":         self.mac,
            "switch_port": self.switch_port,
            "status":      self.status,
            "alias":       self.alias,
            "hostname":    self.hostname,
            "first_seen":  self.first_seen.isoformat(),
            "last_seen":   self.last_seen.isoformat(),
        }


class State:
    """Estado global da aplicação."""

    def __init__(self):
        self.clients: dict[str, Client] = {}          # MAC -> Client (WebSocket ativo)
        self.devices: dict[str, DevicePresence] = {}  # MAC -> DevicePresence (só SNMP)
        self.dashboard_sockets: set[WebSocket] = set()

    def add_client(self, client: Client) -> None:
        self.clients[client.mac] = client
        # Se havia presença SNMP, remove — Client tem prioridade
        self.devices.pop(client.mac, None)

    def remove_client(self, mac: str) -> None:
        self.clients.pop(mac, None)

    def get_client(self, mac: str) -> Client | None:
        return self.clients.get(mac)

    def upsert_device(self, mac: str, switch_port: str) -> DevicePresence:
        """Cria ou atualiza um DevicePresence. Ignorado se Client ativo."""
        if mac in self.clients:
            return None
        if mac in self.devices:
            self.devices[mac].last_seen = datetime.now()
            self.devices[mac].switch_port = switch_port
        else:
            self.devices[mac] = DevicePresence(mac=mac, switch_port=switch_port)
        return self.devices[mac]

    def remove_device(self, mac: str) -> None:
        self.devices.pop(mac, None)

    async def broadcast_to_dashboard(self, message: dict[str, Any]) -> None:
        """Envia mensagem para todos os navegadores conectados."""
        dead = set()
        for ws in self.dashboard_sockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.dashboard_sockets -= dead


# Instância global
state = State()