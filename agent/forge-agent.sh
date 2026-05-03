#!/bin/sh
SERVER_IP="192.168.100.1"
SERVER_PORT="8080"
LIB="/usr/lib/forge"

. "$LIB/json.sh"
. "$LIB/network.sh"
. "$LIB/inventory.sh"
. "$LIB/websocket.sh"

network_wait
network_info

BASE_INVENTORY=$(inventory_collect_base)
WS_URL="ws://$SERVER_IP:$SERVER_PORT/ws/agent/$MAC"

# Conecta imediatamente com inventário base
# Coleta discos/SMART em paralelo (demora ~10s)
DISKS_INVENTORY=$(inventory_collect_disks)

forge_loop "$BASE_INVENTORY" "$DISKS_INVENTORY" "$WS_URL"