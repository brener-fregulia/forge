# FORGE — Fleet Orchestration & Recovery Global Engine
**Referência Técnica do Projeto**

> Sistema de deploy automatizado em rede local: PXE boot → backup seletivo → formatação → instalação Windows → restauração.
> Futuro: integração com ERP para lojas de informática.

---

## Visão geral do sistema

```
Internet → Roteador WiFi
                |
         Servidor (wlan0=WiFi/uplink · enp7s0=192.168.100.1/PXE)
                |
          Switch
                |
         Clientes (DHCP 192.168.100.100–200)
```

**Pipeline de deploy por cliente:**
```
Liga cabo → DHCP → iPXE (UEFI) → Alpine Linux RAM
    → Agente conecta no FORGE Server (WebSocket)
    → Inventário automático (hardware, discos, SMART, usuários)
    → Técnico escolhe o que salvar no painel web
    → Backup seletivo (ntfsclone) → Hot Cache (SSD SATA)
    → Compactação zstd no servidor → Hot Cache (compactado)
    → Cópia compactado → Cold Storage (RAID1)
    → Formatação + instalação Windows (Win10 ou Win11)
    → Injeção de drivers via SDIO
    → Debloat
    → Restauração do backup (descompacta no cliente por padrão)
    → Confirmação de restauração → deleção do hot cache
    → Após 30 dias no cold → deleção automática
```

---

## Hardware do servidor

### Estado atual
| Dispositivo | Tipo | Uso | Montagem |
|---|---|---|---|
| PC servidor | AMD Ryzen 5 3350G, 2×8GB RAM | Servidor principal | — |
| `nvme0n1` 238GB | NVMe | OS Debian 13 + ISOs + tftp + scripts + SDIO | `/` `/var` `/tmp` `/home` |
| `sdb` 240GB SSD SATA | SSD | Hot Cache exclusivo para backups | `/mnt/hot` |
| `sda` + `sdc` 2×466GB HDD | HDD RAID1 (`/dev/md0`) | Cold Storage de longo prazo | `/mnt/cold` |
| TP-Link Archer T2U Plus | WiFi USB | Uplink | `wlan0` |

**Notas de storage:**
- ISOs Windows ficam em `/home/isos` (symlink `/srv/isos → /home/isos`) para não encher a raiz do NVMe
- Hot cache é exclusivo para backup — sem ISOs, sem tftp
- RAID1 do cold storage gerenciado via `mdadm` (`/dev/md0`)

**Cliente PXE atual:** Beelink Mini S (Celeron N5095, 16GB RAM) com Windows 11 — usado para testar backup/deploy.

### Hardware alvo (roadmap)
| Componente | Especificação | Justificativa |
|---|---|---|
| CPU | AMD Ryzen 7 PRO 5750G | Múltiplos clientes simultâneos, iGPU, compressão |
| SSD SATA ×2 | A definir | Hot Cache em RAID1 |
| HDD ×2 inicial | 2× Seagate Ironwolf PRO NAS 4TB | Cold Storage |
| HDD ×4 futuro | 4× Seagate Ironwolf PRO NAS 4TB | Expansão Cold Storage |
| NIC 10GbE | Intel X520-DA2 (2× SFP+, PCIe 2.0 x8) | Roda em PCIe 3.0 x8 no slot x16 do B450M — sem conflito com NVMe; requer cabos DAC SFP+ |
| Switch gerenciável | MikroTik CSS326-24G-2S+RM | 24× GbE + 2× SFP+, SNMP v1/v2c, SwOS — habilita detecção de portas e WoL futuro |

> RAID do Cold Storage futuro ainda a definir. Candidatos: RAID5, RAID6 ou ZFS RAIDZ2.

---

## Drivers customizados do servidor

### TP-Link Archer T2U Plus (rtl8821au)
Source versionado em `/opt/forge/drivers/rtl8821au/` (versão 5.12.5.2 via DKMS).

**Reinstalação após formatação do servidor:**
```bash
apt install dkms build-essential linux-headers-$(uname -r) -y
cd /opt/forge/drivers/rtl8821au
sudo ./install-driver.sh
```

DKMS recompila automaticamente em cada atualização de kernel.

---

## Arquitetura de storage

