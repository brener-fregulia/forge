"""Endpoint REST — logs do FORGE por categoria."""
from fastapi import APIRouter
from app.services.forge_log import get_logs, get_all_logs, CATEGORIES

router = APIRouter()


@router.get("/server/logs")
async def server_logs(category: str | None = None, n: int = 200):
    if category:
        return {"category": category, "lines": get_logs(category, n)}
    return get_all_logs(n)


@router.get("/server/logs/categories")
async def server_log_categories():
    return {"categories": list(CATEGORIES)}