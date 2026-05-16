from fastapi import APIRouter
from app.routes.api import machines, commands, deploy, terminal
from app.routes.api.server import router as server_router

router = APIRouter()
router.include_router(machines.router)
router.include_router(commands.router)
router.include_router(deploy.router)
router.include_router(terminal.router)
router.include_router(server_router)