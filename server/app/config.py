"""Configurações centrais do FORGE Server."""
from pathlib import Path

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

# Storage
HOT_CACHE_DIR = Path("/srv/hot-cache")
COLD_STORAGE_DIR = Path("/mnt/cold")
DEFAULT_CLIENT_ALIAS = "local"  # usado até integração com ERP

# Rede
SERVER_IP = "192.168.100.1"
PXE_NETWORK = "192.168.100.0/24"

# Aplicação
APP_TITLE = "FORGE — Fleet Orchestration & Recovery Global Engine"
APP_VERSION = "0.1.0"