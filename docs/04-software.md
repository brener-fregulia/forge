# Software

## FORGE Server

- Stack: Python 3.13 + FastAPI + WebSockets + Jinja2 + SQLAlchemy + PostgreSQL
- Porta: http://192.168.100.1:8080 (tambem via Tailscale)
- Heartbeat WebSocket: ping 3s, timeout 2s (deteccao de desconexao em ~5s)
- Reload: uvicorn --reload apenas para html/css/js — Python requer restart manual

### Banco de dados

PostgreSQL com SQLAlchemy async (asyncpg) e migrations via Alembic.

| Tabela | Descricao |
|---|---|
| clients | Entidade cliente (pessoa/empresa) |
| machines | Maquina identificada pelo MAC address |
| deploys | Registro de operacao de deploy |
| snapshots | Inventario capturado em um deploy |

### Endpoints REST

| Endpoint | Metodo | Descricao |
|---|---|---|
| /api/clients | GET | Lista clientes conectados |
| /api/clients/{mac} | GET | Detalhes de um cliente |
| /api/clients/{mac}/command | POST | Envia comando shell |
| /api/clients/{mac}/log/clear | POST | Limpa log |
| /api/clients/{mac}/alias | POST | Define alias da maquina |
| /api/clients/{mac}/deploy/plan | POST | Salva plano de deploy |
| /api/server/status | GET | Status em tempo real do servidor |
| /api/server/cpu | GET | Detalhes do CPU |
| /api/server/ram | GET | Detalhes da RAM |
| /api/server/storage | GET | Detalhes do storage |
| /api/server/isos | GET | Lista ISOs disponiveis |

Documentacao interativa disponivel em http://192.168.100.1:8080/docs (Swagger UI).

## FORGE Agent

- Stack: shell script modular + websocat
- Modulos em /usr/lib/forge/: network.sh, inventory.sh, websocket.sh, json.sh
- Inicia automaticamente via injecao no /init do initramfs com setsid
- Reconexao automatica: backoff 3s + watchdog 60s + ping-interval 3s no websocat
- Inventario em duas fases: base imediato + discos/SMART/usuarios (~15s)

### Inventario coletado

| Campo | Fonte | Fase |
|---|---|---|
| CPU (nome) | /proc/cpuinfo | base |
| RAM total | /proc/meminfo | base |
| RAM slots (fabricante, velocidade, tipo) | /sys/firmware/dmi (offsets SMBIOS) | base |
| GPU (vendor, device_id, label) | /sys/bus/pci/devices/*/class | base |
| Interface de rede | ip route | base |
| Discos (nome, tamanho, modelo, serial, fstype) | lsblk -P + sysfs wwid | disks |
| SMART (saude, temperatura, atributos) | smartctl -H -i -A -j | disks |
| Usuarios Windows | ntfs-3g + ls C:\Users\ | disks |