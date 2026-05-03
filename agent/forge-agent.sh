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

# Coleta discos com lsblk --pairs + enriquece com serial do sysfs
DISKS_TMP=/tmp/forge-disks.tmp
> $DISKS_TMP

lsblk -b -n -P -o NAME,SIZE,TYPE,FSTYPE,MODEL,VENDOR 2>/dev/null | while IFS= read -r LINE; do
    NAME=""; SIZE=""; TYPE=""; FSTYPE=""; MODEL=""; VENDOR=""

    # Extrai cada KEY="VALUE" via shell parameter expansion
    eval "$(echo "$LINE" | tr ' ' '\n' | grep -E '^[A-Z]+="' | sed 's/^/local_/')" 2>/dev/null

    # Fallback: parse manual via sed
    NAME=$(echo "$LINE"   | sed -n 's/.*\(^\| \)NAME="\([^"]*\)".*/\2/p')
    SIZE=$(echo "$LINE"   | sed -n 's/.*\(^\| \)SIZE="\([^"]*\)".*/\2/p')
    TYPE=$(echo "$LINE"   | sed -n 's/.*\(^\| \)TYPE="\([^"]*\)".*/\2/p')
    FSTYPE=$(echo "$LINE" | sed -n 's/.*\(^\| \)FSTYPE="\([^"]*\)".*/\2/p')
    MODEL=$(echo "$LINE"  | sed -n 's/.*\(^\| \)MODEL="\([^"]*\)".*/\2/p')
    VENDOR=$(echo "$LINE" | sed -n 's/.*\(^\| \)VENDOR="\([^"]*\)".*/\2/p')

    [ -z "$NAME" ] && continue

    # Lê serial do sysfs (mais confiável que lsblk SERIAL)
    SERIAL=""
    for path in "/sys/class/block/$NAME/device/serial" "/sys/class/block/$NAME/device/wwid"; do
        if [ -r "$path" ]; then
            RAW=$(cat "$path" 2>/dev/null | tr -d '\n')
            # wwid vem como "t10.ATA  MODEL  SERIAL" — pega último campo
            if echo "$RAW" | grep -q "^t10\."; then
                SERIAL=$(echo "$RAW" | awk '{print $NF}')
            else
                SERIAL="$RAW"
            fi
            [ -n "$SERIAL" ] && break
        fi
    done

    # Limpa espaços e escapa aspas
    MODEL=$(echo "$MODEL" | sed 's/^ *//;s/ *$//;s/"/\\"/g')
    VENDOR=$(echo "$VENDOR" | sed 's/^ *//;s/ *$//;s/"/\\"/g')
    SERIAL=$(echo "$SERIAL" | sed 's/^ *//;s/ *$//;s/"/\\"/g')

    [ -z "$SIZE" ] && SIZE=0

    printf '{"name":"%s","size":%s,"type":"%s","fstype":"%s","model":"%s","serial":"%s","vendor":"%s"},' \
        "$NAME" "$SIZE" "$TYPE" "$FSTYPE" "$MODEL" "$SERIAL" "$VENDOR" >> $DISKS_TMP
done

DISKS_INNER=$(cat $DISKS_TMP | sed 's/,$//')
DISKS="[$DISKS_INNER]"

# Enriquece DISKS com dados SMART (apenas para discos físicos, não partições)
DISKS_WITH_SMART_TMP=/tmp/forge-disks-smart.tmp
> $DISKS_WITH_SMART_TMP

# Lista apenas nomes de discos físicos (type=disk)
PHYSICAL_DISKS=$(lsblk -b -n -d -o NAME 2>/dev/null)

# Para cada disco físico, coleta SMART
SMART_JSON_TMP=/tmp/forge-smart.json
> $SMART_JSON_TMP
echo "{" >> $SMART_JSON_TMP
FIRST_SMART=1
for disk in $PHYSICAL_DISKS; do
    SMART_DATA=$(smartctl -H -A -j "/dev/$disk" 2>/dev/null)
    if [ -n "$SMART_DATA" ]; then
        # Remove quebras de linha e escapa para virar valor JSON
        SMART_ESC=$(echo "$SMART_DATA" | tr -d '\n' | sed 's/"/\\"/g')
        [ "$FIRST_SMART" = "1" ] && FIRST_SMART=0 || echo "," >> $SMART_JSON_TMP
        echo "\"$disk\":\"$SMART_ESC\"" >> $SMART_JSON_TMP
    fi
done
echo "}" >> $SMART_JSON_TMP

# Em vez de embedar SMART em cada disco (complexo), envia separado
SMART_JSON=$(cat $SMART_JSON_TMP | tr -d '\n')

INVENTORY="{\"type\":\"inventory\",\"hostname\":\"$HOSTNAME\",\"hardware\":{\"cpu\":\"$CPU\",\"ram_mb\":$RAM_MB,\"iface\":\"$IFACE\"},\"disks\":$DISKS,\"smart\":$SMART_JSON,\"users\":[]}"

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
            # Extrai "command" usando awk (lida com aspas escapadas)
            CMD=$(echo "$line" | awk -F'"command":"' '{
                if (NF < 2) exit
                s = $2
                # Encontra a posição da aspa não escapada de fechamento
                out = ""
                i = 1
                while (i <= length(s)) {
                    c = substr(s, i, 1)
                    if (c == "\\" && i < length(s)) {
                        n = substr(s, i+1, 1)
                        if (n == "\"") { out = out "\""; i += 2; continue }
                        if (n == "\\") { out = out "\\"; i += 2; continue }
                        if (n == "n") { out = out "\n"; i += 2; continue }
                        out = out c n; i += 2; continue
                    }
                    if (c == "\"") break
                    out = out c
                    i++
                }
                print out
            }')
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