### Filosofia
- **CPU-heavy no servidor** — compressão e processamento pesado no servidor, não nos clientes
- **Hot Cache → Cold Storage** — dois níveis com ciclo de vida automatizado
- **Hot cache exclusivo para backups** — ISOs e tftp ficam no NVMe

### Fluxo de dados do backup
```
Cliente (ntfsclone stream via rede)
    ↓
Hot Cache: /mnt/hot  ← backup raw (.img), rápido
    ↓ (zstd -T0 no servidor, em background)
Hot Cache: /mnt/hot  ← backup compactado (.img.zst)
    ↓ (cópia para cold)
Cold Storage: /mnt/cold  ← backup compactado de longo prazo
    ↓ (confirmou no cold)
Deleta raw do hot cache (mantém só o .img.zst no hot)
    ↓ (restauração no cliente confirmada)
Deleta compactado do hot cache
    ↓ (30 dias no cold)
Deleção automática do cold storage
```

**Restauração:** por padrão descompacta no servidor e envia raw para o cliente. Para clientes mais rápidos, pode enviar compactado e descompactar localmente (a testar).

### Estrutura de diretórios
```
/mnt/hot/forge/
  hot-cache/<alias>/<MAC>/
    backup_<timestamp>.img      ← raw (deletado após compactação)
    backup_<timestamp>.img.zst  ← compactado (deletado após restauração)

/mnt/cold/forge/
  cold-storage/<alias>/<MAC>/
    backup_<timestamp>.img.zst  ← arquivo de longo prazo
    manifest.json               ← inventário, data, hash, status

/srv/                           ← NVMe
  isos/ → /home/isos/           ← symlink (ISOs no /home para economizar raiz)
  tftp/                         ← boot PXE
  scripts/                      ← scripts de deploy
  backup/                       ← (legado, substituído pelo hot cache)
```

> **Identificação de clientes:** raiz por alias (ERP futuro), subpastas por MAC. Standalone usa alias `local`.

### Ciclo de vida do backup
| Fase | Gatilho | Ação |
|---|---|---|
| Criação | Início do deploy | `ntfsclone` stream → `/mnt/hot` raw |
| Compactação | Backup raw concluído | `zstd -T0` no servidor → `.img.zst` no hot |
| Replicação | Compactação concluída | Cópia `.img.zst` → cold storage |
| Limpeza parcial | Confirmou no cold | Deleta raw do hot; mantém `.img.zst` no hot |
| Limpeza total | Restauração confirmada | Deleta compactado do hot |
| Expiração | 30 dias após restauração | Deleta do cold storage |

### Configuração RAID1 cold storage
```bash
# Criado com mdadm
sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sda /dev/sdc

# UUID no fstab
UUID=aac9b533-e808-4b69-b81a-6765824a82fb  /mnt/cold  ext4  defaults,nofail  0  2
UUID=18e473ee-a15e-4815-ae78-34c3fafa1170  /mnt/hot   ext4  defaults,nofail  0  2
```

---

## Escala prevista

| Cenário | Clientes simultâneos |
|---|---|
| Testes iniciais | 1–2 |
| Operação normal | até 7 |
| Operação em campo (escolas) | 20–30 |

---

## Componentes de software

### FORGE Server (servidor Debian)
- **Stack:** Python 3.13 + FastAPI + WebSockets + Jinja2
- **Porta:** `http://192.168.100.1:8080` (também via WiFi em `192.168.3.22:8080`)
- **Heartbeat WebSocket:** ping 3s, timeout 2s (detecção de desconexão em ~5s)

### FORGE Agent (cliente Alpine)
- **Stack:** shell script modular + websocat
- **Módulos:** `network.sh`, `inventory.sh`, `websocket.sh`, `json.sh` em `/usr/lib/forge/`
- **Inicia automaticamente:** injeção no `/init` do initramfs com `setsid`
- **Reconexão automática** com backoff de 3s
- **Inventário em duas fases:** base (imediato) + discos/SMART/usuários (~15s)

### Comunicação
```
Alpine Agent  ←→  WebSocket  ←→  FORGE Server  ←→  Painel Web (browser)
```

