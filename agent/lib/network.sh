#!/bin/sh
# Detecta rede e identifica interface principal

network_wait() {
    ip route | grep -q default && return 0
    for i in 1 2 3 4 5 6 7 8 9 10; do
        sleep 2
        ip route | grep -q default && return 0
    done
    echo "[FORGE] AVISO: rede não disponível após 20s" >&2
    return 1
}

network_info() {
    IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    MAC=$(cat /sys/class/net/$IFACE/address 2>/dev/null)
    HOSTNAME=$(hostname)
    export IFACE MAC HOSTNAME
}