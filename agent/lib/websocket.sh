#!/bin/sh
# Loop de conexão WebSocket, FIFO e processamento de comandos

cmd_extract() {
    echo "$1" | awk -F'"command":"' '{
        if (NF < 2) exit
        s = $2; out = ""; i = 1
        while (i <= length(s)) {
            c = substr(s, i, 1)
            if (c == "\\" && i < length(s)) {
                n = substr(s, i+1, 1)
                if (n == "\"") { out = out "\""; i += 2; continue }
                if (n == "\\") { out = out "\\"; i += 2; continue }
                if (n == "n")  { out = out "\n"; i += 2; continue }
                out = out c n; i += 2; continue
            }
            if (c == "\"") break
            out = out c; i++
        }
        print out
    }'
}

forge_loop() {
    BASE_INVENTORY="$1"
    DISKS_INVENTORY="$2"
    WS_URL="$3"
    FIFO=/tmp/forge-out

    while true; do
        echo "[FORGE] Conectando em $WS_URL"
        rm -f "$FIFO"
        mkfifo "$FIFO"

        # Producer: inventário + heartbeat
        (
            # Fase 1: inventário base imediato
            echo "$BASE_INVENTORY"
            # Fase 2: discos + SMART (demora mais)
            echo "$DISKS_INVENTORY"
            # Heartbeat contínuo
            while true; do
                sleep 30
                echo '{"type":"status","status":"alive"}'
            done
        ) > "$FIFO" &
        PROD_PID=$!

       # Watchdog: mata websocat se ficar mais de 20s sem receber nada do servidor
        LAST_MSG_FILE=/tmp/forge-last-msg
        echo "$(date +%s)" > $LAST_MSG_FILE

        (
            while true; do
                sleep 5
                LAST=$(cat $LAST_MSG_FILE 2>/dev/null || echo 0)
                NOW=$(date +%s)
                if [ $((NOW - LAST)) -gt 60 ]; then
                    echo "[FORGE] watchdog: sem resposta do servidor, matando websocat" >&2
                    pkill -f "websocat" 2>/dev/null
                    break
                fi
            done
        ) &
        WATCHDOG_PID=$!

        (
            websocat -t \
                --ping-interval 3 \
                --ping-timeout 5 \
                "$WS_URL" < "$FIFO" | while read -r line; do
                echo "$(date +%s)" > $LAST_MSG_FILE
                CMD=$(cmd_extract "$line")
                if [ -n "$CMD" ]; then
                    echo "[FORGE] cmd: $CMD" >&2
                    OUTPUT=$(sh -c "$CMD" 2>&1)
                    ESC=$(echo "$OUTPUT" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\n/\\n/g')
                    echo "{\"type\":\"command_output\",\"output\":\"$ESC\"}" > "$FIFO" &
                fi
            done
        )

        # Limpeza após desconexão
        kill $WATCHDOG_PID 2>/dev/null
        kill $PROD_PID 2>/dev/null
        rm -f "$FIFO"
        echo "[FORGE] Conexão perdida, reconectando em 3s..."
        sleep 3
    done
}