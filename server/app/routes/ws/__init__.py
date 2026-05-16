from fastapi import APIRouter
from app.routes.ws import agent, dashboard, terminal

router = APIRouter()
router.include_router(agent.router)
router.include_router(dashboard.router)
router.include_router(terminal.router)