### Mensagens (JSON)
| `type` | Direção | Conteúdo |
|---|---|---|
| `inventory_base` | Agent → Server | hostname, hardware, iface |
| `inventory_disks` | Agent → Server | discos, smart, usuários Windows |
| `status` | Agent → Server | status, progress |
| `command` | Server → Agent | command (string shell) |
| `command_output` | Agent → Server | output (resultado da execução) |
| `log` | Agent → Server | line (linha de log) |

---

## Estrutura do projeto

```
/opt/forge/
  agent/
    forge-agent.sh             ← entrypoint (~20 linhas)
    lib/
      network.sh               ← aguarda rede, detecta IFACE/MAC
      inventory.sh             ← hardware, discos, SMART, usuários
      websocket.sh             ← loop WebSocket, FIFO, comandos
      json.sh                  ← escape JSON
  server/
    .venv/                     ← Python 3.13 venv
    run.sh                     ← uvicorn launcher
    requirements.txt
    app/
      main.py                  ← entrypoint FastAPI
      config.py                ← caminhos e constantes
      state.py                 ← estado em memória (Client, State)
      routes/
        pages.py               ← rotas HTML
        api.py                 ← endpoints REST
        ws.py                  ← endpoints WebSocket
      templates/
        base.html, dashboard.html, client.html
      static/
        css/
          style.css            ← imports
          base.css             ← variáveis, reset, layout
          components.css       ← botões, badges, forms, modal
          pages/
            dashboard.css
            client.css
            disks-table.css
            users-table.css
            smart-modal.css
        js/
          dashboard.js
          client.js
          lib/
            format.js          ← formatBytes
            clipboard.js       ← botão copiar
            ws.js              ← wrapper WebSocket
          components/
            disks-table.js     ← renderDisks, modal SMART
            users-table.js     ← renderUsers, checkboxes
  scripts/
    build-initramfs.sh         ← reconstrói initramfs Alpine completo
    client-shell.sh            ← shell remota netcat (debug)
  drivers/
    rtl8821au/                 ← driver WiFi USB (DKMS)
  build/                       ← .gitignored
  docs/
    forge-referencia.md        ← este arquivo
```

---

## Configuração do servidor

### Rede — `/etc/network/interfaces`
```
auto enp7s0
iface enp7s0 inet static
    address 192.168.100.1
    netmask 255.255.255.0
```

### NAT (clientes com internet via WiFi)
```bash
net.ipv4.ip_forward=1   # /etc/sysctl.conf
iptables MASQUERADE em wlan0
iptables FORWARD enp7s0 ↔ wlan0
# salvo via netfilter-persistent
```

### dnsmasq — `/etc/dnsmasq.conf`
```ini
interface=enp7s0
bind-interfaces
dhcp-range=192.168.100.100,192.168.100.200,12h
dhcp-option=3,192.168.100.1
dhcp-option=6,8.8.8.8,8.8.4.4
enable-tftp
tftp-root=/srv/tftp

dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-boot=tag:efi-x86_64,ipxe.efi
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,undionly.kpxe
dhcp-match=set:ipxe,175
dhcp-boot=tag:ipxe,http://192.168.100.1/tftp/boot.ipxe
```

### nginx — `/etc/nginx/sites-available/pxe`
```nginx
server {
    listen 80;
    server_name 192.168.100.1;
    location / { root /srv; autoindex on; }
}
```

---

## iPXE — `/srv/tftp/boot.ipxe`

```
#!ipxe
echo Iniciando FORGE Agent...
dhcp
kernel http://192.168.100.1/tftp/vmlinuz modules=loop,squashfs,sd-mod,usb-storage,ext4,ahci,libata,nvme ip=dhcp quiet
initrd http://192.168.100.1/tftp/alpine-initramfs-full
boot
```

---

## Alpine initramfs customizado

Construído via `scripts/build-initramfs.sh`. **Tamanho final: ~41MB**

### Drivers de kernel embutidos
- `ata` — controladores SATA/AHCI
- `nvme` — discos NVMe
- `scsi` — `sd_mod` (essencial para `/dev/sda`), `sg`, `sr_mod`
- `block` — block devices genéricos
- `usb` — dispositivos USB

