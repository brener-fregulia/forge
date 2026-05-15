#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Copiando websocat e bootstrap"
cp "$WEBSOCAT_BIN" usr/bin/websocat
cp "$PROJECT_ROOT/agent/bootstrap.sh" usr/bin/forge-bootstrap
chmod +x usr/bin/websocat usr/bin/forge-bootstrap
echo "    websocat + bootstrap prontos"