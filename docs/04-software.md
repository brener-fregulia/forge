# Software

## FORGE Server

- Stack: Python 3.13 + FastAPI + WebSockets + Jinja2 + SQLAlchemy + PostgreSQL
- Porta: http://192.168.100.1:8080 (tambem via Tailscale)
- Heartbeat WebSocket: ping 3s, timeout 2s (deteccao de desconexao em ~5s)
- Reload: uvicorn --reload apenas para html/css/js - Python requer restart manual

### Banco de dados

PostgreSQL com SQLAlchemy async (asyncpg) e migrations via Alembic.

| Tabela | Descricao |
|---|---|
| clients | Entidade cliente (pessoa/empresa) |
| machines | Maquina identificada pelo MAC address |
| deploys | Registro de operacao de deploy |
| snapshots | Inventario capturado em um deploy |

### Canais de comunicacao

| Canal | Porta | Uso |
|---|---|---|
| WebSocket | 8080 | presenca, heartbeat, inventario, comandos de controle |
| HTTP REST agent | 8765 | execucao sincrona de comandos no agent |
| TCP raw | 9100-9199 | stream de dados grandes (backup raw, minimal) |

Regra: se e dado grande ou operacao sincrona, nao vai pelo WebSocket.

### Endpoints REST - clients

| Endpoint | Metodo | Arquivo | Descricao |
|---|---|---|---|
| /api/clients | GET | clients/machines.py | Lista resumo dos clientes conectados |
| /api/clients/{mac} | GET | clients/machines.py | Detalhes completos de um cliente |
| /api/clients/{mac}/alias | POST | clients/machines.py | Define alias da maquina |
| /api/clients/{mac}/command | POST | clients/commands.py | Envia comando shell (fire-and-forget) |
| /api/clients/{mac}/command/exec | POST | clients/commands.py | Envia comando e aguarda resultado (30s) |
| /api/clients/{mac}/command/result | POST | clients/commands.py | Recebe resultado do agent via HTTP |
| /api/clients/{mac}/log/clear | POST | clients/commands.py | Limpa log |
| /api/clients/{mac}/deploy/plan | POST | clients/deploys.py | Salva plano de deploy |
| /api/clients/{mac}/terminal/open | POST | clients/terminals.py | Abre sessao PTY via socat |
| /api/clients/{mac}/exec | POST | clients/execs.py | Executa comando REST direto no agent (porta 8765) |
| /api/clients/{mac}/backup/start | POST | clients/backups.py | Inicia backup Raw Image (TCP stream) |
| /api/clients/{mac}/backup/minimal/start | POST | clients/backups.py | Inicia backup Minimo (TCP stream) |

### Endpoints REST - server

| Endpoint | Metodo | Arquivo | Descricao |
|---|---|---|---|
| /api/server/status | GET | server/status.py | Status em tempo real do servidor |
| /api/server/cpu | GET | server/cpu.py | Detalhes do CPU |
| /api/server/ram | GET | server/ram.py | Detalhes da RAM |
| /api/server/storage | GET | server/storage.py | Detalhes do storage |
| /api/server/disk-io | GET | server/storage.py | I/O em tempo real por disco |
| /api/server/io-disks | GET | server/storage.py | Discos monitorados (dinamico por label) |
| /api/server/isos | GET | server/storage.py | Lista ISOs disponiveis |
| /api/server/logs | GET | server/logs.py | Logs por categoria |
| /api/server/logs/categories | GET | server/logs.py | Categorias de log disponiveis |
| /api/server/backups/hot | GET | server/backups.py | Backups no hot cache |
| /api/server/backups/cold | GET | server/backups.py | Backups no cold storage |
| /api/server/switch/ports | GET | server/switch.py | MAC table filtrada do switch |

### Endpoints WebSocket

| Endpoint | Arquivo | Descricao |
|---|---|---|
| /ws/agent/{mac} | ws/agent.py | Comunicacao bidirecional com o agent Alpine |
| /ws/dashboard | ws/dashboard.py | Atualizacoes em tempo real para o browser |
| /ws/terminal/{mac}/{session}/{port} | ws/terminal.py | Bridge PTY: browser <-> socat TCP |

Documentacao interativa disponivel em http://192.168.100.1:8080/docs (Swagger UI).

