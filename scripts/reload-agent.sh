#!/bin/bash
# Recarrega o runtime do agent em todos os clientes conectados via API

SERVER="http://localhost:8080"

clients=$(curl -s "$SERVER/api/clients" | python3 -c "
import sys, json
for c in json.load(sys.stdin):
    print(c['mac'])
")

if [ -z "$clients" ]; then
    echo "Nenhum cliente conectado."
    exit 0
fi

for mac in $clients; do
    echo ">>> Recarregando agent em $mac"
    curl -s -X POST "$SERVER/api/clients/$mac/command" \
        -H "Content-Type: application/json" \
        -d '{"command":"kill $(pgrep websocat); sleep 1; sh /usr/bin/forge-bootstrap"}' \
        > /dev/null
    echo "    enviado"
done

echo "=== Reload concluído ==="