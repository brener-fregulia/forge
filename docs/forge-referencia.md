# FORGE — Fleet Orchestration & Recovery Global Engine
**Referência Técnica do Projeto**

> Sistema de deploy automatizado em rede local: PXE boot → backup seletivo → formatação → instalação Windows → restauração.
> Futuro: integração com ERP para lojas de informática.

---

## Visão geral do sistema

```
Internet → Roteador WiFi
                |
         Beelink (wlp2s0=WiFi/uplink · enp1s0=192.168.100.1/PXE)
                |
          Switch TP-Link
                |
         Clientes (DHCP 192.168.100.100–200)
```

**Pipeline de deploy por cliente:**
```
Liga cabo → DHCP → iPXE (UEFI) → Alpine Linux RAM
    → Agente conecta no FORGE Server (WebSocket)
    → Inventário automático (hardware, discos, usuários)
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
| `nvme0n1` NVMe 256GB | NVMe | OS Debian 13 + ISOs + tftp + scripts + SDIO + `/tmp` + `/var` |
| SSD SATA 240GB | SSD | Hot Cache (sozinho por ora; RAID1 futuro com 2º SSD) |
| 2× HDD 512GB | HDD | Cold Storage (sem RAID inicialmente; RAID1 futuro) |

**Cliente PXE atual:** Beelink Mini S (Celeron N5095, 16GB RAM) com Windows 11 instalado — usado para testar backup/deploy.

### Hardware alvo (roadmap)
| Componente | Especificação | Justificativa |
|---|---|---|
| CPU | AMD Ryzen 7 PRO 5750G | Suporte a múltiplos clientes simultâneos, iGPU, compressão |
| NVMe (SO) | A definir | OS + ISOs + scripts + SDIO + alta leitura/acesso múltiplo |
| SSD SATA ×2 | A definir | Hot Cache em RAID1 — backup temporário antes da formatação |
| HDD ×2 inicial | 2× Seagate Ironwolf PRO NAS 4TB | Cold Storage — backup de longo prazo |
| HDD ×4 futuro | 4× Seagate Ironwolf PRO NAS 4TB | Expansão do Cold Storage |

> **Nota:** RAID do Cold Storage (HDDs) ainda a definir. Candidatos: RAID5 (espaço útil ~75%), RAID6 (redundância dupla), ou ZFS RAIDZ2.

## Drivers customizados do servidor

### TP-Link Archer T2U Plus (rtl8821au)
Adaptador WiFi USB. Driver não vem no kernel padrão do Debian 13.

**Source versionado em:** `/opt/forge/drivers/rtl8821au/`
**Versão:** 5.12.5.2 (instalado via DKMS)

**Reinstalação após formatação do servidor:**
\`\`\`bash
apt install dkms build-essential linux-headers-$(uname -r) -y
cd /opt/forge/drivers/rtl8821au
sudo ./install-driver.sh
\`\`\`

O DKMS recompila o módulo automaticamente em cada atualização de kernel.

---

## Arquitetura de storage

### Filosofia
- **CPU-heavy no servidor** — toda compressão e processamento pesado ocorre no servidor, não nos clientes
- **Hot Cache → Cold Storage** — dois níveis de armazenamento com ciclo de vida automatizado

### Fluxo de dados do backup
```
Cliente (ntfsclone via rede)
    ↓ stream direto
Hot Cache: SSD SATA RAID1  ← backup raw, rápido, redundante
    ↓ (em background, após formatação confirmada)
Compressão no servidor (zstd -T0)
    ↓
Cold Storage: HDDs  ← arquivo compactado de longo prazo
    ↓ (após 30 dias + confirmação de restauração bem-sucedida)
Deleção automática
```

### Estrutura de diretórios alvo
```
/srv/                          → SSD SATA (hot/operacional)
  isos/                        → Win10_22H2_ptBR.iso, Win11_25H2_ptBR.iso
  tftp/                        → arquivos de boot PXE
  scripts/                     → scripts de deploy
  hot-cache/
    <cliente_alias>/           → nome/alias do cliente ERP (ex: "escola-estadual-jk")
      <MAC>/                   → MAC da máquina específica
        backup_<timestamp>.img → imagem ntfsclone raw

/mnt/cold/                     → HDDs montados
  <cliente_alias>/
    <MAC>/
      backup_<timestamp>.img.zst  → compactado com zstd
      manifest.json               → inventário, data, hash, status restauração
