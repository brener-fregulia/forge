from fastapi import APIRouter
from app.routes.api.server import status, cpu, ram, storage, logs, backup_storage, switch

router = APIRouter(tags=["server"])
router.include_router(status.router)
router.include_router(cpu.router)
router.include_router(ram.router)
router.include_router(storage.router)
router.include_router(logs.router)
router.include_router(backup_storage.router)
router.include_router(switch.router)