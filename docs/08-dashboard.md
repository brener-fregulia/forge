# Dashboard

## Pagina principal

- Barra de status do servidor: CPU (nome, uso%, temp), RAM, Hot Cache, Cold Storage, RAID, Uptime
- Botao (i) por item abre modal detalhado:
  - CPU: uso por core, frequencia, fan RPM
  - RAM: slots, fabricante, velocidade, largura
  - Hot Cache / Cold Storage: discos, modelo, serial, temp, horas, saude SMART
- Grid de clientes em tempo real via WebSocket
- Badge de status por cliente (connected, ready, alive, error)
- Alias do cliente exibido no card quando definido
- Deteccao automatica de desconexao (~5s ping/pong)

## Pagina de cliente

### Hardware (auditoria)
- Barra com CPU (nome), RAM (total fisico via DMI), GPU (nome/label)
- Modal (i) de RAM: slots, banco, tamanho, tipo (DDR4/DDR5/etc), velocidade MT/s,
  largura bits, fabricante, part number — via offsets SMBIOS, independente de fabricante

### Discos
- Tabela com hierarquia visual (disco -> particoes)
- Colunas: nome, tamanho, tipo filesystem, saude SMART, modelo/serial
- Badge de filesystem (NTFS destacado)
- Saude SMART com spinner ate carregar (OK/FAIL/?) + temperatura
- Botao SMART abre modal com atributos completos ATA + copiar JSON

### Usuarios Windows
- Tabela com disco, nome do usuario, tamanho da pasta
- Detectado via ntfs-3g montando particoes NTFS em modo leitura

### Deploy
- Botao "Configurar Deploy" abre modal config-deploy com abas:
  - Disco alvo: lista discos fisicos com letra e label Windows (C:, D:, etc)
  - Backup: modos Sem backup / Minimo / Avancado / Raw Image
    - Avancado: arvore de arquivos interativa por volume NTFS
    - Arvore expande pasta a pasta via REST POST /api/clients/{mac}/command/exec
  - Instalacao SO: lista ISOs por categoria (windows/, linux/), opcao "Nao instalar"
  - Pos-Instalacao: drivers SDIO, debloat, restaurar backup
- Navegacao via botoes Anterior/Proximo/Salvar (sempre visiveis, desabilitados quando inaplicavel)
- Aba Pos-Instalacao habilitada somente ao selecionar ISO
- Salvar disponivel na aba SO ("Nao instalar") ou na ultima aba
- Plano persistido no banco, restaurado ao reabrir o modal
- Botao "Executar" ativo somente apos plano configurado
- CSS por aba: config-deploy/base.css, disco.css, so.css, pos.css, backup.css

### Outros
- Alias editavel — persiste no banco PostgreSQL
- Campo de comando shell com retorno bidirecional no log
- Log com limpar e copiar
- Botao copiar em todos os campos

## Status atual

### Infraestrutura base
- [x] DHCP + TFTP funcionando
- [x] Boot UEFI via iPXE
- [x] Alpine sobe em RAM (~41MB initramfs)
- [x] NAT — clientes com internet
- [x] Deteccao de discos NVMe e SATA
- [x] lsblk Alpine com libs musl
- [x] smartctl para saude dos discos
- [x] ntfsclone, ntfs-3g, sgdisk, mkfs.fat, wimlib-imagex disponiveis no initramfs

### Storage do servidor
- [x] Hot cache montado em /mnt/hot (SSD SATA 240GB, label forge-hot)
- [x] Cold storage montado em /mnt/cold (RAID1 2x466GB, label forge-cold)
- [x] Ambos persistidos no /etc/fstab por UUID
- [x] ISOs movidas para /home/isos (symlink /srv/isos) — raiz NVMe em 15%

### FORGE Server + Agent
- [x] Agent inicia automaticamente no boot PXE
- [x] Inventario em duas fases (base imediato + discos/SMART/usuarios)
- [x] Hardware auditavel: CPU, RAM fisica via DMI/SMBIOS, GPU via sysfs PCI
- [x] Modulos RAM com fabricante, part number, velocidade, tipo e largura
- [x] Comandos bidirecionais com escape robusto de aspas
- [x] Deteccao de desconexao via heartbeat (3s/2s) + watchdog 60s no agent
- [x] Identificacao de discos por label (imune a mudanca de nome entre boots)
- [x] Saude SMART por disco (status + temperatura + modal com atributos)
- [x] Usuarios Windows via ntfs-3g
- [x] Dashboard com grid de clientes em tempo real
- [x] Status do servidor em tempo real (CPU, RAM, storage, RAID, uptime)
- [x] Modais de detalhes do servidor (CPU, RAM, Hot Cache, Cold Storage)
- [x] PostgreSQL + SQLAlchemy + Alembic (Client, Machine, Deploy, Snapshot)
- [x] Machine registrada automaticamente no banco ao conectar
- [x] Alias editavel por maquina — persiste no banco
- [x] Modal de configuracao de deploy com plano persistido
- [x] Arquitetura CSS modular (components/, pages/, modals/, tables/)
- [x] Arquitetura JS modular (lib/, components/, pages/dashboard/, pages/client/)
- [x] Templates HTML com partials por responsabilidade
- [x] Agent modular (network.sh, inventory.sh, websocket.sh, json.sh)
- [x] Modal config-deploy com abas funcionais (Disco alvo, Instalacao SO, Pos-Instalacao)
- [x] ISOs organizadas em /home/isos/windows/ e /home/isos/linux/ (symlink /srv/isos)
- [x] Endpoint /api/server/isos lista subpastas com campo category
- [x] Letra e label Windows por particao (ntfslabel + heuristica winload.efi)
- [x] drive_letters propagado no inventario e exibido na tabela de discos e usuarios
- [x] Partições NTFS mantidas montadas apos inventario para uso no deploy
- [x] Spindown de HDDs apos inventario via hdparm -y
- [x] Servidor envia ack apos inventory/status para evitar watchdog timeout
- [x] Endpoint REST POST /api/clients/{mac}/command/exec para comandos pontuais
- [x] forge-ls.sh no initramfs para listagem de diretorios via REST
- [x] Modal config-deploy — aba Backup com arvore de volumes (Avancado pendente de fix)
- [x] Modal legado deploy.html + deploy-modal.js removidos

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