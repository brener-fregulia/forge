#!/bin/sh
SERVER_IP="192.168.100.1"
SERVER_PORT="8080"
LIB="${LIB:-/usr/lib/forge}"

. "$LIB/json.sh"
. "$LIB/network.sh"
. "$LIB/inventory.sh"
. "$LIB/maintenance.sh"
. "$LIB/websocket.sh"
. "$LIB/http_server.sh"

network_wait
network_info

start_http_server

BASE_INVENTORY=$(inventory_collect_base)
WS_URL="ws://$SERVER_IP:$SERVER_PORT/ws/agent/$MAC"

DISKS_INVENTORY=$(inventory_collect_disks)
post_inventory_maintenance

forge_loop "$BASE_INVENTORY" "$DISKS_INVENTORY" "$WS_URL"