```

> **Nota sobre identificação de clientes:** o diretório raiz usa o alias/nome do cliente (vindo do ERP futuro), com subdiretórios por MAC da máquina. Para operação standalone (sem ERP), o alias padrão será `local` até integração.

### Ciclo de vida do backup
| Fase | Gatilho | Ação |
|---|---|---|
| Criação | Início do deploy | `ntfsclone` → hot cache |
| Compactação | Formatação concluída | `zstd` no servidor → cold storage |
| Retenção | Restauração confirmada + backup no cold | Mantém por 30 dias |
| Deleção | 30 dias após restauração confirmada | Remove hot cache e cold storage |

---

## Escala prevista

| Cenário | Clientes simultâneos |
|---|---|
| Testes iniciais | 1–2 |
| Operação normal (switch atual) | até 7 |
| Operação em campo (escola, etc.) | 20–30 |

> O painel web e o agente foram projetados para escalar. WebSockets stateless por cliente, sem estado compartilhado bloqueante.

---

## Componentes de software do FORGE

### 1. FORGE Server (servidor Debian)
- **Stack:** Python 3.13 + FastAPI + WebSockets
- **Porta:** `http://192.168.100.1:8080`
- **Função:** painel web com grid de clientes, recebe telemetria, envia comandos, gerencia storage

### 2. FORGE Agent (cliente Alpine)
- **Stack:** shell script + `websocat`
- **Função:** conecta ao servidor ao bootar, reporta hardware/discos/usuários, executa etapas do deploy, reporta progresso em tempo real

### Comunicação
```
Alpine Agent  ←→  WebSocket  ←→  FORGE Server  ←→  Painel Web (browser)
```
- Cada cliente tem uma conexão WebSocket persistente
- Servidor faz broadcast de status para o painel
- Técnico envia comandos por cliente via painel

### Fluxo de inventário (primeira conexão)
1. Agente conecta e envia: MAC, hostname, CPU, RAM, discos detectados
2. Para cada partição NTFS: lista usuários em `C:\Users\` e tamanho de cada um
3. Servidor registra e exibe no painel
4. Técnico escolhe o que salvar antes de autorizar o deploy

---

## Configuração do servidor (atual)

### Rede — `/etc/network/interfaces`
```
auto enp1s0
iface enp1s0 inet static
    address 192.168.100.1
    netmask 255.255.255.0
```

### NAT (clientes com internet via WiFi do servidor)
```bash
net.ipv4.ip_forward=1   # /etc/sysctl.conf
iptables MASQUERADE em wlp2s0
iptables FORWARD enp1s0 ↔ wlp2s0
# salvo com netfilter-persistent
```

### dnsmasq — `/etc/dnsmasq.conf`
```ini
interface=enp1s0
bind-interfaces
dhcp-range=192.168.100.100,192.168.100.200,12h
dhcp-option=3,192.168.100.1
dhcp-option=6,8.8.8.8,8.8.4.4
enable-tftp
tftp-root=/srv/tftp
log-dhcp
log-queries

