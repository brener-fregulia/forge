"""Endpoints REST — plano de deploy."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import state
from app.services.forge_log import forge_log
from pathlib import Path
from app.config import SERVER_IP

router = APIRouter(tags=["deploy"])
BOOT_DIR = Path("/srv/tftp/grub/boot")

WINPE_CFG = """set default=0
set timeout=0

menuentry "FORGE WinPE" {{
    chainloader (http,{server_ip})/tftp/ipxe.efi
}}
"""


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


@router.post("/clients/{mac}/boot/winpe")
async def set_boot_winpe(mac: str):
    """Configura proximo boot do cliente para WinPE."""
    boot_dir = BOOT_DIR / mac.replace(":", "")
    boot_dir.mkdir(parents=True, exist_ok=True)
    (boot_dir / "grub.cfg").write_text(WINPE_CFG.format(server_ip=SERVER_IP))
    forge_log("agent", f"{mac} - boot configurado para WinPE")
    return {"status": "ok"}


@router.delete("/clients/{mac}/boot/winpe")
async def clear_boot_winpe(mac: str):
    """Remove config especifico — proximo boot volta para Alpine."""
    cfg = BOOT_DIR / mac.replace(":", "") / "grub.cfg"
    cfg.unlink(missing_ok=True)
    forge_log("agent", f"{mac} - boot resetado para Alpine")
    return {"status": "ok"}

