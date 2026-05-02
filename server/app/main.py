"""FORGE Server — entrypoint da aplicação FastAPI."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import APP_TITLE, APP_VERSION, STATIC_DIR
from app.routes import pages, api, ws

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

# Arquivos estáticos
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Rotas
app.include_router(pages.router)
app.include_router(api.router, prefix="/api")
app.include_router(ws.router)