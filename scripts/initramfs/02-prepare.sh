#!/bin/bash
source "$(dirname "$0")/env.sh"

echo ">>> Preparando $WORK_DIR"
sudo rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"