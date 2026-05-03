from fastapi import APIRouter
from app.routes.api import clients, server

router = APIRouter()
router.include_router(clients.router)
router.include_router(server.router)