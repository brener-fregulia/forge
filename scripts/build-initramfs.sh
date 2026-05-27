#!/bin/bash
# FORGE - Build do initramfs Alpine customizado
set -e

STEPS_DIR="$(dirname "$0")/initramfs"
echo "=== FORGE Build initramfs ==="

for step in "$STEPS_DIR"/0*.sh; do
    bash "$step"
done