# Detecta arquitetura do cliente
dhcp-match=set:efi-x86_64,option:client-arch,7
dhcp-boot=tag:efi-x86_64,ipxe.efi      # UEFI
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,undionly.kpxe        # Legacy
dhcp-match=set:ipxe,175
dhcp-boot=tag:ipxe,http://192.168.100.1/tftp/boot.ipxe
```

### nginx — `/etc/nginx/sites-available/pxe`
```nginx
server {
    listen 80;
    server_name 192.168.100.1;
    location / {
        root /srv;
        autoindex on;
    }
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

**Arquivos em `/srv/tftp/`:**
| Arquivo | Origem |
|---|---|
| `ipxe.efi` | `/usr/lib/ipxe/ipxe.efi` |
| `undionly.kpxe` | `/usr/lib/ipxe/undionly.kpxe` |
| `vmlinuz` | Alpine 3.23.3 netboot `vmlinuz-lts` |
| `alpine-initramfs-full` | initramfs-lts + módulos ata/nvme embutidos |
| `alpine-modloop` | Alpine 3.23.3 `modloop-lts` (referência) |

---

## Alpine initramfs customizado

**Problema central:** o Alpine 3.23 netboot não carrega módulos de disco (ahci/nvme) automaticamente via rede. O `modloop` é projetado para mídia local.

**Solução:** embutir os módulos diretamente no initramfs.

```bash
# 1. Montar o modloop original
sudo mount -o loop /srv/tftp/alpine-modloop /mnt/modloop

# 2. Extrair o initramfs original
mkdir /tmp/initramfs-work && cd /tmp/initramfs-work
zcat /srv/tftp/alpine-initramfs | cpio -id

# 3. Copiar módulos de disco para dentro
mkdir -p lib/modules/6.18.7-0-lts/kernel/drivers
sudo cp -r /mnt/modloop/modules/6.18.7-0-lts/kernel/drivers/ata \
           lib/modules/6.18.7-0-lts/kernel/drivers/
sudo cp -r /mnt/modloop/modules/6.18.7-0-lts/kernel/drivers/nvme \
           lib/modules/6.18.7-0-lts/kernel/drivers/
sudo cp /mnt/modloop/modules/6.18.7-0-lts/modules.* \
        lib/modules/6.18.7-0-lts/

# 4. Reempacotar (~29MB)
find . | cpio -H newc -o | gzip > /srv/tftp/alpine-initramfs-full
chmod 644 /srv/tftp/alpine-initramfs-full
```

**Pacotes disponíveis no initramfs atual:**
- `ntfsclone` — clonagem de partições NTFS ✅
- `ntfs-3g` — montagem de volumes NTFS ✅
- `websocat` — comunicação WebSocket com o servidor ⬜ (a adicionar)

---

## Desenvolvimento — Ambiente

### Stack
- **IDE:** VSCode (Windows) com extensão Remote-SSH
- **Edição:** direta no servidor via SSH (sem sync local)
- **Projeto no servidor:** `/opt/forge/`
- **Usuário de desenvolvimento:** a definir

### Conexão VSCode → Servidor
```
VSCode (Windows)
  └── Remote-SSH → root@192.168.100.1
        └── edita /opt/forge/ diretamente
```

> Setup do Remote-SSH ainda não realizado — próximo passo.

---

## Problemas encontrados e soluções

| Problema | Causa | Solução |
|---|---|---|
| pxelinux não carregava menu | Arquivos `.c32` sem permissão | `chmod 644 *.c32` |
| Alpine não detectava HD (Lenovo G460) | Kernel lts 6.18 sem driver ahci para HM55 | Hardware legado — usar cliente mais moderno para PoC |
| Dell UEFI não bootava pxelinux | pxelinux é BIOS-only | Migrar para iPXE com `ipxe.efi` |
| iPXE incluía nome do kernel como parâmetro | Sintaxe `imgargs` com bug | Passar parâmetros diretamente na linha `kernel` |
| Alpine não carregava módulos nvme/ahci | modloop não monta via rede no netboot | Embutir módulos diretamente no initramfs |
| Segundo initramfs causava kernel panic | Conflito com estrutura do Alpine | Embutir tudo em um único initramfs |
| nginx retornando 404 | Site não recarregado após config | `systemctl reload nginx` |
| dnsmasq com permissão negada no initramfs | Arquivo sem leitura para outros | `chmod 644` nos arquivos tftp |

---

## Debug — netcat

Para ver output do cliente no servidor sem precisar de tela:

```bash
# Servidor (escuta antes de executar no cliente)
nc -lp 9999

# Cliente Alpine
comando_qualquer | nc 192.168.100.1 9999
```

---

## Status atual

### Infraestrutura base
- ✅ DHCP + TFTP funcionando
- ✅ Boot UEFI via iPXE
- ✅ Alpine sobe em RAM (~29MB initramfs)
- ✅ NAT — clientes com internet
- ✅ NVMe detectado no Dell i5 8ª gen (`/dev/nvme0n1`)
- ✅ `ntfsclone` disponível no initramfs

### Pipeline de deploy
- ✅ FORGE Agent (agente Alpine com WebSocket)
- ✅ FORGE Server (painel FastAPI + WebSocket)
- ✅ Inventário automático de hardware/discos
- ✅ Comandos bidirecionais (servidor → agent → output no dashboard)
- ✅ Detecção automática de desconexão (heartbeat 5s/3s)
- ⬜ Inventário de usuários Windows em partições NTFS
- ⬜ Backup seletivo via ntfsclone → hot cache
- ⬜ Compactação zstd → cold storage
- ⬜ Formatação e particionamento
- ⬜ Instalação Windows via ISO (Win10/Win11)
- ⬜ Injeção de drivers SDIO
- ⬜ Debloat
- ⬜ Restauração do backup
- ⬜ Ciclo de vida automatizado (30 dias → deleção)

## Roadmap do dashboard

- ⬜ Console de comandos estilo terminal (prompt + histórico + clear)
- ⬜ Terminal interativo real (xterm.js + sessão shell persistente) — pós-MVP
- ⬜ Botões de ação para cada estágio do deploy
- ⬜ Indicador de progresso por etapa

### Ambiente de desenvolvimento
- ⬜ VSCode Remote-SSH configurado
- ⬜ Estrutura `/opt/forge/` criada no servidor
- ⬜ `websocat` embutido no initramfs Alpine

### Hardware (roadmap)
- ⬜ Segundo SSD SATA (para RAID1 hot cache)
- ⬜ HDDs Ironwolf PRO NAS (cold storage)
- ⬜ Upgrade CPU (Ryzen 7 PRO 5750G)
- ⬜ Decisão RAID cold storage (RAID5 / RAID6 / ZFS RAIDZ2)

---

## Roadmap de integração futura

- **ERP para lojas de informática** — integração com FORGE para identificação de clientes por alias, histórico de máquinas por MAC, rastreabilidade de deploys
- **Multi-switch** — suporte a operações em campo (escolas, empresas) com 20–30 máquinas simultâneas
- **Cold storage expandido** — até 4× HDDs Ironwolf PRO NAS em RAID