### Separacao de responsabilidades - rotas
routes/api/
clients/
machines.py   <- identidade e metadados da maquina
commands.py   <- execucao de comandos e log
deploys.py    <- plano de deploy
terminals.py  <- abertura de sessao PTY
execs.py      <- execucao REST direta no agent (porta 8765)
backups.py    <- operacoes de backup no cliente
server/
status.py     <- metricas do servidor
cpu.py        <- detalhes CPU
ram.py        <- detalhes RAM
storage.py    <- storage, disk-io, isos
logs.py       <- logger centralizado
backups.py    <- visualizacao de backups no storage
switch.py     <- MAC table SNMP
routes/ws/
agent.py        <- WebSocket do agent
dashboard.py    <- WebSocket do browser
terminal.py     <- bridge TCP/WS para PTY

### Services

Logica de negocio, monitores e I/O em app/services/:

| Arquivo | Descricao |
|---|---|
| disk_io.py | Monitor de I/O em tempo real (/proc/diskstats, polling 1s) |
| switch_monitor.py | Polling SNMP do switch a cada 5s, gerencia DevicePresence |
| backup_receiver.py | TCP receiver para stream de backup (portas 9100-9199) |
| forge_log.py | Logger centralizado por categoria (buffer 200 linhas) |

### to_dict() vs to_summary()

O estado `Client` expoe dois formatos:

- `to_summary()` - usado em list_clients, broadcasts do dashboard e grid de cards.
  Contem: mac, ip, hostname, status, progress, alias, switch_port, connected_at, last_seen
- `to_dict()` - usado em get_client e broadcasts de inventario.
  Contem todos os campos incluindo hardware, disks, smart, users, log_tail, deploy_plan, drive_letters

### DevicePresence

Dispositivos detectados via SNMP sem WebSocket ativo:

- Criados pelo switch_monitor quando MAC aparece no switch mas nao tem Client ativo
- Populados com alias/hostname do banco quando disponivel
- Removidos quando MAC some da MAC table do switch
- Exibidos no dashboard como cards nao-clicaveis com status offline

## FORGE Agent

- Stack: shell script modular + websocat + socat
- Mini-bootstrap no initramfs - baixa bootstrap real do servidor sem rebuild
- Bootstrap real em /opt/forge/agent/bootstrap.sh, servido via nginx
- Runtime em /opt/forge/agent/, servido pelo nginx via symlink /srv/agent
- Binarios extras em /opt/forge/agent/bin/ (socat, libreadline) - .gitignored
- Reconexao automatica: backoff 3s + watchdog 60s + ping-interval 3s no websocat
- Inventario em duas fases: base imediato + discos/SMART/usuarios (~15s)
- Servidor HTTP proprio na porta 8765 (socat + http_handler.sh) para comandos sincronos
- Terminal PTY via socat TCP4-LISTEN + bridge WS no servidor

### Bootstrap

O initramfs contem apenas um mini-bootstrap que baixa o bootstrap real:

    mini-bootstrap (initramfs) baixa bootstrap.sh de http://192.168.100.1/agent/
    -> bootstrap.sh baixa runtime completo de http://192.168.100.1/agent/
    -> forge-agent.sh + libs shell + socat + http_server.sh + http_handler.sh
    -> executa agent com LIB=/tmp/forge-runtime/lib

Para reload sem reboot (desenvolvimento):

    sudo bash /opt/forge/scripts/reload-agent.sh

### Modulos do agent

| Arquivo | Descricao |
|---|---|
| forge-agent.sh | Entrypoint - orquestra inicializacao |
| lib/network.sh | Aguarda rede, detecta IFACE/MAC |
| lib/inventory.sh | Orquestrador de inventario |
| lib/inventory/hardware.sh | CPU, RAM, GPU, slots de RAM via SMBIOS |
| lib/inventory/drives.sh | Discos, SMART, drive letters, usuarios Windows |
| lib/maintenance.sh | Acoes pos-inventario (spindown HDDs) |
| lib/websocket.sh | Loop WebSocket, FIFO, watchdog, comandos |
| lib/json.sh | Escape JSON |
| lib/forge-ls.sh | Listagem de diretorios para config-deploy avancado |
| lib/http_server.sh | Inicia servidor HTTP na porta 8765 via socat |
| lib/http_handler.sh | Handler por conexao - executa comando e retorna output |
| lib/backup_minimal.sh | Backup minimo: Users + programs.txt via tar stream TCP |
| lib/format.sh | Formatacao do disco alvo por tipo de SO |

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