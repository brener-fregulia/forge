#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Extraindo pacotes Alpine"
EXTRACT_DIR=$(mktemp -d)

for apk in $APKS; do
    APK_FILE="$APK_DIR/${apk}.apk"
    if [ ! -f "$APK_FILE" ]; then
        echo "    AVISO: $APK_FILE não existe"
        continue
    fi
    tar -xzf "$APK_FILE" -C "$EXTRACT_DIR" 2>/dev/null || true
done

echo ">>> Copiando binários"
_copy() {
    local src="$1" dst="$2" label="$3"
    [ -f "$src" ] && cp "$src" "$dst" && chmod +x "$dst" && echo "    + $label"
}

_copy "$EXTRACT_DIR/bin/lsblk"              usr/bin/lsblk         lsblk
_copy "$EXTRACT_DIR/usr/sbin/smartctl"      usr/sbin/smartctl     smartctl
_copy "$EXTRACT_DIR/bin/ntfs-3g"            usr/bin/ntfs-3g       ntfs-3g
_copy "$EXTRACT_DIR/sbin/mount.ntfs-3g"     sbin/mount.ntfs-3g    mount.ntfs-3g
_copy "$EXTRACT_DIR/usr/sbin/ntfsclone"     usr/sbin/ntfsclone    ntfsclone
_copy "$EXTRACT_DIR/usr/sbin/mkfs.ntfs"     usr/sbin/mkfs.ntfs    mkfs.ntfs
_copy "$EXTRACT_DIR/usr/sbin/mkntfs"        usr/sbin/mkntfs       mkntfs
_copy "$EXTRACT_DIR/usr/bin/ntfsfix"        usr/bin/ntfsfix       ntfsfix
_copy "$EXTRACT_DIR/usr/sbin/ntfslabel"     usr/sbin/ntfslabel    ntfslabel
_copy "$EXTRACT_DIR/sbin/hdparm"            sbin/hdparm           hdparm
_copy "$EXTRACT_DIR/usr/bin/sgdisk"         usr/bin/sgdisk        sgdisk
_copy "$EXTRACT_DIR/sbin/mkfs.fat"          sbin/mkfs.fat         mkfs.fat
_copy "$EXTRACT_DIR/usr/bin/wimlib-imagex"  usr/bin/wimlib-imagex wimlib-imagex

[ -f "$EXTRACT_DIR/usr/lib/libwim.so.15" ] && \
    cp -P "$EXTRACT_DIR/usr/lib/libwim.so."* usr/lib/ 2>/dev/null && echo "    + libwim"

echo ">>> Copiando libs"
mkdir -p usr/lib lib
[ -d "$EXTRACT_DIR/usr/lib" ] && cp -P "$EXTRACT_DIR/usr/lib/"*.so* usr/lib/ 2>/dev/null || true
[ -d "$EXTRACT_DIR/lib" ]     && cp -P "$EXTRACT_DIR/lib/"*.so* lib/ 2>/dev/null || true

echo "    Total libs:"
ls usr/lib/*.so* 2>/dev/null | wc -l | sed 's|^|      usr/lib: |'
ls lib/*.so* 2>/dev/null | wc -l | sed 's|^|      lib: |'

rm -rf "$EXTRACT_DIR"