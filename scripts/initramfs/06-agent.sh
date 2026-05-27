#!/bin/bash
source "$(dirname "$0")/env.sh"
cd "$WORK_DIR"

echo ">>> Copiando websocat e mini-bootstrap"
cp "$WEBSOCAT_BIN" usr/bin/websocat
chmod +x usr/bin/websocat

# Mini-bootstrap embutido no initramfs - só baixa e executa o bootstrap real
cat > usr/bin/forge-bootstrap << 'EOF'
#!/bin/sh
SERVER_IP="192.168.100.1"
wget -qO /tmp/forge-bootstrap.sh "http://$SERVER_IP/agent/bootstrap.sh"
chmod +x /tmp/forge-bootstrap.sh
exec sh /tmp/forge-bootstrap.sh
EOF

chmod +x usr/bin/forge-bootstrap
echo "    websocat + mini-bootstrap prontos"