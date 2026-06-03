# Alpine Initramfs Customizado

Construido via scripts/build-initramfs.sh.

## Arquitetura do agent

O initramfs contem apenas o minimo necessario para boot e download do runtime:

- `forge-bootstrap` - script minimo embutido no initramfs
- Runtime completo baixado do servidor via HTTP no boot

Fluxo:
    PXE Boot -> Alpine -> /init injeta forge-bootstrap
    -> bootstrap baixa runtime de http://192.168.100.1/agent/
    -> executa forge-agent.sh com LIB apontando para /tmp/forge-runtime/lib

O runtime fica em /opt/forge/agent/ no servidor, servido pelo nginx via
symlink /srv/agent -> /opt/forge/agent. Alteracoes nos scripts do agent
nao exigem rebuild do initramfs - apenas reiniciar o agent no client.

Para reload sem reboot (desenvolvimento):

    kill $(pgrep websocat); sleep 1; sh /usr/bin/forge-bootstrap

## Drivers de kernel embutidos

- ata - controladores SATA/AHCI
- nvme - discos NVMe
- scsi - sd_mod (essencial para /dev/sda), sg, sr_mod
- block - block devices genericos
- usb - dispositivos USB

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
| forge-bootstrap | local | bootstrap minimo - baixa runtime do servidor |

Nota: forge-agent.sh e libs shell foram removidos do initramfs.
Sao baixados em runtime pelo bootstrap via HTTP.

## Bibliotecas musl embutidas

libmount, libsmartcols, libblkid, libncursesw, libuuid, libstdc++, libgcc,
libntfs-3g, libwim, libfuse3, libpopt - todas de .apk Alpine 3.23.

## Patches no /init

- Marcador de boot visivel no console
- Envio de log de debug sincrono para servidor (porta 9997)
- Inicializacao do bootstrap com setsid antes do switch_root
- Log do bootstrap enviado para servidor 10s apos iniciar (porta 9997)

Nota tecnica: Alpine netboot minimo nao tem OpenRC nem sysroot populado -
o switch_root cai em recovery shell. O bootstrap e iniciado antes desse ponto
via setsid e sobrevive. O bootstrap baixa o runtime e executa o agent.

## Boot PXE

Stack atual:
    DHCP -> grubx64.efi (TFTP) -> grub/grub.cfg (HTTP) -> vmlinuz + initramfs (HTTP)

O grub foi adotado em substituicao ao iPXE/snponly.efi por limitacao de
memoria do snponly.efi ao carregar kernel + initramfs (travamento intermitente).
snponly.efi esta mantido em /srv/tftp/snponly.efi mas nao e mais usado no
fluxo Alpine.

Arquivos relevantes em /srv/tftp/:
- grubx64.efi          - gerado via grub-mkimage com modulos http, tftp, net, efinet, linux, regexp
- grub/grub.cfg        - script de boot principal (deteccao de MAC, fallback Alpine)
- grub/boot/{mac}/     - configs dinamicas por MAC geradas pelo servidor (deploy)
- vmlinuz              - kernel Alpine 6.x LTS
- alpine-initramfs-full - initramfs customizado FORGE (~42MB)
- wimboot              - binario iPXE wimboot (~75KB) para boot WinPE (uso futuro)
- winpe/boot.wim       - imagem WinPE (~577MB) para deploy Windows (uso futuro)

grub/grub.cfg:

    set timeout=0
    set default=0

    regexp --set=mac_clean "[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}" \
        ${net_default_mac}
    if [ -n "$mac_clean" ]; then
        configfile (http,192.168.100.1)/boot/${mac_clean}/grub.cfg
    fi

    menuentry "FORGE Alpine" {
        linux (http,192.168.100.1)/tftp/vmlinuz \
            modules=loop,squashfs,sd-mod,usb-storage,ext4,ahci,libata,nvme ip=dhcp quiet
        initrd (http,192.168.100.1)/tftp/alpine-initramfs-full
    }

## Boot dinamico por MAC

O grub principal verifica se existe /srv/tftp/grub/boot/{mac}/grub.cfg antes
de bootar Alpine. Se existir, faz configfile para ele.

O servidor gera e remove esse arquivo via endpoints REST:
- POST /api/clients/{mac}/boot/winpe  - cria o config especifico
- DELETE /api/clients/{mac}/boot/winpe - remove, voltando ao Alpine

Isso permite que o FORGE controle o proximo boot de cada cliente sem
intervencao humana e sem alterar o grub principal.

## Build reproduzivel

    cd /opt/forge
    ./scripts/build-initramfs.sh

O script extrai os binarios e libs dos .apk Alpine em /opt/forge/build/,
copia o bootstrap e gera o initramfs final em /srv/tftp/alpine-initramfs-full.