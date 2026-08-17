#!/bin/bash
# FORGE - setup do usuário de sistema e permissões
# Execute como root: sudo bash setup-user.sh
set -e

FORGE_USER="forge"
FORGE_DIR="/opt/forge"

echo ">>> Criando usuário $FORGE_USER"
if id "$FORGE_USER" &>/dev/null; then
    echo "    já existe, pulando"
else
    useradd --system --no-create-home --shell /usr/sbin/nologin "$FORGE_USER"
    echo "    criado"
fi

echo ">>> Ajustando dono do projeto"
chown -R "$FORGE_USER":"$FORGE_USER" "$FORGE_DIR"
# Permite que o usuário que executou via sudo continue editando via VSCode/SSH
usermod -aG "$FORGE_USER" "$SUDO_USER"
chmod -R g+rwX "$FORGE_DIR"
echo "    OK"

echo ">>> Instalando regras sudoers"
cat > /etc/sudoers.d/forge << 'EOF'
# FORGE - comandos privilegiados permitidos ao usuário forge
forge ALL=(ALL) NOPASSWD: /usr/sbin/smartctl
forge ALL=(ALL) NOPASSWD: /usr/sbin/mdadm
forge ALL=(ALL) NOPASSWD: /usr/sbin/dmidecode
EOF
chmod 440 /etc/sudoers.d/forge
echo "    /etc/sudoers.d/forge instalado"

echo ""
echo "=== Setup concluído ==="
echo "Reinicie a sessão SSH do $SUDO_USER para o grupo ter efeito."