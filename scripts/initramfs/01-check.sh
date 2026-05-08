#!/bin/bash
source "$(dirname "$0")/env.sh"

echo ">>> Verificando dependências"
[ ! -f "$ALPINE_INITRAMFS_BASE" ] && { echo "ERRO: $ALPINE_INITRAMFS_BASE não existe"; exit 1; }
[ ! -f "$ALPINE_MODLOOP" ]        && { echo "ERRO: $ALPINE_MODLOOP não existe"; exit 1; }
[ ! -f "$WEBSOCAT_BIN" ]          && { echo "ERRO: baixe websocat para $WEBSOCAT_BIN primeiro"; exit 1; }
[ ! -f "$AGENT_SCRIPT" ]          && { echo "ERRO: $AGENT_SCRIPT não existe"; exit 1; }
echo "    OK"