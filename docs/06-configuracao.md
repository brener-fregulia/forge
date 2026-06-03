# Configuracao do Servidor

## Topologia de rede atual

    Internet -> Roteador WiFi (wlan0)
                     |
              Servidor Linux
              bond0: 192.168.100.1/24 (sfp0 + sfp1, active-backup)
                     |
              MikroTik CRS326-24G-2S+RM
              sfp-sfpplus1 -> bond0 do servidor
              ether1-ether24 -> clientes PXE

## Interfaces de rede

Interfaces fixadas por MAC via systemd-network:

    /etc/systemd/network/10-eth0.link
        eth0  - 3c:7c:3f:7b:23:b8 - interface cabeada (reserva)

    /etc/systemd/network/11-sfp0.link
        sfp0  - 90:e2:ba:72:79:f4 - porta SFP+ 0 (Intel X520) - membro do bond0

    /etc/systemd/network/12-sfp1.link
        sfp1  - 90:e2:ba:72:79:f5 - porta SFP+ 1 (Intel X520) - membro do bond0

### bond0 - active-backup

    /etc/network/interfaces:
        auto bond0
        iface bond0 inet static
            address 192.168.100.1
            netmask 255.255.255.0
            bond-slaves sfp0 sfp1
            bond-mode active-backup

dnsmasq.conf configurado para interface=bond0.

### forge-offload.service

Desabilita tx-checksum-ip-generic no bond0 para evitar problemas de checksum com o CRS326:

    /etc/systemd/system/forge-offload.service:
        [Unit]
        After=network.target

        [Service]
        Type=oneshot
        ExecStart=/sbin/ethtool -K bond0 tx-checksumming off
        RemainAfterExit=yes

        [Install]
        WantedBy=multi-user.target

## NAT (clientes com internet via WiFi)

    # /etc/sysctl.conf
    net.ipv4.ip_forward=1

    # iptables (salvo via netfilter-persistent)
    iptables MASQUERADE em wlan0
    iptables FORWARD bond0 <-> wlan0

## dnsmasq - /etc/dnsmasq.conf

    interface=bond0
    bind-interfaces
    dhcp-range=192.168.100.100,192.168.100.200,12h
    dhcp-option=3,192.168.100.1
    dhcp-option=6,8.8.8.8,8.8.4.4
    enable-tftp
    tftp-root=/srv/tftp

    # UEFI - grubx64.efi para todos os clientes UEFI x86_64
    dhcp-match=set:efi-x86_64,option:client-arch,7
    dhcp-boot=tag:efi-x86_64,grubx64.efi
    # Legacy BIOS (nao utilizado atualmente)
    dhcp-match=set:bios,option:client-arch,0
    dhcp-boot=tag:bios,undionly.kpxe

Nota: snponly.efi foi descartado. grubx64.efi gerado via grub-mkimage e o bootloader
principal para todos os clientes UEFI. O fluxo iPXE antigo (boot.ipxe, snponly.efi)
nao e mais utilizado.

## MikroTik CRS326-24G-2S+RM

Configuracao relevante para boot PXE funcionar:

    bridge-lan:
        protocol-mode=none
        fast-forward=no
        allow-fast-path=yes  (padrao, nao alterar)

    sfp-sfpplus1 (uplink para o servidor):
        hw=no
        edge=yes
        point-to-point=yes
        trusted=yes

    ether1-ether24 (portas dos clientes):
        hw=no

SNMP v2c habilitado para deteccao de portas via IF-MIB.

## nginx - /etc/nginx/sites-available/pxe

    server {
        listen 80;
        server_name 192.168.100.1;
        location / { root /srv; autoindex on; }
    }

Arquivos servidos via nginx:
- /srv/tftp/         - kernel, initramfs, grub, wimboot
- /srv/agent/        - symlink para /opt/forge/agent (runtime do agent Alpine)
- /srv/isos/         - symlink para /home/isos (ISOs Windows/Linux)
- /srv/tftp/winpe/   - boot.wim para WinPE
- /srv/win11pro/     - ISO Win11 Pro montada em /mnt/iso (instalacao Windows)

## Boot PXE - grub

Stack atual:
    DHCP -> grubx64.efi (TFTP) -> grub/grub.cfg (HTTP) -> vmlinuz + initramfs (HTTP)

grubx64.efi gerado via grub-mkimage com modulos http, tftp, net, efinet, linux, regexp.

### grub/grub.cfg (principal)

    set timeout=0
    set default=0

    # Boot dinamico por MAC - verifica se existe config especifica
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

### grub/boot/{mac}/grub.cfg (gerado pelo servidor durante deploy)

Arquivo gerado dinamicamente pelo FORGE em /srv/tftp/grub/boot/{mac}/grub.cfg.
Quando presente, o grub principal faz configfile para ele antes de bootar Alpine.
Removido pelo servidor apos a etapa que exigiu o boot alternativo.

Exemplo para WinPE (futuro):
    set timeout=0
    set default=0
    menuentry "FORGE WinPE" {
        # chainload iPXE + wimboot para carregar boot.wim
    }

## Variaveis de ambiente - server/.env

    SERVER_IP=192.168.100.1
    PXE_NETWORK=192.168.100.0/24
    SERVER_PORT=8080

    HOT_CACHE_PATH=/mnt/hot
    COLD_STORAGE_PATH=/mnt/cold
    HOT_CACHE_LABEL=forge-hot
    COLD_STORAGE_LABEL=forge-cold

    DATABASE_URL=postgresql+asyncpg://forge:SENHA@localhost/forge

    DEBUG_PORT_IN=9997
    DEBUG_PORT_NC_IN=9998
    DEBUG_PORT_NC_OUT=9999

## Acesso remoto

Tailscale instalado no servidor - permite acesso SSH e ao dashboard de qualquer lugar sem IP publico.

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up