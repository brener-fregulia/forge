#!/bin/sh
# FORGE Agent — entrypoint

SERVER_IP="192.168.100.1"
SERVER_PORT="8080"
LIB="/usr/lib/forge"

. "$LIB/json.sh"
. "$LIB/network.sh"
. "$LIB/inventory.sh"
. "$LIB/websocket.sh"

network_wait
network_info

INVENTORY=$(inventory_collect)
WS_URL="ws://$SERVER_IP:$SERVER_PORT/ws/agent/$MAC"

forge_loop "$INVENTORY" "$WS_URL"