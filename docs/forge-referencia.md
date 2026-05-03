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
    → Backup seletivo → Hot Cache (SSD SATA RAID1)
    → Formatação + instalação Windows (Win10 ou Win11)
    → Injeção de drivers via SDIO
    → Debloat
    → Restauração do backup
    → Compactação em background → Cold Storage (HDDs)
    → Após 30 dias → deleção automática do cold storage
```

---

## Hardware do servidor

### Estado atual
| Dispositivo | Tipo | Uso |
|---|---|---|
| PC servidor | AMD Ryzen 5 3350G, 2×8GB RAM | Servidor principal |
| `nvme0n1` 256GB | NVMe | OS Debian 13 + ISOs + tftp + scripts + SDIO + `/tmp` + `/var` |
| SSD SATA 240GB | SSD | Hot Cache (sozinho por ora; RAID1 futuro com 2º SSD) |
| 2× HDD 512GB | HDD | Cold Storage (sem RAID inicialmente; RAID1 futuro) |
| TP-Link Archer T2U Plus | WiFi USB | Uplink (driver `rtl8821au` via DKMS) |

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

> RAID do Cold Storage ainda a definir. Candidatos: RAID5, RAID6 ou ZFS RAIDZ2.

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

### Fluxo de dados do backup
```
Cliente (ntfsclone via rede)
    ↓ stream direto
Hot Cache: SSD SATA RAID1  ← raw, rápido, redundante
    ↓ (background, após formatação confirmada)
Compressão zstd -T0 no servidor
    ↓
Cold Storage: HDDs  ← compactado de longo prazo
    ↓ (30 dias + restauração confirmada)
Deleção automática
```

### Estrutura de diretórios alvo
```
/srv/                          → SSD SATA (hot/operacional)
  isos/                        → ISOs Windows
  tftp/                        → boot PXE
  scripts/                     → deploy
  hot-cache/<alias>/<MAC>/     → backup_<timestamp>.img

/mnt/cold/<alias>/<MAC>/       → backup_<timestamp>.img.zst + manifest.json
```

> **Identificação de clientes:** raiz por alias (ERP futuro), subpastas por MAC. Standalone usa alias `local`.

### Ciclo de vida do backup
| Fase | Gatilho | Ação |
|---|---|---|
| Criação | Início do deploy | `ntfsclone` → hot cache |
| Compactação | Formatação concluída | `zstd` no servidor → cold storage |
| Retenção | Restauração confirmada | Mantém por 30 dias |
| Deleção | 30 dias após restauração | Remove de hot e cold |

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
- **Heartbeat WebSocket:** ping 5s, timeout 3s (detecção de desconexão em ~8s)

### FORGE Agent (cliente Alpine)
- **Stack:** shell script + websocat
- **Inicia automaticamente:** injeção no `/init` do initramfs com `setsid`
- **Reconexão automática** com backoff de 3s

### Comunicação
```
Alpine Agent  ←→  WebSocket  ←→  FORGE Server  ←→  Painel Web (browser)
```

### Mensagens (JSON)
| `type` | Direção | Conteúdo |
|---|---|---|
| `inventory` | Agent → Server | hostname, hardware, discos, smart, users |
| `status` | Agent → Server | status, progress |
| `command` | Server → Agent | command (string shell) |
| `command_output` | Agent → Server | output (resultado da execução) |
| `log` | Agent → Server | line (linha de log) |

---

## Estrutura do projeto

```
/opt/forge/
  agent/
    forge-agent.sh             ← script do cliente Alpine
  server/
    .venv/                     ← Python 3.13 venv
    run.sh                     ← uvicorn launcher
    requirements.txt
    app/
      main.py                  ← entrypoint FastAPI
      config.py                ← caminhos e constantes
      state.py                 ← estado em memória (Client, State)
      routes/
        pages.py               ← rotas HTML (dashboard, detalhes)
        api.py                 ← endpoints REST
        ws.py                  ← endpoints WebSocket
      templates/
        base.html, dashboard.html, client.html
      static/
        css/style.css
        js/dashboard.js, client.js
  scripts/
    build-initramfs.sh         ← reconstrói initramfs Alpine completo
    client-shell.sh            ← shell remota netcat (debug)
  drivers/
    rtl8821au/                 ← driver WiFi USB (DKMS)
  build/                       ← .gitignored: artefatos de build
    websocat                   ← binário estático
    *.apk                      ← pacotes Alpine baixados
    initramfs-work/            ← workdir
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
| `lsblk` | util-linux (lsblk) | listagem de discos |
| `smartctl` | smartmontools | saúde SMART |
| `ntfsclone` | (já existia) | clonagem NTFS |
| `ntfs-3g` | (já existia) | montagem NTFS |
| `forge-agent` | local | script do cliente |

