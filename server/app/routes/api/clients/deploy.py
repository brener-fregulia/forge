"""Endpoints REST — plano de deploy."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.forge_log import forge_log

router = APIRouter(tags=["deploy"])


class DeployPlan(BaseModel):
    target_disk: str
    backup: bool = True
    backup_users: list[str] = []
    backup_root: bool = False
    windows_iso: str | None = None
    drivers: bool = True
    debloat: bool = True
    restore: bool = True


@router.post("/clients/{mac}/deploy/plan")
async def create_deploy_plan(mac: str, plan: DeployPlan):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    client.deploy_plan = plan.model_dump()
    client.status = "online"
    forge_log("agent", f"{mac} - plano de deploy configurado (disco: {plan.target_disk}, iso: {plan.windows_iso})")

    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_summary(),
    })

    return {"status": "ok", "plan": client.deploy_plan}