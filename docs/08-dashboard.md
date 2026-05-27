# Dashboard

## Pagina principal (/)

- Barra de status do servidor: CPU (nome, uso%, temp), RAM, Hot Cache, Cold Storage, RAID, Uptime
- Barra de I/O em tempo real para Hot Cache e Cold Storage (MB/s leitura/escrita, % do teto por tipo)
- Discos monitorados carregados dinamicamente via /api/server/io-disks (sem hardcode)
- Botao (i) por item abre modal detalhado:
  - CPU: uso por core, frequencia, fan RPM
  - RAM: slots, fabricante, velocidade, largura
  - Hot Cache / Cold Storage: discos, modelo, serial, temp, horas, saude SMART + botao SMART
- Grid de clientes em tempo real via WebSocket
- Cards de clientes online (clicaveis) e offline (nao clicaveis, detectados via SNMP)
- Sistema de status: offline | booting | online | busy
- Alias do cliente exibido no card quando definido
- Deteccao automatica de desconexao (~5s ping/pong)
- Botoes de navegacao no header: Logs e Config

## Pagina de logs (/logs)

- Grid de consoles por categoria: switch, disk_io, agent, system, error
- Polling a cada 2s via GET /api/server/logs
- Scroll automatico para ultima linha
- Botao limpar por console (local, nao persiste no servidor)
- Buffer de 200 linhas por categoria no servidor (forge_log.py)

## Pagina de cliente (/client/{mac})

A pagina do cliente e dividida em duas abas principais:

### Aba Informacoes

#### Hardware (auditoria)
- Barra com CPU (nome), RAM (total fisico via DMI), GPU (nome/label)
- Modal (i) de RAM: slots, banco, tamanho, tipo (DDR4/DDR5/etc), velocidade MT/s,
  largura bits, fabricante, part number - via offsets SMBIOS, independente de fabricante

#### Discos
- Tabela com hierarquia visual (disco -> particoes colapsadas, expansivel por clique)
- Colunas: nome, tamanho, tipo filesystem, saude SMART, modelo/serial
- Badge de filesystem (NTFS destacado)
- Saude SMART com spinner ate carregar (OK/FAIL/?) + temperatura
- Botao SMART abre modal com atributos completos ATA/NVMe

#### Usuarios Windows
- Tabela com disco, nome do usuario, tamanho da pasta
- Detectado via ntfs-3g montando particoes NTFS em modo leitura

#### Log
- Log de sistema e output de comandos
- Limpar e copiar

### Aba Terminal

- Terminal PTY interativo via xterm.js
- Sub-abas dinamicas - abre multiplos terminais por maquina via botao "+"
- Cada sessao = socat PTY + TCP bridge no servidor + WebSocket dedicado
- Suporte a cores ANSI, cursor, scrollback
- xterm.js servido localmente (offline-safe) em static/vendor/xterm/

### Deploy
- Botao "Configurar Deploy" abre modal config-deploy com abas:
  - Disco alvo: lista discos fisicos com letra e label Windows (C:, D:, etc)
  - Backup: modos Sem backup / Minimo / Avancado / Raw Image
    - Avancado: arvore de arquivos interativa por volume NTFS via HTTP REST direto ao agent
    - Minimo: Users selecionados + programs.txt via tar stream TCP
    - Raw Image: ntfsclone -s stream via TCP direto ao servidor
  - Instalacao SO: lista ISOs por categoria (windows/, linux/), opcao "Nao instalar"
  - Pos-Instalacao: drivers SDIO, debloat, restaurar backup
- Navegacao via botoes Anterior/Proximo/Salvar
- Plano persistido no banco, restaurado ao reabrir o modal
- Botao "Executar" ativo somente apos plano configurado

### Header
- Nome/alias editavel (persiste no banco)
- MAC, IP, Status sempre visiveis
- Botoes Configurar Deploy e Executar

## Comunicacao agent - servidor

| Canal | Uso |
|---|---|
| WebSocket | presenca, heartbeat, inventario, comandos de controle |
| HTTP REST (agent:8765) | execucao de comandos sincronos (forge-ls, etc) |
| TCP raw (portas 9100-9199) | stream de backup (raw image, minimal, futuro) |

## Sistema de status dos clientes

| Status | Condicao |
|---|---|
| offline | MAC detectado via SNMP, sem WebSocket ativo |
| booting | WebSocket conectado mas inventario ainda nao recebido |
| online | WebSocket conectado + inventario recebido |
| busy | Deploy ou backup em andamento |

## Deteccao via SNMP

- switch_monitor faz polling da MAC table do CRS326 a cada 5s
- MACs do switch e do servidor sao filtrados automaticamente (OUI + sysfs)
- DevicePresence criada para MACs sem WebSocket ativo
- Dados do banco (alias, hostname) populam o card offline quando disponiveis
- switch_port disponivel em Client e DevicePresence

## Backup

| Modo | Mecanismo | Tamanho tipico |
|---|---|---|
| Raw Image | ntfsclone -s stream TCP | ~tamanho dos dados no disco |
| Minimo | tar Users + programs.txt stream TCP | 10MB - 2GB |
| Avancado | selecao manual via arvore NTFS + tar stream TCP | variavel |

Armazenamento: /mnt/hot/forge/{mac}/ com manifest.json por job.
Receiver: TCP nas portas 9100-9199, uma por job simultaneo.

## Endpoints relevantes

