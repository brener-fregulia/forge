"""Endpoints REST - sessões de terminal PTY."""
import asyncio
import random
from fastapi import APIRouter, HTTPException
from app.state import state
from app.services.forge_log import forge_log

router = APIRouter(tags=["terminal"])


@router.post("/clients/{mac}/terminal/open")
async def open_terminal(mac: str):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404)

    port = random.randint(7600, 7699)
    cmd = (
        f"nohup sh -c 'LD_LIBRARY_PATH=$LIB/../bin "
        f"$LIB/../bin/socat "
        f"TCP4-LISTEN:{port},reuseaddr "
        f"EXEC:/bin/sh,pty,setsid,ctty,stderr' "
        f"> /tmp/socat-{port}.log 2>&1 &"
    )

    try:
        await client.websocket.send_json({"type": "command", "command": cmd})
        forge_log("agent", f"{mac} - terminal PTY aberto na porta {port}")
    except Exception as e:
        forge_log("error", f"{mac} - erro ao abrir terminal PTY: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    await asyncio.sleep(0.8)
    return {"port": port, "ip": client.ip}