from fastapi import APIRouter
from app.routes.api.clients import machines, commands, deploys, terminals, execs, backups

router = APIRouter()
router.include_router(machines.router)
router.include_router(commands.router)
router.include_router(deploys.router)
router.include_router(terminals.router)
router.include_router(execs.router)
router.include_router(backups.router)