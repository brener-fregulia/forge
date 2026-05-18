"""Rotas das páginas HTML."""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR
from app.state import state
from app.services.forge_log import CATEGORIES

router = APIRouter(tags=["pages"])
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Painel principal — grid de clientes."""
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

