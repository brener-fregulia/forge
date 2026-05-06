# Alpine Initramfs Customizado

Construido via scripts/build-initramfs.sh.

## Drivers de kernel embutidos

- ata — controladores SATA/AHCI
- nvme — discos NVMe
- scsi — sd_mod (essencial para /dev/sda), sg, sr_mod
- block — block devices genericos
- usb — dispositivos USB

## Binarios embutidos

| Binario | Pacote Alpine | Funcao |
|---|---|---|
| websocat | estatico musl | comunicacao WebSocket |
| lsblk | util-linux | listagem de discos com fstype/serial |
| smartctl | smartmontools | saude SMART |
| ntfsclone | ntfs-3g-progs | clonagem NTFS para backup |
| ntfs-3g | ntfs-3g | montagem NTFS (leitura de usuarios) |
| mkfs.ntfs | ntfs-3g-progs | formatacao NTFS |
| sgdisk | sgdisk | particionamento GPT |
| mkfs.fat | dosfstools | particao EFI |
| wimlib-imagex | wimlib | instalacao Windows via WIM |
| forge-agent + libs | local | script do cliente + modulos shell |

## Bibliotecas musl embutidas

libmount, libsmartcols, libblkid, libncursesw, libuuid, libstdc++, libgcc,
libntfs-3g, libwim, libfuse3, libpopt — todas de .apk Alpine 3.23.

## Patches no /init

- Marcador de boot visivel no console
- Copia de binarios FORGE para sysroot antes do switch_root
- Envio de log de debug sincrono para servidor (porta 9997)
- Inicializacao do agent com setsid antes do switch_root

Nota tecnica: Alpine netboot minimo nao tem OpenRC nem sysroot populado —
o switch_root cai em recovery shell. O agent e iniciado antes desse ponto
via setsid e sobrevive.

## Build reproduzivel

    cd /opt/forge
    ./scripts/build-initramfs.sh

O script baixa os pacotes Alpine necessarios, extrai os binarios e libs,
copia os modulos do agent e gera o initramfs final em /srv/tftp/alpine-initramfs-full.