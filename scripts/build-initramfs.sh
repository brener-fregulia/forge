#!/bin/bash
# FORGE — Build do initramfs Alpine customizado
# Embute: módulos ata/nvme, websocat, forge-agent, ntfsclone

set -e

PROJECT_ROOT="/opt/forge"
WORK_DIR="$PROJECT_ROOT/build/initramfs-work"
TFTP_DIR="/srv/tftp"
WEBSOCAT_BIN="$PROJECT_ROOT/build/websocat"
AGENT_SCRIPT="$PROJECT_ROOT/agent/forge-agent.sh"

# Fontes Alpine (já devem existir no /srv/tftp)
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
sudo cp -r "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/ata" \
           "lib/modules/$KERNEL_VERSION/kernel/drivers/"
sudo cp -r "/mnt/modloop/modules/$KERNEL_VERSION/kernel/drivers/nvme" \
           "lib/modules/$KERNEL_VERSION/kernel/drivers/"
sudo cp "/mnt/modloop/modules/$KERNEL_VERSION/modules."* \
        "lib/modules/$KERNEL_VERSION/"

sudo umount /mnt/modloop

# 5. Copia binários FORGE para o initramfs
echo ">>> Copiando websocat e forge-agent"
cp "$WEBSOCAT_BIN" usr/bin/websocat
cp "$AGENT_SCRIPT" usr/bin/forge-agent
chmod +x usr/bin/websocat usr/bin/forge-agent

# 6. Patcha o /init para copiar binários e iniciar agent no sysroot
echo ">>> Patchando /init"
python3 << 'PYEOF'
with open('init', 'r') as f:
    content = f.read()

# Remove qualquer injeção FORGE anterior
import re
content = re.sub(r'\n# FORGE Agent.*?(?=\nexec switch_root)', '\n', content, flags=re.DOTALL)

target = 'exec switch_root $switch_root_opts $sysroot $chart_init "$KOPT_init" $KOPT_init_args'

inject = '''# FORGE Agent — copia binarios para o sysroot e roda agent direto no initramfs
mkdir -p "$sysroot"/usr/bin
cp /usr/bin/websocat "$sysroot"/usr/bin/websocat 2>/dev/null
cp /usr/bin/forge-agent "$sysroot"/usr/bin/forge-agent 2>/dev/null
chmod +x "$sysroot"/usr/bin/websocat "$sysroot"/usr/bin/forge-agent 2>/dev/null
# Inicia agent como background no contexto atual do initramfs
# (esse Alpine netboot nao faz switch_root real, fica rodando aqui mesmo)
setsid /usr/bin/forge-agent > /tmp/forge-agent.log 2>&1 < /dev/null &

'''

idx = content.rfind(target)
if idx == -1:
    print("ERRO: linha alvo não encontrada"); exit(1)
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
