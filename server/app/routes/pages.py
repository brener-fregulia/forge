"""Rotas das páginas HTML."""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse
from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR, SERVER_IP
from app.state import state
from app.services.forge_log import CATEGORIES
from pathlib import Path

router = APIRouter(tags=["pages"])
templates = Jinja2Templates(directory=TEMPLATES_DIR)
BOOT_DIR = Path("/srv/tftp/boot")


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Painel principal - grid de clientes."""
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {"clients": [c.to_dict() for c in state.clients.values()]},
    )


@router.get("/client/{mac}", response_class=HTMLResponse)
async def client_detail(request: Request, mac: str):
    """Página de detalhes de um cliente específico."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return templates.TemplateResponse(
        request,
        "client.html",
        {"client": client.to_dict()},
    )


@router.get("/logs", response_class=HTMLResponse)
async def logs_page(request: Request):
    """Página de logs do servidor por categoria."""
    return templates.TemplateResponse(
        request,
        "logs.html",
        {"categories": list(CATEGORIES)},
    )


@router.get("/backups", response_class=HTMLResponse)
async def backups_page(request: Request):
    return templates.TemplateResponse(request, "backups.html", {})


@router.get("/server/config", response_class=HTMLResponse)
async def server_config(request: Request):
    """Página de configuração do servidor."""
    return templates.TemplateResponse(request, "config.html", {})


@router.get("/boot/{mac}/grub.cfg", response_class=PlainTextResponse)
async def grub_config(mac: str):
    """Serve grub.cfg dinamico por MAC - WinPE durante deploy, 404 caso contrario."""
    cfg_path = BOOT_DIR / mac / "grub.cfg"
    if cfg_path.exists():
        return PlainTextResponse(cfg_path.read_text())
    raise HTTPException(status_code=404, detail="Sem config especifico para este MAC")