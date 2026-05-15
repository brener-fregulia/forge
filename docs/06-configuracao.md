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
        eth0  — 3c:7c:3f:7b:23:b8 — interface cabeada (reserva)

    /etc/systemd/network/11-sfp0.link
        sfp0  — 90:e2:ba:72:79:f4 — porta SFP+ 0 (Intel X520) — membro do bond0

    /etc/systemd/network/12-sfp1.link
        sfp1  — 90:e2:ba:72:79:f5 — porta SFP+ 1 (Intel X520) — membro do bond0

### bond0 — active-backup

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
        ExecStart=/sbin/ethtool -K bond0 tx-checksum-ip-generic off
        RemainAfterExit=yes

        [Install]
        WantedBy=multi-user.target

## NAT (clientes com internet via WiFi)

    # /etc/sysctl.conf
    net.ipv4.ip_forward=1

    # iptables (salvo via netfilter-persistent)
    iptables MASQUERADE em wlan0
    iptables FORWARD bond0 <-> wlan0

## dnsmasq — /etc/dnsmasq.conf

    interface=bond0
    bind-interfaces
    dhcp-range=192.168.100.100,192.168.100.200,12h
    dhcp-option=3,192.168.100.1
    dhcp-option=6,8.8.8.8,8.8.4.4
    enable-tftp
    tftp-root=/srv/tftp

    # UEFI — snponly.efi obrigatorio para compatibilidade com CRS326 (chip 98DX3236)
    dhcp-match=set:efi-x86_64,option:client-arch,7
    dhcp-boot=tag:efi-x86_64,snponly.efi
    # Legacy BIOS
    dhcp-match=set:bios,option:client-arch,0
    dhcp-boot=tag:bios,undionly.kpxe
    # iPXE chainload
    dhcp-match=set:ipxe,175
    dhcp-boot=tag:ipxe,http://192.168.100.1/tftp/boot.ipxe

Nota: snponly.efi usa o driver SNP do firmware UEFI em vez dos drivers proprietarios do iPXE.
ipxe.efi era incompativel com o chip 98DX3236 do CRS326.
tftpd-hpa deve estar desabilitado — usar apenas o TFTP do dnsmasq.

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

SNMP v2c habilitado para futura deteccao de portas via IF-MIB (roadmap).

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