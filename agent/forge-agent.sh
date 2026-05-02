#!/bin/sh
# FORGE Agent - cliente Alpine
SERVER_IP="192.168.100.1"
SERVER_PORT="8080"

# Aguarda rede
for i in 1 2 3 4 5 6 7 8 9 10; do
    ip route | grep -q default && break
    sleep 2
done

IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
MAC=$(cat /sys/class/net/$IFACE/address 2>/dev/null)
HOSTNAME=$(hostname)
CPU=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | sed 's/^ *//')
RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
RAM_MB=$((RAM_KB / 1024))

# Coleta discos (busybox lsblk não suporta -J, parseia output padrão)
DISKS_TMP=/tmp/forge-disks.tmp
> $DISKS_TMP
lsblk -b -n -o NAME,SIZE,TYPE,MODEL 2>/dev/null | while IFS= read -r LINE; do
    NAME=$(echo "$LINE" | awk '{print $1}')
    SIZE=$(echo "$LINE" | awk '{print $2}')
    TYPE=$(echo "$LINE" | awk '{print $3}')
    MODEL=$(echo "$LINE" | awk '{for(i=4;i<=NF;i++) printf "%s ", $i}' | sed 's/ *$//' | sed 's/"/\\"/g')
    [ -z "$NAME" ] && continue
    printf '{"name":"%s","size":%s,"type":"%s","model":"%s"},' "$NAME" "${SIZE:-0}" "$TYPE" "$MODEL" >> $DISKS_TMP
done
DISKS_INNER=$(cat $DISKS_TMP | sed 's/,$//')
DISKS="[$DISKS_INNER]"
[ -z "$DISKS" ] && DISKS='{"blockdevices":[]}'

INVENTORY="{\"type\":\"inventory\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\"},\"disks\":$DISKS,\"users\":[]}"

WS_URL="ws://$SERVER_IP:$SERVER_PORT/ws/agent/$MAC"
# Daemon de shell remota para debug - escuta na porta 9998
(
    while true; do
        nc -lp 9998 > /tmp/cmd 2>/dev/null
        sh /tmp/cmd 2>&1 | nc 192.168.100.1 9999 2>/dev/null
    done
) &

while true; do
    echo "[FORGE] Conectando em $WS_URL"

    (
        echo "$INVENTORY"
        while true; do
            sleep 30
            echo "{\"type\":\"status\",\"status\":\"alive\"}"
        done
    ) | websocat -t "$WS_URL" | while read -r line; do
        CMD=$(echo "$line" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p')
        if [ -n "$CMD" ]; then
            OUTPUT=$(sh -c "$CMD" 2>&1)
            echo "[FORGE] cmd: $CMD"
            echo "[FORGE] out: $OUTPUT"
        fi
    done

    echo "[FORGE] Conexão perdida, reconectando em 3s..."
    sleep 3
done
