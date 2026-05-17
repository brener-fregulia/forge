#!/bin/sh
# Servidor HTTP do FORGE agent - uma conexão por vez via socat

HTTP_PORT=8765
LIB="${LIB:-/usr/lib/forge}"

start_http_server() {
    while true; do
        LD_LIBRARY_PATH="$LIB/../bin" \
        "$LIB/../bin/socat" \
            TCP4-LISTEN:$HTTP_PORT,reuseaddr,fork \
            EXEC:"sh $LIB/http_handler.sh" \
            2>/dev/null
        sleep 1
    done &
    echo "[FORGE] HTTP server na porta $HTTP_PORT"
}