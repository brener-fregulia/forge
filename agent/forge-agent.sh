#!/bin/sh
# FORGE Agent — cliente Alpine
SERVER_IP="192.168.100.1"
SERVER_PORT="8080"
FIFO=/tmp/forge-out

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

# Coleta discos parseando lsblk (busybox sem -J)
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

INVENTORY="{\"type\":\"inventory\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\"},\"disks\":$DISKS,\"users\":[]}"

WS_URL="ws://$SERVER_IP:$SERVER_PORT/ws/agent/$MAC"

# Loop de reconexão
while true; do
    echo "[FORGE] Conectando em $WS_URL"

    # Recria FIFO limpo
    rm -f "$FIFO"
    mkfifo "$FIFO"

    # Producer 1: envia inventário inicial e heartbeat
    (
        # Mantém o FIFO sempre aberto para escrita (evita EOF)
        echo "$INVENTORY"
        while true; do
            sleep 30
            echo "{\"type\":\"status\",\"status\":\"alive\"}"
        done
    ) > "$FIFO" &
    PROD_PID=$!

    # Producer 2: processa comandos recebidos do servidor e devolve output pelo FIFO
    (
        websocat -t "$WS_URL" < "$FIFO" | while read -r line; do
            CMD=$(echo "$line" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p')
            if [ -n "$CMD" ]; then
                echo "[FORGE] cmd recebido: $CMD" >&2
                OUTPUT=$(sh -c "$CMD" 2>&1)
                OUTPUT_ESC=$(echo "$OUTPUT" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\n/\\n/g')
                # Escreve no FIFO via subshell (não bloqueia)
                echo "{\"type\":\"command_output\",\"output\":\"$OUTPUT_ESC\"}" > "$FIFO" &
            fi
        done
    )

    # Quando websocat morre, mata o producer e reinicia
    kill $PROD_PID 2>/dev/null
    rm -f "$FIFO"

    echo "[FORGE] Conexão perdida, reconectando em 3s..."
    sleep 3
done