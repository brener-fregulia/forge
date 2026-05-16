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
    server/.env.example
    server/run.sh
    server/app/main.py
    server/app/config.py
    server/app/state.py
    server/app/disk_io.py
    server/app/db/base.py
    server/app/db/models/client.py
    server/app/db/models/deploy.py
    server/app/db/services/machine.py
    server/app/routes/pages.py
    server/app/routes/api/__init__.py
    server/app/routes/api/machines.py
    server/app/routes/api/commands.py
    server/app/routes/api/deploy.py
    server/app/routes/api/terminal.py
    server/app/routes/api/server/__init__.py
    server/app/routes/api/server/status.py
    server/app/routes/api/server/cpu.py
    server/app/routes/api/server/ram.py
    server/app/routes/api/server/storage.py
    server/app/routes/ws/__init__.py
    server/app/routes/ws/agent.py
    server/app/routes/ws/dashboard.py
    server/app/routes/ws/terminal.py
    server/app/templates/base.html
    server/app/templates/dashboard.html
    server/app/templates/client.html
    server/app/templates/partials/client/header.html
    server/app/templates/partials/client/meta.html
    server/app/templates/partials/client/hardware.html
    server/app/templates/partials/client/disks.html
    server/app/templates/partials/client/users.html
    server/app/templates/partials/client/terminal.html
    server/app/templates/partials/client/command.html
    server/app/templates/partials/client/log.html
    server/app/templates/partials/modals/smart.html
    server/app/templates/partials/modals/config-deploy/index.html
    server/app/templates/partials/modals/config-deploy/tabs/disco.html
    server/app/templates/partials/modals/config-deploy/tabs/backup.html
    server/app/templates/partials/modals/config-deploy/tabs/so.html
    server/app/templates/partials/modals/config-deploy/tabs/pos.html
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
    server/app/static/css/modals/smart.css
    server/app/static/css/modals/config-deploy/base.css
    server/app/static/css/modals/config-deploy/backup.css
    server/app/static/css/modals/config-deploy/disco.css
    server/app/static/css/modals/config-deploy/so.css
    server/app/static/css/modals/config-deploy/pos.css
    server/app/static/js/dashboard.js
    server/app/static/js/client.js
    server/app/static/js/lib/anvil/dom.js
    server/app/static/js/lib/anvil/state.js
    server/app/static/js/lib/anvil/element.js
    server/app/static/js/lib/ui/builders.js
    server/app/static/js/lib/ui/modal.js
    server/app/static/js/lib/ui/tabs.js
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
    server/app/static/js/pages/client/deploy/modal/disco.js
    server/app/static/js/pages/client/deploy/modal/backup.js
    server/app/static/js/pages/client/deploy/modal/so.js
    server/app/static/js/pages/client/deploy/modal/pos.js
    scripts/build-initramfs.sh
    scripts/setup-agent-bins.sh
    scripts/setup-user.sh
    scripts/initramfs/env.sh
    scripts/initramfs/01-check.sh
    scripts/initramfs/02-prepare.sh
    scripts/initramfs/03-extract.sh
    scripts/initramfs/04-drivers.sh
    scripts/initramfs/05-packages.sh
    scripts/initramfs/06-agent.sh
    scripts/initramfs/07-patch-init.sh
    scripts/initramfs/08-repack.sh
    docs/README.md
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
)

mkdir -p "$(dirname "$OUT")"

if ! touch "$OUT" 2>/dev/null; then
    echo "Erro: sem permissão para escrever em: $OUT" >&2
    echo "Tente outro caminho, por exemplo:" >&2
    echo "  $0 /home/$USER/forge-dump.txt" >&2
    exit 1
fi

: > "$OUT"

{
    echo "================================================================"
    echo "FORGE DUMP"
    echo "================================================================"
    echo "Gerado em: $(date)"
    echo "Diretório base: $FORGE"
    echo "Arquivo de saída: $OUT"
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
            echo "# ERRO: arquivo existe, mas não pode ser lido: $file" >> "$OUT"
        fi
    else
        echo "# AUSENTE: $relpath" >> "$OUT"
    fi

    echo "" >> "$OUT"
done

echo "Dump gerado em: $OUT"
wc -l "$OUT"