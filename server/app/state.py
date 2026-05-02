"""Estado global em memória — clientes conectados e suas telemetrias."""
from datetime import datetime
from typing import Any
from fastapi import WebSocket


class Client:
    """Representa um cliente PXE conectado."""

    def __init__(self, mac: str, ip: str, websocket: WebSocket):
        self.mac = mac
        self.ip = ip
        self.websocket = websocket
        self.connected_at = datetime.now()
        self.last_seen = datetime.now()
        self.status = "connected"  # connected | inventory | backup | format | install | done | error
        self.hostname: str | None = None
        self.hardware: dict[str, Any] = {}
        self.disks: list[dict[str, Any]] = []
        self.users: list[dict[str, Any]] = []
        self.progress: int = 0
        self.log: list[str] = []

    def to_dict(self) -> dict[str, Any]:
        return {
            "mac": self.mac,
            "ip": self.ip,
            "hostname": self.hostname,
            "status": self.status,
            "progress": self.progress,
            "connected_at": self.connected_at.isoformat(),
            "last_seen": self.last_seen.isoformat(),
            "hardware": self.hardware,
            "disks": self.disks,
            "users": self.users,
            "log_tail": self.log[-20:],
        }


class State:
    """Estado global da aplicação."""

    def __init__(self):
        self.clients: dict[str, Client] = {}  # MAC -> Client
        self.dashboard_sockets: set[WebSocket] = set()  # navegadores conectados

    def add_client(self, client: Client) -> None:
        self.clients[client.mac] = client

    def remove_client(self, mac: str) -> None:
        self.clients.pop(mac, None)

    def get_client(self, mac: str) -> Client | None:
        return self.clients.get(mac)

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