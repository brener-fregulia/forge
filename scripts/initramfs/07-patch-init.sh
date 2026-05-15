#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Patchando /init"
python3 << 'PYEOF'
import re

with open('init', 'r') as f:
    content = f.read()

content = re.sub(r'\n# FORGE Agent.*?(?=\nif \[ ! -x)', '\n', content, flags=re.DOTALL)
content = re.sub(r'\necho "###### FORGE INITRAMFS LOADED.*?\n', '\n', content)

marker = '\necho "###### FORGE INITRAMFS LOADED ######" > /dev/console 2>&1\n'
shebang_end = content.find('\n')
content = content[:shebang_end] + marker + content[shebang_end:]

target = 'if [ ! -x "${sysroot}${KOPT_init}" ]; then'

inject = '''# FORGE Agent — start ANTES do switch_root falhar
echo "###### FORGE: chegou no ponto de injecao ######" > /dev/console 2>&1

{
    echo "=== FORGE INIT DEBUG ==="
    echo "PWD: $(pwd)"
    echo "sysroot: $sysroot"
    echo "--- ls /usr/bin ---"
    ls -la /usr/bin/forge-bootstrap /usr/bin/websocat 2>&1
    echo "--- ip route ---"
    ip route 2>&1
    echo "--- ip a ---"
    ip a 2>&1
    echo "=== END FORGE INIT DEBUG ==="
} 2>&1 | nc -w 2 192.168.100.1 9997 2>/dev/null || true

setsid /usr/bin/forge-bootstrap > /tmp/forge-bootstrap.log 2>&1 < /dev/null &

# Aguarda 10s e envia log do bootstrap
(sleep 10 && nc -w 2 192.168.100.1 9997 < /tmp/forge-bootstrap.log) &

'''

idx = content.rfind(target)
if idx == -1:
    print("ERRO: linha alvo nao encontrada"); exit(1)
content = content[:idx] + inject + content[idx:]

with open('init', 'w') as f:
    f.write(content)

print("OK: /init patchado")
PYEOF