### Binários embutidos
| Binário | Pacote Alpine | Função |
|---|---|---|
| `websocat` | estático musl | comunicação WebSocket |
| `lsblk` | util-linux | listagem de discos com fstype/serial |
| `smartctl` | smartmontools | saúde SMART |
| `ntfsclone` | (já existia) | clonagem NTFS |
| `ntfs-3g` | ntfs-3g | montagem NTFS (leitura de usuários) |
| `forge-agent` + libs | local | script do cliente + módulos |

### Bibliotecas musl embutidas
`libmount`, `libsmartcols`, `libblkid`, `libncursesw`, `libuuid`, `libstdc++`, `libgcc`, `libntfs-3g` — todas de `.apk` Alpine 3.23.

### Patches no `/init`
- Marcador de boot visível no console
- Cópia de binários FORGE para `$sysroot` antes do switch_root
- Envio de log de debug síncrono para servidor (porta 9997)
- Inicialização do agent com `setsid` antes do `switch_root`

> **Nota técnica:** Alpine netboot mínimo não tem OpenRC nem sysroot populado — o `switch_root` cai em recovery shell. O agent é iniciado **antes** desse ponto via `setsid` e sobrevive.

---

## Recursos do dashboard

### Página principal
- Grid de clientes em tempo real via WebSocket
- Badge de status colorido (CONNECTED, READY, ALIVE, ERROR)
- Detecção automática de desconexão (~5s)

### Página de cliente
- Hardware (CPU, RAM, interface) — carrega imediato via `inventory_base`
- Tabela de discos com:
  - Hierarquia visual (disco → partições)
  - Tamanhos legíveis (GB/TB)
  - Filesystem com badge colorido (NTFS em destaque)
  - Saúde SMART com spinner até carregar (OK/FAIL/?) + temperatura
  - Identificação (vendor + modelo + SN via sysfs/wwid)
  - Botão SMART abre modal com atributos completos + copiar JSON
- Usuários Windows com checkboxes para seleção de backup
- Campo de comando shell com retorno bidirecional no log
- Botão Copiar em todos os campos
- Botão Limpar log

---

## Status atual

### Infraestrutura base
- ✅ DHCP + TFTP funcionando
- ✅ Boot UEFI via iPXE
- ✅ Alpine sobe em RAM (~41MB initramfs)
- ✅ NAT — clientes com internet
- ✅ Detecção de discos NVMe e SATA
- ✅ `lsblk` Alpine com libs musl
- ✅ `smartctl` para saúde dos discos
- ✅ `ntfsclone`, `ntfs-3g` disponíveis

### Storage do servidor
- ✅ Hot cache montado em `/mnt/hot` (SSD SATA 240GB)
- ✅ Cold storage montado em `/mnt/cold` (RAID1 2×466GB via `/dev/md0`)
- ✅ Ambos persistidos no `/etc/fstab`
- ✅ ISOs movidas para `/home/isos` (symlink `/srv/isos`) — raiz NVMe em 15%

### FORGE Server + Agent
- ✅ Agent inicia automaticamente no boot PXE
- ✅ Inventário em duas fases (base imediato + discos/SMART/usuários)
- ✅ Comandos bidirecionais com escape robusto de aspas
- ✅ Detecção de desconexão via heartbeat (3s/2s)
- ✅ Identificação de discos (vendor, modelo, SN via sysfs/wwid)
- ✅ Detecção de filesystems (NTFS, vfat, etc)
- ✅ Saúde SMART por disco (status + temperatura + modal com atributos)
- ✅ Usuários Windows via ntfs-3g com checkboxes de seleção
- ✅ Dashboard com grid de clientes em tempo real
- ✅ Arquitetura CSS/JS modular (lib/, components/, pages/)
- ✅ Agent modular (network.sh, inventory.sh, websocket.sh, json.sh)

### Pipeline de deploy (a implementar)
- ⬜ Backup seletivo via ntfsclone → hot cache
- ⬜ Compactação zstd → hot cache → cold storage
- ⬜ Formatação e particionamento
- ⬜ Instalação Windows via ISO
- ⬜ Injeção de drivers SDIO
- ⬜ Debloat
- ⬜ Restauração do backup
- ⬜ Ciclo de vida automatizado (30 dias → deleção)
- ⬜ `safe-reboot` no agent (sync antes de reiniciar)
- ⬜ Dashboard de status do servidor (CPU, RAM, storage, rede)
- ⬜ Página de configuração do servidor