| Endpoint | Descricao |
|---|---|
| GET /api/switch/ports | MAC table filtrada do switch |
| GET /api/server/logs | Todos os logs por categoria |
| GET /api/server/logs?category=X | Logs de uma categoria |
| GET /api/server/logs/categories | Lista de categorias disponiveis |
| GET /api/server/io-disks | Discos monitorados pelo I/O (dinamico) |
| POST /api/clients/{mac}/exec | Executa comando no agent via HTTP REST direto |
| POST /api/clients/{mac}/backup/start | Inicia backup Raw Image (TCP stream) |
| POST /api/clients/{mac}/backup/minimal/start | Inicia backup Minimo (TCP stream) |
| POST /api/clients/{mac}/terminal/open | Abre sessao PTY no agent via socat TCP |
| WS /ws/terminal/{mac}/{session_id}/{port} | Bridge bidirecional WS <-> TCP |

## Monitor de I/O

- Endpoint GET /api/server/disk-io?disks=sdc,md127
- Background task le /proc/diskstats a cada 1s
- Teto calculado por tipo: NVMe 3000 MB/s, SSD 500 MB/s, HDD 150 MB/s
- Discos carregados dinamicamente via /api/server/io-disks (labels forge-hot, forge-cold)

## Status atual

### Infraestrutura base
- [x] DHCP + TFTP funcionando
- [x] Boot UEFI via grub (grubx64.efi gerado via grub-mkimage)
- [x] Alpine sobe em RAM (~42MB initramfs)
- [x] NAT - clientes com internet
- [x] Deteccao de discos NVMe e SATA
- [x] lsblk Alpine com libs musl
- [x] smartctl para saude dos discos
- [x] ntfsclone, ntfs-3g, sgdisk, mkfs.fat, wimlib-imagex disponiveis no initramfs
- [x] socat disponivel via bootstrap runtime (agent/bin/)

### Storage do servidor
- [x] Hot cache montado em /mnt/hot (SSD SATA 240GB, label forge-hot)
- [x] Cold storage montado em /mnt/cold (RAID1 2x466GB, label forge-cold)
- [x] Ambos persistidos no /etc/fstab por UUID
- [x] ISOs movidas para /home/isos (symlink /srv/isos) - raiz NVMe em 15%

### FORGE Server + Agent
- [x] Bootstrap minimo no initramfs - runtime baixado do servidor em tempo de boot
- [x] Mini-bootstrap no initramfs - baixa bootstrap real do servidor sem rebuild
- [x] Agent inicia automaticamente no boot PXE
- [x] Inventario em duas fases (base imediato + discos/SMART/usuarios)
- [x] Hardware auditavel: CPU, RAM fisica via DMI/SMBIOS, GPU via sysfs PCI
- [x] Modulos RAM com fabricante, part number, velocidade, tipo e largura
- [x] Execucao de comandos via HTTP REST direto no agent (porta 8765)
- [x] Deteccao de desconexao via heartbeat (3s/2s) + watchdog 60s no agent
- [x] Identificacao de discos por label (imune a mudanca de nome entre boots)
- [x] Saude SMART por disco (status + temperatura + modal com atributos)
- [x] Usuarios Windows via ntfs-3g
- [x] Dashboard com grid de clientes em tempo real
- [x] DevicePresence - cards offline para dispositivos detectados via SNMP
- [x] switch_monitor - polling SNMP a cada 5s, switch_port no estado do cliente
- [x] forge_log - logger centralizado por categoria com buffer de 200 linhas
- [x] Status do servidor em tempo real (CPU, RAM, storage, RAID, uptime)
- [x] Monitor de I/O em tempo real (MB/s por disco, barra de uso, discos dinamicos)
- [x] Botao SMART nos modais de Hot Cache e Cold Storage
- [x] Modais de detalhes do servidor (CPU, RAM, Hot Cache, Cold Storage)
- [x] PostgreSQL + SQLAlchemy + Alembic (Client, Machine, Deploy, Snapshot)
- [x] Machine registrada automaticamente no banco ao conectar
- [x] Alias editavel por maquina - persiste no banco
- [x] Modal de configuracao de deploy com plano persistido
- [x] Arquitetura CSS modular (components/, pages/, modals/, tables/)
- [x] Arquitetura JS modular com Anvil (lib/anvil/, lib/ui/, components/, pages/)
- [x] Templates HTML com partials por responsabilidade
- [x] Agent modular (network.sh, inventory.sh, websocket.sh, json.sh, http_server.sh)
- [x] Modal config-deploy com abas funcionais
- [x] Tabela de discos com rows filhas colapsadas e toggle por clique
- [x] Pagina do cliente com abas Informacoes e Terminal
- [x] Terminal PTY interativo via socat + xterm.js + WebSocket dedicado
- [x] Sub-abas de terminal dinamicas por sessao
- [x] Servidor HTTP no agent (socat porta 8765) para comandos REST sincronos
- [x] TCP receiver no servidor (portas 9100-9199) para stream de backup
- [x] Backup Raw Image via ntfsclone -s stream TCP
- [x] Backup Minimo via tar stream TCP (Users + programs.txt)
- [x] Backup Avancado - arvore de arquivos interativa via HTTP REST

### Pipeline de deploy
- [ ] Integracao do backup ao botao Executar
- [ ] Compactacao zstd -> cold storage
- [ ] Formatacao e particionamento do disco alvo (sgdisk + mkfs)
- [ ] Instalacao Windows via wimlib-imagex
- [ ] Injecao de drivers SDIO
- [ ] Debloat
- [ ] Restauracao do backup
- [ ] Ciclo de vida automatizado (30 dias -> delecao)
- [ ] safe-reboot no agent (sync antes de reiniciar)
- [ ] Pagina de configuracao do servidor (/server/config)
- [ ] Servico systemd para FORGE no boot