# Visao Geral do Sistema

Sistema de deploy automatizado em rede local: PXE boot -> backup seletivo -> formatacao -> instalacao Windows -> restauracao.
Futuro: integracao com ERP para lojas de informatica.

## Topologia de rede
Internet -> Roteador WiFi
|
Servidor (wlan0=WiFi/uplink . enp7s0=192.168.100.1/PXE)
|
Switch
|
Clientes (DHCP 192.168.100.100-200)

## Pipeline de deploy por cliente
Liga cabo -> DHCP -> iPXE (UEFI) -> Alpine Linux RAM
-> Agente conecta no FORGE Server (WebSocket)
-> Inventario automatico (hardware, discos, SMART, usuarios)
-> Tecnico escolhe o que salvar no painel web
-> Backup seletivo (ntfsclone) -> Hot Cache (SSD SATA)
-> Compactacao zstd no servidor -> Hot Cache (compactado)
-> Copia compactado -> Cold Storage (RAID1)
-> Formatacao + instalacao Windows (Win10 ou Win11)
-> Injecao de drivers via SDIO
-> Debloat
-> Restauracao do backup (descompacta no cliente por padrao)
-> Confirmacao de restauracao -> delecao do hot cache
-> Apos 30 dias no cold -> delecao automatica

## Escala prevista

| Cenario | Clientes simultaneos |
|---|---|
| Testes iniciais | 1-2 |
| Operacao normal | ate 7 |
| Operacao em campo (escolas) | 20-30 |

## Comunicacao
Alpine Agent <-> WebSocket <-> FORGE Server <-> Painel Web (browser)

### Mensagens (JSON)

| type | Direcao | Conteudo |
|---|---|---|
| inventory_base | Agent -> Server | hostname, hardware, iface |
| inventory_disks | Agent -> Server | discos, smart, usuarios Windows |
| status | Agent -> Server | status, progress |
| command | Server -> Agent | command (string shell) |
| command_output | Agent -> Server | output (resultado da execucao) |
| log | Agent -> Server | line (linha de log) |