# Visao Geral do Sistema

Sistema de deploy automatizado em rede local: PXE boot -> backup seletivo -> formatacao -> instalacao Windows -> restauracao.
Futuro: integracao com ERP para lojas de informatica.

## Topologia de rede

    Internet -> Roteador WiFi (wlan0)
                     |
              Servidor Linux (bond0: 192.168.100.1/24)
              sfp0 + sfp1 - Intel X520-DA2 10GbE, active-backup
                     |
              MikroTik CRS326-24G-2S+RM
              sfp-sfpplus1 -> bond0 do servidor
              ether1-ether24 -> clientes PXE
                     |
              Clientes (DHCP 192.168.100.100-200)

## Pipeline de deploy por cliente

    Liga cabo -> DHCP -> grubx64.efi (TFTP) -> grub verifica MAC
    -> boot Alpine (vmlinuz + initramfs via HTTP)
    -> mini-bootstrap baixa runtime do servidor (agent/)
    -> Agent conecta no FORGE Server (WebSocket)
    -> Inventario automatico fase 1: hardware, CPU, RAM, GPU (imediato)
    -> Inventario automatico fase 2: discos, SMART, usuarios Windows, drive letters (~15s)
    -> Tecnico configura plano de deploy no painel web
    -> Backup seletivo:
       - Raw Image: ntfsclone stream -> TCP -> Hot Cache (SSD SATA)
       - Minimo: tar Users + programs.txt -> TCP -> Hot Cache
       - Avancado: selecao manual via arvore NTFS -> TCP -> Hot Cache
    -> Compactacao zstd no servidor -> Hot Cache (compactado)
    -> Replicacao compactado -> Cold Storage (RAID1 HDDs)
    -> Boot WinPE via grub (config dinamica por MAC) + wimboot
    -> Instalacao Windows via setup.exe + unattend.xml
    -> Injecao de drivers via SDIO
    -> Debloat
    -> Restauracao do backup
    -> Confirmacao de restauracao -> delecao do hot cache
    -> Apos 30 dias no cold -> delecao automatica

Nota: etapas de WinPE, instalacao Windows, injecao de drivers, debloat e restauracao
estao no roadmap - ainda nao implementadas.

## Escala prevista

| Cenario | Clientes simultaneos |
|---|---|
| Testes iniciais | 1-2 |
| Operacao normal | ate 7 |
| Operacao em campo (escolas) | 20-30 |

## Stack tecnologico

| Camada | Tecnologia |
|---|---|
| Servidor | Python 3.13 + FastAPI + SQLAlchemy async + PostgreSQL |
| Frontend | Jinja2 + Vanilla JS ES Modules + Anvil (framework proprio) |
| Agent | Alpine Linux initramfs + shell scripts + websocat |
| Infraestrutura | nginx + dnsmasq + grub + MikroTik CRS326 |
| Storage | SSD SATA (hot cache) + RAID1 HDDs (cold storage) |
| Rede | Intel X520-DA2 10GbE, bond0 active-backup |

## Canais de comunicacao

| Canal | Porta | Uso |
|---|---|---|
| WebSocket | 8080 | presenca, heartbeat, inventario, comandos de controle |
| HTTP REST agent | 8765 | execucao sincrona de comandos no agent |
| TCP raw | 9100-9199 | stream de dados grandes (backup) |

Regra: dado grande ou sincrono nao vai pelo WebSocket.

## Mensagens WebSocket (JSON)

| type | Direcao | Conteudo |
|---|---|---|
| inventory_base | Agent -> Server | hostname, hardware, iface, gpu, ram_slots |
| inventory_disks | Agent -> Server | discos, smart, usuarios Windows, drive_letters |
| status | Agent -> Server | status, progress |
| command | Server -> Agent | command (string shell), id opcional |
| command_output | Agent -> Server | output (resultado da execucao) |
| log | Agent -> Server | line (linha de log) |
| ack | Server -> Agent | confirmacao de inventario recebido |

## Boot PXE

Stack atual:
    DHCP -> grubx64.efi (TFTP) -> grub/grub.cfg (HTTP) -> vmlinuz + initramfs (HTTP)

O grub verifica se existe /srv/tftp/grub/boot/{mac}/grub.cfg antes de bootar Alpine.
Se existir, faz configfile para ele - permite boot alternativo por MAC (ex: WinPE durante deploy).
Apos a etapa que exigiu o boot alternativo, o servidor remove o arquivo e o proximo boot volta Alpine.

grubx64.efi gerado via grub-mkimage com modulos: http, tftp, net, efinet, linux, regexp.

## Agent Alpine

O initramfs contem apenas o mini-bootstrap. O runtime completo e baixado do servidor no boot:

    mini-bootstrap (initramfs) -> bootstrap.sh (HTTP) -> runtime completo (HTTP)
    -> forge-agent.sh + libs shell + socat + websocat

Alteracoes nos scripts do agent nao exigem rebuild do initramfs - so reiniciar o agent.

Modulos do agent:
- forge-agent.sh - entrypoint/orquestrador
- lib/network.sh - aguarda rede, detecta IFACE/MAC
- lib/inventory/ - hardware, drives (discos, SMART, drive_letters, usuarios)
- lib/websocket.sh - loop WebSocket, FIFO, watchdog, comandos
- lib/http_server.sh + http_handler.sh - servidor HTTP porta 8765
- lib/backup_minimal.sh - backup minimo via tar stream TCP
- lib/format.sh - formatacao de disco por tipo de SO
- lib/forge-ls.sh - listagem de diretorios para backup avancado

## Inventario coletado

| Campo | Fonte | Fase |
|---|---|---|
| CPU, RAM total | /proc/cpuinfo, /proc/meminfo | base |
| RAM slots (fabricante, velocidade, tipo) | /sys/firmware/dmi (offsets SMBIOS) | base |
| GPU (vendor, device_id, label) | /sys/bus/pci/devices/*/class | base |
| Interface de rede | ip route | base |
| Discos (nome, tamanho, modelo, serial, fstype) | lsblk -P + sysfs wwid | disks |
| SMART (saude, temperatura, atributos) | smartctl -H -i -A -j | disks |
| Usuarios Windows | ntfs-3g + ls C:\Users\ | disks |
| Drive letters (C:, D:, etc) | ntfslabel + heuristica winload.efi | disks |
| Espaco livre por particao NTFS | df na montagem ja existente | disks |

## Deteccao de dispositivos via SNMP

O switch_monitor faz polling da MAC table do CRS326 a cada 5s via snmpwalk.
MACs detectados sem WebSocket ativo aparecem no dashboard como cards offline (DevicePresence).
Ao conectar via WebSocket, o card offline e substituido pelo card online clicavel.