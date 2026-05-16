"""Endpoints REST — plano de deploy."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state

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
    client.status = "ready"

    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_dict(),
    })

    return {"status": "ok", "plan": client.deploy_plan}