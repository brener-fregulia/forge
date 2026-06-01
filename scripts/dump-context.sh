cat > /opt/forge/scripts/dump-context.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

FORGE="/opt/forge"
OUT="${1:-/tmp/forge-dump.$(date +%Y%m%d-%H%M%S).txt}"

FILES=(
    agent/bootstrap.sh
    agent/forge-agent.sh
    agent/lib/network.sh
    agent/lib/inventory.sh
    agent/lib/inventory/hardware.sh
    agent/lib/inventory/drives.sh
    agent/lib/maintenance.sh
    agent/lib/websocket.sh
    agent/lib/json.sh
    agent/lib/forge-ls.sh
    agent/lib/http_server.sh
    agent/lib/http_handler.sh
    agent/lib/backup_minimal.sh
    agent/lib/format.sh
    server/.env.example
    server/run.sh
    server/app/main.py
    server/app/config.py
    server/app/state.py
    server/app/db/base.py
    server/app/db/models/client.py
    server/app/db/models/deploy.py
    server/app/db/services/machine.py
    server/app/routes/pages.py
    server/app/routes/api/__init__.py
    server/app/routes/api/clients/__init__.py
    server/app/routes/api/clients/machines.py
    server/app/routes/api/clients/commands.py
    server/app/routes/api/clients/deploys.py
    server/app/routes/api/clients/terminals.py
    server/app/routes/api/clients/execs.py
    server/app/routes/api/clients/backups.py
    server/app/routes/api/server/__init__.py
    server/app/routes/api/server/status.py
    server/app/routes/api/server/cpu.py
    server/app/routes/api/server/ram.py
    server/app/routes/api/server/storage.py
    server/app/routes/api/server/logs.py
    server/app/routes/api/server/backups.py
    server/app/routes/api/server/switch.py
    server/app/routes/ws/__init__.py
    server/app/routes/ws/agent.py
    server/app/routes/ws/dashboard.py
    server/app/routes/ws/terminal.py
    server/app/services/disk_io.py
    server/app/services/switch_monitor.py
    server/app/services/backup_receiver.py
    server/app/services/forge_log.py
    server/app/templates/base.html
    server/app/templates/dashboard.html
    server/app/templates/client.html
    server/app/templates/logs.html
    server/app/templates/backups.html
    server/app/templates/partials/client/header.html
    server/app/templates/partials/client/hardware.html
    server/app/templates/partials/client/disks.html
    server/app/templates/partials/client/users.html
    server/app/templates/partials/client/terminal.html
    server/app/templates/partials/client/command.html
    server/app/templates/partials/client/log.html
    server/app/templates/partials/modals/smart.html
    server/app/templates/partials/modals/config-deploy/index.html
    server/app/templates/partials/modals/config-deploy/tabs/disk.html
    server/app/templates/partials/modals/config-deploy/tabs/backup.html
    server/app/templates/partials/modals/config-deploy/tabs/os.html
    server/app/templates/partials/modals/config-deploy/tabs/post-install.html
    server/app/static/css/style.css
    server/app/static/css/base.css
    server/app/static/css/components.css
    server/app/static/css/modals.css
    server/app/static/css/components/button.css
    server/app/static/css/components/badge.css
    server/app/static/css/components/form.css
    server/app/static/css/components/modal.css
    server/app/static/css/components/progress.css
    server/app/static/css/components/loading.css
    server/app/static/css/components/tabs.css
    server/app/static/css/components/summary.css
    server/app/static/css/components/tables/base.css
    server/app/static/css/components/tables/disks.css
    server/app/static/css/components/tables/users.css
    server/app/static/css/pages/dashboard.css
    server/app/static/css/pages/dashboard-server-status.css
    server/app/static/css/pages/client.css
    server/app/static/css/pages/logs.css
    server/app/static/css/pages/backups.css
    server/app/static/css/modals/smart.css
    server/app/static/css/modals/config-deploy/base.css
    server/app/static/css/modals/config-deploy/backup.css
    server/app/static/css/modals/config-deploy/disk.css
    server/app/static/css/modals/config-deploy/os.css
    server/app/static/css/modals/config-deploy/post-install.css
    server/app/static/js/dashboard.js
    server/app/static/js/client.js
    server/app/static/js/lib/anvil/dom.js
    server/app/static/js/lib/anvil/state.js
    server/app/static/js/lib/anvil/element.js
    server/app/static/js/lib/ui/builders.js
    server/app/static/js/lib/ui/modal.js
    server/app/static/js/lib/ui/tabs.js
    server/app/static/js/lib/ui/icons.js
    server/app/static/js/lib/ui/clipboard.js
    server/app/static/js/lib/format.js
    server/app/static/js/lib/ws.js
    server/app/static/js/components/disks-table.js
    server/app/static/js/components/users-table.js
    server/app/static/js/components/hardware-card.js
    server/app/static/js/components/smart-modal.js
    server/app/static/js/pages/dashboard/client-grid.js
    server/app/static/js/pages/dashboard/server-status.js
    server/app/static/js/pages/dashboard/modals/server-cpu.js
    server/app/static/js/pages/dashboard/modals/server-ram.js
    server/app/static/js/pages/dashboard/modals/server-storage.js
    server/app/static/js/pages/client/alias.js
    server/app/static/js/pages/client/command.js
    server/app/static/js/pages/client/log.js
    server/app/static/js/pages/client/terminal/index.js
    server/app/static/js/pages/client/deploy/index.js
    server/app/static/js/pages/client/deploy/modal/index.js
    server/app/static/js/pages/client/deploy/modal/disk.js
    server/app/static/js/pages/client/deploy/modal/backup.js
    server/app/static/js/pages/client/deploy/modal/os.js
    server/app/static/js/pages/client/deploy/modal/post-install.js
    server/app/static/js/pages/logs.js
    server/app/static/js/pages/backups.js
    scripts/build-initramfs.sh
    scripts/setup-agent-bins.sh
    scripts/setup-user.sh
    scripts/reload-agent.sh
    scripts/initramfs/env.sh
    scripts/initramfs/01-check.sh
    scripts/initramfs/02-prepare.sh
    scripts/initramfs/03-extract.sh
    scripts/initramfs/04-drivers.sh
    scripts/initramfs/05-packages.sh
    scripts/initramfs/06-agent.sh
    scripts/initramfs/07-patch-init.sh
    scripts/initramfs/08-repack.sh
    docs/01-visao-geral.md
    docs/02-hardware.md
    docs/03-storage.md
    docs/04-software.md
    docs/05-estrutura.md
    docs/06-configuracao.md
    docs/07-initramfs.md
    docs/08-dashboard.md
    docs/09-roadmap.md
    docs/10-problemas.md
    docs/11-convencoes.md
    docs/12-anvil.md
    docs/13-paginas.md
    docs/14-pendencias.md
    README.md
)

mkdir -p "$(dirname "$OUT")"

if ! touch "$OUT" 2>/dev/null; then
    echo "Erro: sem permissao para escrever em: $OUT" >&2
    exit 1
fi

: > "$OUT"

{
    echo "================================================================"
    echo "FORGE DUMP"
    echo "================================================================"
    echo "Gerado em: $(date)"
    echo "Diretorio base: $FORGE"
    echo "Arquivo de saida: $OUT"
    echo ""
} >> "$OUT"

for relpath in "${FILES[@]}"; do
    file="$FORGE/$relpath"
    {
        echo "================================================================"
        echo "ARQUIVO: $relpath"
        echo "================================================================"
    } >> "$OUT"

    if [[ -f "$file" ]]; then
        if [[ -r "$file" ]]; then
            cat "$file" >> "$OUT"
        else
            echo "# ERRO: arquivo existe mas nao pode ser lido: $file" >> "$OUT"
        fi
    else
        echo "# AUSENTE: $relpath" >> "$OUT"
    fi

    echo "" >> "$OUT"
done

echo "Dump gerado em: $OUT"
wc -l "$OUT"
SCRIPT
chmod +x /opt/forge/scripts/dump-context.sh