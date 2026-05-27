# Hardware do Servidor

## Estado atual

| Dispositivo | Tipo | Uso | Montagem |
|---|---|---|---|
| PC servidor | AMD Ryzen 5 3350G, 2x8GB RAM | Servidor principal | - |
| nvme0n1 238GB | NVMe | OS Debian 13 + ISOs + tftp + scripts + SDIO | / /var /tmp /home |
| sda 240GB SSD SATA | SSD | Hot Cache exclusivo para backups | /mnt/hot |
| sdb + sdc 2x466GB HDD | HDD RAID1 (/dev/md127) | Cold Storage de longo prazo | /mnt/cold |
| TP-Link Archer T2U Plus | WiFi USB | Uplink | wlan0 |
| Intelbras XNB 600VA | Nobreak off-line | Protecao contra pisca-pisca e quedas curtas (temporario) | - |
| Intel X520-DA2 | NIC 10GbE 2x SFP+ | Rede de alta velocidade | sfp0, sfp1 |

Notas:
- ISOs Windows ficam em /home/isos (symlink /srv/isos -> /home/isos) para nao encher a raiz do NVMe
- Hot cache e exclusivo para backup - sem ISOs, sem tftp
- RAID1 do cold storage gerenciado via mdadm (/dev/md127)
- Discos identificados por label (/dev/disk/by-label/forge-hot e forge-cold) pois nomes (sda/sdb) mudam entre boots
- Nobreak off-line - nao filtra variacao de tensao, so comuta para bateria em queda total
- Carga estimada: ~70W (servidor + cliente de teste + switch) - margem confortavel para o XNB 600VA (~300W real)
- Configurar NUT para shutdown gracioso automatico em quedas longas (roadmap)

Cliente PXE atual: Beelink Mini S (Celeron N5095, 16GB RAM) com Windows 11 - usado para testar backup/deploy.

## Drivers customizados

### TP-Link Archer T2U Plus (rtl8821au)

Source versionado em /opt/forge/drivers/rtl8821au/ (versao 5.12.5.2 via DKMS).

Reinstalacao apos formatacao do servidor:

    apt install dkms build-essential linux-headers-$(uname -r) -y
    cd /opt/forge/drivers/rtl8821au
    sudo ./install-driver.sh

DKMS recompila automaticamente em cada atualizacao de kernel.

## Hardware alvo (roadmap)

| Componente | Especificacao | Justificativa |
|---|---|---|
| CPU | AMD Ryzen 7 PRO 5750G | Multiplos clientes simultaneos, iGPU, compressao |
| SSD SATA x2 | A definir | Hot Cache em RAID1 |
| HDD x2 inicial | 2x Seagate Ironwolf PRO NAS 4TB | Cold Storage |
| HDD x4 futuro | 4x Seagate Ironwolf PRO NAS 4TB | Expansao Cold Storage |
| Intel X520-DA2 + cabos DAC SFP+ | [x] instalado e funcional - 10GbE confirmado nas duas portas |
| Switch | MikroTik CRS326-24G-2S+RM | 24x GbE + 2x SFP+, SNMP v1/v2c - habilita deteccao de portas e WoL futuro |

RAID do Cold Storage futuro ainda a definir. Candidatos: RAID5, RAID6 ou ZFS RAIDZ2.