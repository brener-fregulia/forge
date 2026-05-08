#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Extraindo initramfs base"
zcat "$ALPINE_INITRAMFS_BASE" | cpio -id 2>/dev/null