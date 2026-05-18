from fastapi import APIRouter
from app.routes.api.clients import machines, commands, deploy, terminal, exec, backup

router = APIRouter()
router.include_router(machines.router)
router.include_router(commands.router)
router.include_router(deploy.router)
router.include_router(terminal.router)
router.include_router(exec.router)
router.include_router(backup.router)