### Ambiente de desenvolvimento
- ✅ VSCode Remote-SSH (Windows → servidor)
- ✅ Repositório Git privado (github.com/brener-fregulia/forge)
- ✅ Build do initramfs reproduzível (`scripts/build-initramfs.sh`)

---

## Roadmap

### Próximos passos imediatos (em ordem)
1. Dashboard de status do servidor (CPU, RAM, hot cache, cold storage, rede)
2. Botões de ação por estágio do deploy (Backup / Format / Install / Restore)
3. Backup seletivo via ntfsclone com seleção de usuários
4. Compactação + replicação para cold storage
5. Instalação Windows via ISO

### Dashboard — polimento
- ⬜ Console de comandos estilo terminal (prompt + histórico)
- ⬜ Terminal interativo real (xterm.js) — pós-MVP
- ⬜ Indicador de progresso por etapa
- ⬜ Aviso visual para disco com sinais de degradação (SMART)
- ⬜ Detecção de portas do switch via SNMP (CSS326 + IF-MIB)
- ⬜ Wake-on-LAN via FORGE dashboard
- ⬜ ARP scan + leases dnsmasq para detectar dispositivos ligados não-Alpine

### Hardware
- ⬜ Segundo SSD SATA (RAID1 hot cache)
- ⬜ HDDs Ironwolf PRO NAS 4TB (cold storage)
- ⬜ Upgrade CPU (Ryzen 7 PRO 5750G)
- ⬜ Intel X520-DA2 + DAC cables SFP+
- ⬜ MikroTik CSS326-24G-2S+RM

### Integração futura
- ⬜ ERP para lojas de informática (alias por cliente, histórico por MAC)
- ⬜ Multi-switch (operação em campo, 20–30 máquinas simultâneas)
- ⬜ Terminal interativo SSH no dashboard (xterm.js) — pós-MVP

---

## Problemas resolvidos

| Problema | Causa | Solução |
|---|---|---|
| Dell UEFI não bootava pxelinux | pxelinux é BIOS-only | Migrar para iPXE com `ipxe.efi` |
| Alpine não carregava módulos nvme/ahci | modloop não monta via rede | Embutir módulos no initramfs |
| Switch_root falha (recovery shell) | Sysroot vazio em modo netboot | Iniciar agent antes via `setsid` |
| `lsblk` não retornava discos | Sem `sd_mod` no initramfs | Embutir drivers `scsi/` e `block/` |
| `lsblk` não existia no busybox | Limitação do busybox | Extrair `lsblk` Alpine + libs musl |
| `smartctl` falhava por libs | C++ runtime ausente | Adicionar `libstdc++` e `libgcc` Alpine |
| JSON inválido com aspas em comandos | Regex sed não trata escape | Parser awk com state machine |
| `disks` chegava vazio no servidor | Variável em subshell perdida | Escrever em arquivo temp `/tmp/forge-disks.tmp` |
| Cliente "alive" mesmo desligado | TCP sem heartbeat | uvicorn `--ws-ping-interval 3 --ws-ping-timeout 2` |
| Modelo do disco misturado com fstype | awk separando por espaço | Usar `lsblk -P` com parser chave="valor" |
| Serial do disco vazio via lsblk | SSD barato não expõe serial | Ler `/sys/class/block/*/device/wwid` |
| Raiz NVMe em 82% | ISOs de 12GB na raiz | Mover ISOs para `/home/isos` com symlink |
| ntfs-3g não disponível no initramfs | Não incluído no build | Extrair pacote Alpine + libs e embutir |
| Usuários não detectados | lsblk retornava `├─sda3` com caracteres de árvore | `sed 's/[├└│─ ]//g'` no nome do device |

---

## Convenções de commit

| Prefixo | Uso |
|---|---|
| `init:` | estrutura inicial |
| `feat:` | nova funcionalidade |
| `fix:` | correção de bug |
| `agent:` | mudanças no agente Alpine |
| `server:` | mudanças no FORGE Server |
| `infra:` | configurações do servidor/rede |
| `docs:` | documentação |