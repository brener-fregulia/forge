# Configuracao do Servidor

## Rede

/etc/network/interfaces:

    auto enp7s0
    iface enp7s0 inet static
        address 192.168.100.1
        netmask 255.255.255.0

## NAT (clientes com internet via WiFi)

    # /etc/sysctl.conf
    net.ipv4.ip_forward=1

    # iptables (salvo via netfilter-persistent)
    iptables MASQUERADE em wlan0
    iptables FORWARD enp7s0 <-> wlan0

## dnsmasq — /etc/dnsmasq.conf

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

## nginx — /etc/nginx/sites-available/pxe

    server {
        listen 80;
        server_name 192.168.100.1;
        location / { root /srv; autoindex on; }
    }

## iPXE — /srv/tftp/boot.ipxe

    #!ipxe
    echo Iniciando FORGE Agent...
    dhcp
    kernel http://192.168.100.1/tftp/vmlinuz modules=loop,squashfs,sd-mod,usb-storage,ext4,ahci,libata,nvme ip=dhcp quiet
    initrd http://192.168.100.1/tftp/alpine-initramfs-full
    boot

## Variaveis de ambiente — server/.env

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

Tailscale instalado no servidor — permite acesso SSH e ao dashboard de qualquer lugar sem IP publico.

    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up