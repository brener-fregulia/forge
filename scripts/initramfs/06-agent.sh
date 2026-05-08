#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Copiando websocat e forge-agent"
cp "$WEBSOCAT_BIN" usr/bin/websocat
cp "$AGENT_SCRIPT" usr/bin/forge-agent
chmod +x usr/bin/websocat usr/bin/forge-agent

mkdir -p usr/lib/forge/inventory
for lib in "$PROJECT_ROOT/agent/lib/"*.sh; do
    cp "$lib" usr/lib/forge/
done
for lib in "$PROJECT_ROOT/agent/lib/inventory/"*.sh; do
    cp "$lib" usr/lib/forge/inventory/
done
echo "    libs do agent: $(ls usr/lib/forge/) | inventory: $(ls usr/lib/forge/inventory/)"