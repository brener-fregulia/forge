"""Endpoint REST — execução direta no agent via HTTP."""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.forge_log import forge_log

AGENT_HTTP_PORT = 8765
AGENT_HTTP_TIMEOUT = 30.0

router = APIRouter(tags=["exec"])


class ExecRequest(BaseModel):
    command: str


@router.post("/clients/{mac}/exec")
async def exec_on_agent(mac: str, payload: ExecRequest):
    """Executa comando no agent via HTTP REST direto — sem WebSocket."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    url = f"http://{client.ip}:{AGENT_HTTP_PORT}/exec"
    forge_log("agent", f"{mac} - exec REST: {payload.command[:80]}")

    try:
        async with httpx.AsyncClient(timeout=AGENT_HTTP_TIMEOUT) as http:
            res = await http.post(url, json={"command": payload.command})
            res.raise_for_status()
            return res.json()
    except httpx.TimeoutException:
        forge_log("error", f"{mac} - timeout no exec REST")
        raise HTTPException(status_code=504, detail="Timeout ao executar no agent")
    except Exception as e:
        forge_log("error", f"{mac} - erro no exec REST: {e}")
        raise HTTPException(status_code=500, detail=str(e))