### Bibliotecas musl embutidas
`libmount`, `libsmartcols`, `libblkid`, `libncursesw`, `libuuid`, `libstdc++`, `libgcc` — todas de `.apk` Alpine 3.23.

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
- Detecção automática de desconexão (~8s)

### Página de cliente
- Hardware (CPU, RAM, interface)
- Tabela de discos com:
  - Hierarquia visual (disco → partições)
  - Tamanhos legíveis (GB/TB)
  - Filesystem com badge colorido (NTFS em destaque)
  - Saúde SMART (OK/FAIL/?) + temperatura em °C
  - Identificação (vendor + modelo + SN via sysfs/wwid)
- Usuários Windows (a implementar)
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

### FORGE Server + Agent
- ✅ Agent inicia automaticamente no boot PXE
- ✅ Reconexão automática com backoff
- ✅ Inventário automático (hardware, discos, SMART)
- ✅ Comandos bidirecionais com escape robusto de aspas
- ✅ Detecção de desconexão via heartbeat (5s/3s)
- ✅ Identificação de discos (vendor, modelo, SN via sysfs)
- ✅ Detecção de filesystems (NTFS, vfat, etc)
- ✅ Saúde SMART por disco (status + temperatura)
- ✅ Dashboard com grid de clientes em tempo real
- ✅ Página de detalhes com tabela polida de discos

### Pipeline de deploy (a implementar)
- ⬜ Inventário de usuários Windows (montagem NTFS + `C:\Users\`)
- ⬜ SMART expandido (horas de uso, setores realocados, pendentes)
- ⬜ Latência otimizada (inventário em duas fases — base + SMART)
- ⬜ Backup seletivo via ntfsclone → hot cache
- ⬜ Compactação zstd → cold storage
- ⬜ Formatação e particionamento
- ⬜ Instalação Windows via ISO
- ⬜ Injeção de drivers SDIO
- ⬜ Debloat
- ⬜ Restauração do backup
- ⬜ Ciclo de vida automatizado (30 dias → deleção)
- ⬜ `safe-reboot` no agent (sync antes de reiniciar)

### Ambiente de desenvolvimento
- ✅ VSCode Remote-SSH (Windows → servidor)
- ✅ Repositório Git privado (github.com/brener-fregulia/forge)
- ✅ Build do initramfs reproduzível (`scripts/build-initramfs.sh`)

---

## Roadmap

### Próximos passos imediatos (em ordem)
1. Refatoração de arquitetura (CSS, JS e agent em módulos)
2. Latência otimizada do inventário (duas fases: base imediato + SMART posterior)
3. SMART expandido (modal com horas de uso, setores realocados, pendentes)
4. Inventário de usuários Windows
5. Botões de ação por estágio do deploy

### Dashboard — polimento
- ⬜ Console de comandos estilo terminal (prompt + histórico)
- ⬜ Terminal interativo real (xterm.js) — pós-MVP
- ⬜ Botões de ação (Inventariar / Backup / Format / Install / Restore)
- ⬜ Indicador de progresso por etapa
- ⬜ Aviso visual para disco com sinais de degradação (SMART)
- ⬜ Detecção de portas do switch via SNMP (CSS326 + IF-MIB) — link up/down por porta
- ⬜ Wake-on-LAN via FORGE dashboard — requer switch gerenciável + MAC conhecido
- ⬜ ARP scan + leases dnsmasq para detectar dispositivos ligados não-Alpine

### Hardware
- ⬜ Segundo SSD SATA (RAID1 hot cache)
- ⬜ HDDs Ironwolf PRO NAS (cold storage)
- ⬜ Upgrade CPU (Ryzen 7 PRO 5750G)
- ⬜ Decisão RAID cold storage

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
| Cliente "alive" mesmo desligado | TCP sem heartbeat | uvicorn `--ws-ping-interval 5 --ws-ping-timeout 3` |
| Modelo do disco misturado com fstype | awk separando por espaço | Usar `lsblk -P` com parser chave="valor" |
| Serial do disco vazio via lsblk | SSD barato não expõe serial | Ler `/sys/class/block/*/device/wwid` |

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