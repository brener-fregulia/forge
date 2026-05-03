#!/bin/bash
# FORGE — Build do initramfs Alpine customizado
# Embute: módulos ata/nvme, websocat, forge-agent, ntfsclone

set -e

PROJECT_ROOT="/opt/forge"
WORK_DIR="$PROJECT_ROOT/build/initramfs-work"
TFTP_DIR="/srv/tftp"
WEBSOCAT_BIN="$PROJECT_ROOT/build/websocat"
AGENT_SCRIPT="$PROJECT_ROOT/agent/forge-agent.sh"

ALPINE_INITRAMFS_BASE="$TFTP_DIR/alpine-initramfs"
ALPINE_MODLOOP="$TFTP_DIR/alpine-modloop"
KERNEL_VERSION="6.18.7-0-lts"

echo "=== FORGE Build initramfs ==="

# 1. Verifica dependências
[ ! -f "$ALPINE_INITRAMFS_BASE" ] && { echo "ERRO: $ALPINE_INITRAMFS_BASE não existe"; exit 1; }
[ ! -f "$ALPINE_MODLOOP" ] && { echo "ERRO: $ALPINE_MODLOOP não existe"; exit 1; }
[ ! -f "$WEBSOCAT_BIN" ] && { echo "ERRO: baixe websocat para $WEBSOCAT_BIN primeiro"; exit 1; }
[ ! -f "$AGENT_SCRIPT" ] && { echo "ERRO: $AGENT_SCRIPT não existe"; exit 1; }

# 2. Limpa e prepara diretório de trabalho
echo ">>> Preparando $WORK_DIR"
sudo rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# 3. Extrai initramfs base
echo ">>> Extraindo initramfs base"
zcat "$ALPINE_INITRAMFS_BASE" | cpio -id 2>/dev/null

# 4. Monta modloop e copia drivers
echo ">>> Embutindo módulos ata/nvme"
sudo mkdir -p /mnt/modloop
sudo mount -o loop "$ALPINE_MODLOOP" /mnt/modloop 2>/dev/null || true

mkdir -p "lib/modules/$KERNEL_VERSION/kernel/drivers"
# Copia drivers necessários para detectar discos
for drv in ata nvme scsi block usb; do
    if [ -d "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/$drv" ]; then
        sudo cp -r "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/$drv" \
                   "lib/modules/$KERNEL_VERSION/kernel/drivers/"
        echo "    drv: $drv"
    fi
done
sudo cp "/mnt/modloop/modules/$KERNEL_VERSION/modules."* \
        "lib/modules/$KERNEL_VERSION/"

sudo umount /mnt/modloop

# 4.5 Adiciona binários Alpine (musl) + libs necessárias
echo ">>> Adicionando lsblk + smartctl"
APK_DIR="$PROJECT_ROOT/build"

APKS="lsblk libmount libsmartcols libblkid libncursesw libuuid smartmontools libgcc libstdc++ ntfs-3g ntfs-3g-libs"

EXTRACT_DIR=$(mktemp -d)
for apk in $APKS; do
    APK_FILE="$APK_DIR/${apk}.apk"
    if [ ! -f "$APK_FILE" ]; then
        echo "    AVISO: $APK_FILE não existe"
        continue
    fi
    tar -xzf "$APK_FILE" -C "$EXTRACT_DIR" 2>/dev/null || true
done

# Copia binários
[ -f "$EXTRACT_DIR/bin/lsblk" ]         && cp "$EXTRACT_DIR/bin/lsblk"         usr/bin/lsblk         && chmod +x usr/bin/lsblk         && echo "    + lsblk"
[ -f "$EXTRACT_DIR/usr/sbin/smartctl" ] && cp "$EXTRACT_DIR/usr/sbin/smartctl" usr/sbin/smartctl     && chmod +x usr/sbin/smartctl     && echo "    + smartctl"
[ -f "$EXTRACT_DIR/bin/ntfs-3g" ] && cp "$EXTRACT_DIR/bin/ntfs-3g" usr/bin/ntfs-3g && chmod +x usr/bin/ntfs-3g && echo "    + ntfs-3g"
[ -f "$EXTRACT_DIR/sbin/mount.ntfs-3g" ] && cp "$EXTRACT_DIR/sbin/mount.ntfs-3g" sbin/mount.ntfs-3g && chmod +x sbin/mount.ntfs-3g && echo "    + mount.ntfs-3g"

