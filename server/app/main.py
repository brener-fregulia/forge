"""FORGE Server — entrypoint da aplicação FastAPI."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio

from app.config import APP_TITLE, APP_VERSION, STATIC_DIR
from app.routes import pages, api
from app.routes.ws import router as ws_router
from app.disk_io import io_monitor_loop


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(io_monitor_loop())
    yield
    task.cancel()


app = FastAPI(title=APP_TITLE, version=APP_VERSION, lifespan=lifespan)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(pages.router)
app.include_router(api.router, prefix="/api")
app.include_router(ws_router)