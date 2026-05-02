#!/bin/bash
# FORGE — Shell remota interativa para clientes Alpine
# Uso: ./client-shell.sh <IP_CLIENTE>

CLIENT_IP="${1:-}"
if [ -z "$CLIENT_IP" ]; then
    echo "Uso: $0 <IP_CLIENTE>"
    echo ""
    echo "Clientes ativos (DHCP):"
    cat /var/lib/misc/dnsmasq.leases 2>/dev/null | awk '{print "  " $3 "  " $2}'
    exit 1
fi

echo "FORGE Client Shell — $CLIENT_IP"
echo "Digite comandos (Ctrl+C para sair):"
echo ""

while true; do
    read -e -p "[$CLIENT_IP] $ " CMD
    [ -z "$CMD" ] && continue
    [ "$CMD" = "exit" ] && break

    # Escuta resposta em background
    OUTPUT=$(timeout 10 nc -lp 9999 2>/dev/null) &
    NC_PID=$!
    sleep 0.2

    # Envia comando para o cliente
    echo "$CMD" | nc -w1 "$CLIENT_IP" 9998 2>/dev/null

    # Aguarda resposta
    wait $NC_PID 2>/dev/null
    echo "$OUTPUT"
done