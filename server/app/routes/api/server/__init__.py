from fastapi import APIRouter
from app.routes.api.server import status, cpu, ram, storage, logs

router = APIRouter(tags=["server"])
router.include_router(status.router)
router.include_router(cpu.router)
router.include_router(ram.router)
router.include_router(storage.router)
router.include_router(logs.router)