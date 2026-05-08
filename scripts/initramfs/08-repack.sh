#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Reempacotando initramfs"
find . | cpio -H newc -o 2>/dev/null | gzip > "$TFTP_DIR/alpine-initramfs-full"
chmod 644 "$TFTP_DIR/alpine-initramfs-full"

echo ""
echo "=== Build concluído ==="
echo "Tamanho: $(du -sh $TFTP_DIR/alpine-initramfs-full)"