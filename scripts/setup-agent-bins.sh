# scripts/setup-agent-bins.sh
#!/bin/bash
# Baixa e extrai binários necessários para o agent Alpine
set -e

BUILD_DIR="/opt/forge/build"
BIN_DIR="/opt/forge/agent/bin"
mkdir -p "$BIN_DIR"

PKGS=(
    "socat-1.8.0.3-r1.apk|https://dl-cdn.alpinelinux.org/alpine/v3.23/main/x86_64/socat-1.8.0.3-r1.apk"
    "readline-8.3.1-r0.apk|https://dl-cdn.alpinelinux.org/alpine/v3.23/main/x86_64/readline-8.3.1-r0.apk"
)

TMP=$(mktemp -d)

for pkg in "${PKGS[@]}"; do
    name="${pkg%%|*}"
    url="${pkg##*|}"
    apk="$BUILD_DIR/$name"
    [ -f "$apk" ] || wget -q "$url" -O "$apk"
    tar -xzf "$apk" -C "$TMP" 2>/dev/null || true
done

cp "$TMP/usr/bin/socat" "$BIN_DIR/"
cp "$TMP/usr/lib/libreadline.so.8" "$BIN_DIR/"
cp "$TMP/usr/lib/libreadline.so.8.3" "$BIN_DIR/"
chmod +x "$BIN_DIR/socat"
chmod o+rx "$BIN_DIR"
chmod o+r "$BIN_DIR/"*

rm -rf "$TMP"
echo "Binários do agent instalados em $BIN_DIR"