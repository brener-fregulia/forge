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

| Endpoint | Metodo | Arquivo | Descricao |
|---|---|---|---|
| /api/clients | GET | machines.py | Lista resumo dos clientes conectados |
| /api/clients/{mac} | GET | machines.py | Detalhes completos de um cliente |
| /api/clients/{mac}/alias | POST | machines.py | Define alias da maquina |
| /api/clients/{mac}/command | POST | commands.py | Envia comando shell (fire-and-forget) |
| /api/clients/{mac}/command/exec | POST | commands.py | Envia comando e aguarda resultado |
| /api/clients/{mac}/command/result | POST | commands.py | Recebe resultado do agent via HTTP |
| /api/clients/{mac}/log/clear | POST | commands.py | Limpa log |
| /api/clients/{mac}/deploy/plan | POST | deploy.py | Salva plano de deploy |
| /api/clients/{mac}/terminal/open | POST | terminal.py | Abre sessao PTY via socat |
| /api/server/status | GET | server/status.py | Status em tempo real do servidor |
| /api/server/cpu | GET | server/cpu.py | Detalhes do CPU |
| /api/server/ram | GET | server/ram.py | Detalhes da RAM |
| /api/server/storage | GET | server/storage.py | Detalhes do storage |
| /api/server/disk-io | GET | server/storage.py | I/O em tempo real por disco |
| /api/server/isos | GET | server/storage.py | Lista ISOs disponiveis |

### Endpoints WebSocket

| Endpoint | Arquivo | Descricao |
|---|---|---|
| /ws/agent/{mac} | ws/agent.py | Comunicacao bidirecional com o agent Alpine |
| /ws/dashboard | ws/dashboard.py | Atualizacoes em tempo real para o browser |
| /ws/terminal/{mac}/{session}/{port} | ws/terminal.py | Bridge PTY: browser <-> socat TCP |

Documentacao interativa disponivel em http://192.168.100.1:8080/docs (Swagger UI).

### Separacao de responsabilidades — rotas

- `routes/api/machines.py` — identidade e metadados da maquina
- `routes/api/commands.py` — execucao de comandos e log
- `routes/api/deploy.py` — plano de deploy
- `routes/api/terminal.py` — abertura de sessao PTY
- `routes/api/server/` — status e metricas do servidor FORGE
- `routes/ws/agent.py` — WebSocket do agent (inventario, heartbeat, comandos)
- `routes/ws/dashboard.py` — WebSocket do browser (snapshot, updates)
- `routes/ws/terminal.py` — bridge TCP/WS para terminal PTY

### to_dict() vs to_summary()

O estado `Client` expoe dois formatos:

- `to_summary()` — usado em list_clients, broadcasts do dashboard e grid de cards.
  Contem: mac, ip, hostname, status, progress, alias, connected_at, last_seen
- `to_dict()` — usado em get_client e broadcasts de inventario.
  Contem todos os campos incluindo hardware, disks, smart, users, log_tail, deploy_plan

## FORGE Agent

- Stack: shell script modular + websocat + socat (PTY)
- Bootstrap minimo no initramfs — runtime baixado do servidor via HTTP no boot
- Runtime em /opt/forge/agent/, servido pelo nginx via symlink /srv/agent
- Binarios extras em /opt/forge/agent/bin/ (socat, libreadline) — .gitignored
- Reconexao automatica: backoff 3s + watchdog 60s + ping-interval 3s no websocat
- Inventario em duas fases: base imediato + discos/SMART/usuarios (~15s)
- Comandos pontuais retornam resultado via HTTP POST /command/result (sem race condition)
- Terminal PTY via socat TCP4-LISTEN + bridge WS no servidor

### Bootstrap

O initramfs contem apenas forge-bootstrap e websocat. No boot:

    forge-bootstrap baixa runtime de http://192.168.100.1/agent/
    -> forge-agent.sh + libs shell + socat
    -> executa agent com LIB=/tmp/forge-runtime/lib

Para reload sem reboot (desenvolvimento):

    kill $(pgrep websocat); sleep 1; sh /usr/bin/forge-bootstrap

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
| Drive letters (C:, D:, etc) | ntfslabel + heuristica winload.efi | disks |