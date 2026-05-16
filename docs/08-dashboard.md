# Dashboard

## Pagina principal

- Barra de status do servidor: CPU (nome, uso%, temp), RAM, Hot Cache, Cold Storage, RAID, Uptime
- Barra de I/O em tempo real para Hot Cache e Cold Storage (MB/s leitura/escrita, % do teto por tipo)
- Botao (i) por item abre modal detalhado:
  - CPU: uso por core, frequencia, fan RPM
  - RAM: slots, fabricante, velocidade, largura
  - Hot Cache / Cold Storage: discos, modelo, serial, temp, horas, saude SMART + botao SMART
- Grid de clientes em tempo real via WebSocket
- Badge de status por cliente (connected, ready, alive, error)
- Alias do cliente exibido no card quando definido
- Deteccao automatica de desconexao (~5s ping/pong)

## Pagina de cliente

A pagina do cliente e dividida em duas abas principais:

### Aba Informacoes

#### Hardware (auditoria)
- Barra com CPU (nome), RAM (total fisico via DMI), GPU (nome/label)
- Modal (i) de RAM: slots, banco, tamanho, tipo (DDR4/DDR5/etc), velocidade MT/s,
  largura bits, fabricante, part number — via offsets SMBIOS, independente de fabricante

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
- Sub-abas dinamicas — abre multiplos terminais por maquina via botao "+"
- Cada sessao = socat PTY + TCP bridge no servidor + WebSocket dedicado
- Suporte a cores ANSI, cursor, scrollback
- xterm.js servido localmente (offline-safe) em static/vendor/xterm/

### Deploy
- Botao "Configurar Deploy" abre modal config-deploy com abas:
  - Disco alvo: lista discos fisicos com letra e label Windows (C:, D:, etc)
  - Backup: modos Sem backup / Minimo / Avancado / Raw Image
    - Avancado: arvore de arquivos interativa por volume NTFS
  - Instalacao SO: lista ISOs por categoria (windows/, linux/), opcao "Nao instalar"
  - Pos-Instalacao: drivers SDIO, debloat, restaurar backup
- Navegacao via botoes Anterior/Proximo/Salvar
- Plano persistido no banco, restaurado ao reabrir o modal
- Botao "Executar" ativo somente apos plano configurado

### Header
- Nome/alias editavel (persiste no banco)
- MAC, IP, Status sempre visiveis
- Botoes Configurar Deploy e Executar

## Endpoints de terminal

| Endpoint | Descricao |
|---|---|
| POST /api/clients/{mac}/terminal/open | Abre sessao PTY no agent via socat TCP |
| WS /ws/terminal/{mac}/{session_id}/{port} | Bridge bidirecional WS <-> TCP |

## Monitor de I/O

- Endpoint GET /api/server/disk-io?disks=sda,md127
- Background task le /proc/diskstats a cada 1s
- Teto calculado por tipo: NVMe 3000 MB/s, SSD 500 MB/s, HDD 150 MB/s
- Discos configurados: sda (hot cache), md127 (cold storage RAID1)

## Status atual

### Infraestrutura base
- [x] DHCP + TFTP funcionando
- [x] Boot UEFI via grub (grubx64.efi gerado via grub-mkimage)
- [x] Alpine sobe em RAM (~42MB initramfs)
- [x] NAT — clientes com internet
- [x] Deteccao de discos NVMe e SATA
- [x] lsblk Alpine com libs musl
- [x] smartctl para saude dos discos
- [x] ntfsclone, ntfs-3g, sgdisk, mkfs.fat, wimlib-imagex disponiveis no initramfs
- [x] socat disponivel via bootstrap runtime (agent/bin/)

### Storage do servidor
- [x] Hot cache montado em /mnt/hot (SSD SATA 240GB, label forge-hot)
- [x] Cold storage montado em /mnt/cold (RAID1 2x466GB, label forge-cold)
- [x] Ambos persistidos no /etc/fstab por UUID
- [x] ISOs movidas para /home/isos (symlink /srv/isos) — raiz NVMe em 15%

### FORGE Server + Agent
- [x] Bootstrap minimo no initramfs — runtime baixado do servidor em tempo de boot
- [x] Agent inicia automaticamente no boot PXE
- [x] Inventario em duas fases (base imediato + discos/SMART/usuarios)
- [x] Hardware auditavel: CPU, RAM fisica via DMI/SMBIOS, GPU via sysfs PCI
- [x] Modulos RAM com fabricante, part number, velocidade, tipo e largura
- [x] Comandos pontuais via HTTP POST /command/result (sem race condition)
- [x] Deteccao de desconexao via heartbeat (3s/2s) + watchdog 60s no agent
- [x] Identificacao de discos por label (imune a mudanca de nome entre boots)
- [x] Saude SMART por disco (status + temperatura + modal com atributos)
- [x] Usuarios Windows via ntfs-3g
- [x] Dashboard com grid de clientes em tempo real
- [x] Status do servidor em tempo real (CPU, RAM, storage, RAID, uptime)
- [x] Monitor de I/O em tempo real (MB/s por disco, barra de uso)
- [x] Botao SMART nos modais de Hot Cache e Cold Storage
- [x] Modais de detalhes do servidor (CPU, RAM, Hot Cache, Cold Storage)
- [x] PostgreSQL + SQLAlchemy + Alembic (Client, Machine, Deploy, Snapshot)
- [x] Machine registrada automaticamente no banco ao conectar
- [x] Alias editavel por maquina — persiste no banco
- [x] Modal de configuracao de deploy com plano persistido
- [x] Arquitetura CSS modular (components/, pages/, modals/, tables/)
- [x] Arquitetura JS modular com Anvil (lib/anvil/, lib/ui/, components/, pages/)
- [x] Templates HTML com partials por responsabilidade
- [x] Agent modular (network.sh, inventory.sh, websocket.sh, json.sh)
- [x] Modal config-deploy com abas funcionais
- [x] Tabela de discos com rows filhas colapsadas e toggle por clique
- [x] Pagina do cliente com abas Informacoes e Terminal
- [x] Terminal PTY interativo via socat + xterm.js + WebSocket dedicado
- [x] Sub-abas de terminal dinamicas por sessao

### Pipeline de deploy
- [ ] Backup seletivo via ntfsclone -> hot cache
- [ ] Compactacao zstd -> hot cache -> cold storage
- [ ] Formatacao e particionamento do disco alvo
- [ ] Instalacao Windows via wimlib-imagex
- [ ] Injecao de drivers SDIO
- [ ] Debloat
- [ ] Restauracao do backup
- [ ] Ciclo de vida automatizado (30 dias -> delecao)
- [ ] safe-reboot no agent (sync antes de reiniciar)
- [ ] Pagina de configuracao do servidor (/server/config)
- [ ] Servico systemd para FORGE no boot