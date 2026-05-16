#!/bin/sh
# FORGE Bootstrap — baixa e executa o runtime do agent
set -e

SERVER_IP="192.168.100.1"
SERVER_PORT="8080"
FILES_SERVER="http://$SERVER_IP"
RUNTIME_DIR="/tmp/forge-runtime"

mkdir -p "$RUNTIME_DIR/lib/inventory"

wget -qO "$RUNTIME_DIR/forge-agent.sh"            "$FILES_SERVER/agent/forge-agent.sh"
wget -qO "$RUNTIME_DIR/lib/network.sh"            "$FILES_SERVER/agent/lib/network.sh"
wget -qO "$RUNTIME_DIR/lib/inventory.sh"          "$FILES_SERVER/agent/lib/inventory.sh"
wget -qO "$RUNTIME_DIR/lib/inventory/hardware.sh" "$FILES_SERVER/agent/lib/inventory/hardware.sh"
wget -qO "$RUNTIME_DIR/lib/inventory/drives.sh"   "$FILES_SERVER/agent/lib/inventory/drives.sh"
wget -qO "$RUNTIME_DIR/lib/maintenance.sh"        "$FILES_SERVER/agent/lib/maintenance.sh"
wget -qO "$RUNTIME_DIR/lib/websocket.sh"          "$FILES_SERVER/agent/lib/websocket.sh"
wget -qO "$RUNTIME_DIR/lib/json.sh"               "$FILES_SERVER/agent/lib/json.sh"
wget -qO "$RUNTIME_DIR/lib/forge-ls.sh"           "$FILES_SERVER/agent/lib/forge-ls.sh"
mkdir -p "$RUNTIME_DIR/bin"
wget -qO "$RUNTIME_DIR/bin/socat"              "$FILES_SERVER/agent/bin/socat"
wget -qO "$RUNTIME_DIR/bin/libreadline.so.8"   "$FILES_SERVER/agent/bin/libreadline.so.8"
wget -qO "$RUNTIME_DIR/bin/libreadline.so.8.3" "$FILES_SERVER/agent/bin/libreadline.so.8.3"

chmod +x "$RUNTIME_DIR/bin/socat"
chmod +x "$RUNTIME_DIR/forge-agent.sh"

export LIB="$RUNTIME_DIR/lib"
export LD_LIBRARY_PATH="$RUNTIME_DIR/bin:$LD_LIBRARY_PATH"
export SERVER_IP
export SERVER_PORT

exec env LIB="$RUNTIME_DIR/lib" sh "$RUNTIME_DIR/forge-agent.sh"
