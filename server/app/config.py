"""Configurações centrais do FORGE — carregadas do .env."""
from pathlib import Path
from dotenv import load_dotenv
import os

# Carrega .env do diretório do servidor
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Caminhos
BASE_DIR       = Path(__file__).resolve().parent
TEMPLATES_DIR  = BASE_DIR / "templates"
STATIC_DIR     = BASE_DIR / "static"

# Storage
HOT_CACHE_PATH      = Path(os.getenv("HOT_CACHE_PATH", "/mnt/hot"))
COLD_STORAGE_PATH   = Path(os.getenv("COLD_STORAGE_PATH", "/mnt/cold"))
HOT_CACHE_LABEL     = os.getenv("HOT_CACHE_LABEL", "forge-hot")
COLD_STORAGE_LABEL  = os.getenv("COLD_STORAGE_LABEL", "forge-cold")
DEFAULT_CLIENT_ALIAS = "local"
STORAGE_MODE = os.getenv("STORAGE_MODE", "hot_cold_raid")

# Rede
SERVER_IP   = os.getenv("SERVER_IP", "192.168.100.1")
PXE_NETWORK = os.getenv("PXE_NETWORK", "192.168.100.0/24")
SERVER_PORT = int(os.getenv("SERVER_PORT", "8080"))
SWITCH_IP        = os.getenv("SWITCH_IP", "192.168.100.3")
SWITCH_COMMUNITY = os.getenv("SWITCH_SNMP_COMMUNITY", "public")

# Portas de debug
DEBUG_PORT_IN     = int(os.getenv("DEBUG_PORT_IN", "9997"))
DEBUG_PORT_NC_IN  = int(os.getenv("DEBUG_PORT_NC_IN", "9998"))
DEBUG_PORT_NC_OUT = int(os.getenv("DEBUG_PORT_NC_OUT", "9999"))

# App
APP_TITLE   = "FORGE — Fleet Orchestration & Recovery Global Engine"
APP_VERSION = "0.1.0"