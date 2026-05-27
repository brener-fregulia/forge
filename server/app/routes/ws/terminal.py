"""WebSocket - bridge para terminal PTY via socat."""
import asyncio
from fastapi import APIRouter, WebSocket
from app.state import state

router = APIRouter()


@router.websocket("/ws/terminal/{mac}/{session_id}/{port}")
async def ws_terminal(websocket: WebSocket, mac: str, session_id: str, port: int):
    client = state.get_client(mac)
    if not client:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    reader, writer = None, None
    for attempt in range(10):
        try:
            reader, writer = await asyncio.open_connection(client.ip, port)
            break
        except Exception:
            await asyncio.sleep(0.3)

    if not reader:
        await websocket.send_text("\r\nErro: não foi possível conectar ao terminal\r\n")
        await websocket.close()
        return

    async def ws_to_tcp():
        try:
            while True:
                msg = await websocket.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                data = msg.get("bytes") or (msg.get("text", "").encode())
                if data:
                    writer.write(data)
                    await writer.drain()
        except Exception:
            pass

    async def tcp_to_ws():
        try:
            while True:
                data = await reader.read(1024)
                if not data:
                    break
                await websocket.send_bytes(data)
        except Exception:
            pass

    await asyncio.gather(ws_to_tcp(), tcp_to_ws())
    writer.close()