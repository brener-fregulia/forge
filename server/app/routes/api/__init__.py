from fastapi import APIRouter
from app.routes.api.clients import router as clients_router
from app.routes.api.server import router as server_router

router = APIRouter()
router.include_router(clients_router)
router.include_router(server_router)