# Copia libs (.so*)
mkdir -p usr/lib lib
[ -d "$EXTRACT_DIR/usr/lib" ] && cp -P "$EXTRACT_DIR/usr/lib/"*.so* usr/lib/ 2>/dev/null || true
[ -d "$EXTRACT_DIR/lib" ]     && cp -P "$EXTRACT_DIR/lib/"*.so* lib/ 2>/dev/null || true

echo "    Total libs:"
ls usr/lib/*.so* 2>/dev/null | wc -l | sed 's|^|      usr/lib: |'
ls lib/*.so* 2>/dev/null | wc -l | sed 's|^|      lib: |'

rm -rf "$EXTRACT_DIR"

# 5. Copia binários FORGE
echo ">>> Copiando websocat e forge-agent"
cp "$WEBSOCAT_BIN" usr/bin/websocat
cp "$AGENT_SCRIPT" usr/bin/forge-agent
chmod +x usr/bin/websocat usr/bin/forge-agent

# Copia libs do agent
mkdir -p usr/lib/forge
for lib in "$PROJECT_ROOT/agent/lib/"*.sh; do
    cp "$lib" usr/lib/forge/
done
echo "    libs do agent: $(ls usr/lib/forge/)"

# 6. Patcha o /init
echo ">>> Patchando /init"
python3 << 'PYEOF'
import re

with open('init', 'r') as f:
    content = f.read()

# 6.1 Remove qualquer injeção FORGE anterior (limpeza)
content = re.sub(r'\n# FORGE Agent.*?(?=\nif \[ ! -x)', '\n', content, flags=re.DOTALL)
content = re.sub(r'\necho "###### FORGE INITRAMFS LOADED.*?\n', '\n', content)

# 6.2 Adiciona marcador visível no console logo no início (após shebang)
marker = '\necho "###### FORGE INITRAMFS LOADED ######" > /dev/console 2>&1\n'
shebang_end = content.find('\n')
content = content[:shebang_end] + marker + content[shebang_end:]

# 6.3 Injeta o agent ANTES da verificação que cai no recovery_shell
target = 'if [ ! -x "${sysroot}${KOPT_init}" ]; then'

inject = '''# FORGE Agent — debug + start ANTES do switch_root falhar
echo "###### FORGE: chegou no ponto de injecao ######" > /dev/console 2>&1

{
    echo "=== FORGE INIT DEBUG ==="
    echo "PWD: $(pwd)"
    echo "sysroot: $sysroot"
    echo "--- ls /usr/bin ---"
    ls -la /usr/bin/forge-agent /usr/bin/websocat 2>&1
    echo "--- ip route ---"
    ip route 2>&1
    echo "--- ip a ---"
    ip a 2>&1
    echo "=== END FORGE INIT DEBUG ==="
} 2>&1 | nc -w 2 192.168.100.1 9997 2>/dev/null || true

# Inicia o agent em background no contexto do initramfs
# Sobrevive mesmo se cair no recovery_shell
setsid /usr/bin/forge-agent > /tmp/forge-agent.log 2>&1 < /dev/null &

'''

idx = content.rfind(target)
if idx == -1:
    print("ERRO: linha alvo nao encontrada"); exit(1)
content = content[:idx] + inject + content[idx:]

with open('init', 'w') as f:
    f.write(content)

print("OK: /init patchado")
PYEOF

# 7. Reempacota
echo ">>> Reempacotando initramfs"
find . | cpio -H newc -o 2>/dev/null | gzip > "$TFTP_DIR/alpine-initramfs-full"
chmod 644 "$TFTP_DIR/alpine-initramfs-full"

echo ""
echo "=== Build concluído ==="
echo "Tamanho: $(du -sh $TFTP_DIR/alpine-initramfs-full)"