import { qs, qsa, on, setContent, setHtml, cloneTemplate, toggleClass } from "../lib/anvil/dom.js";
import { formatBytes } from "../lib/format.js";
import { initTabs } from "../lib/ui/tabs.js";

let _currentTab = "hot";

async function fetchBackups(tab) {
    const res = await fetch(`/api/server/backups/${tab}`);
    const data = await res.json();
    return data.clients || [];
}

function _formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleString("pt-BR");
}

function _modeLabel(mode) {
    return { raw: "Raw Image", minimal: "Mínimo", compressed: "Compactado" }[mode] || mode;
}

function _modeColor(mode) {
    return { raw: "var(--accent)", minimal: "var(--blue)", compressed: "var(--green)" }[mode] || "var(--text-dim)";
}

function _renderDetail(client, backup) {
    const m = backup.manifest || {};
    const detail = qs("#backups-detail");

    let duration = "—";
    let speed    = "—";
    if (m.started_at && m.finished_at) {
        const secs = (new Date(m.finished_at) - new Date(m.started_at)) / 1000;
        const mins = Math.floor(secs / 60);
        const s    = Math.round(secs % 60);
        duration   = mins > 0 ? `${mins}m ${s}s` : `${s}s`;
        if (secs > 0 && m.bytes) {
            const mbps = (m.bytes / 1024 / 1024 / secs).toFixed(1);
            speed = `${mbps} MB/s`;
        }
    }

    const rows = [
        ["MAC",         m.mac         || client.mac],
        ["Modo",        _modeLabel(backup.mode)],
        ["Dispositivo", m.device      || "—"],
        ["Status",      m.status      || "—"],
        ["Tamanho",     formatBytes(backup.size)],
        ["Duração",     duration],
        ["Velocidade",  speed],
        ["Iniciado",    m.started_at  ? new Date(m.started_at).toLocaleString("pt-BR")  : "—"],
        ["Concluído",   m.finished_at ? new Date(m.finished_at).toLocaleString("pt-BR") : "—"],
        ["Job ID",      m.job_id      || "—"],
    ];

    const html = `
        <div class="backups-detail-header">
            <span class="backup-detail-name">${backup.name}</span>
        </div>
        <table class="forge-table" style="margin-top:1rem">
            <tbody>
                ${rows.map(([k, v]) => `<tr><td style="color:var(--text-dim);width:120px">${k}</td><td style="font-family:monospace">${v}</td></tr>`).join("")}
            </tbody>
        </table>
    `;
    setHtml(detail, html);
}

function _renderTree(clients) {
    const tree = qs("#backups-tree");
    setHtml(tree, "");

    if (!clients.length) {
        setHtml(tree, '<p class="empty">Nenhum backup encontrado.</p>');
        return;
    }

    for (const client of clients) {
        const node = cloneTemplate("backup-client-tpl");
        const clientEl = node.querySelector(".backup-client");
        const header = node.querySelector(".backup-client-header");
        const arrow = node.querySelector(".backup-client-arrow");
        const macEl = node.querySelector(".backup-client-mac");
        const itemsEl = node.querySelector(".backup-client-items");

        setContent(macEl, client.mac);

        for (const backup of client.backups) {
            const itemNode = cloneTemplate("backup-item-tpl");
            const itemEl = itemNode.querySelector(".backup-item");
            const modeEl = itemNode.querySelector(".backup-item-mode");
            const nameEl = itemNode.querySelector(".backup-item-name");
            const sizeEl = itemNode.querySelector(".backup-item-size");

            setContent(modeEl, _modeLabel(backup.mode));
            modeEl.style.color = _modeColor(backup.mode);
            setContent(nameEl, backup.name);
            setContent(sizeEl, formatBytes(backup.size));

            itemsEl.appendChild(itemNode);

            // itemEl agora está no DOM — busca pelo nome único
            const mountedEl = itemsEl.lastElementChild;
            on(mountedEl, "click", () => {
                qsa(".backup-item", qs("#backups-tree")).forEach(el => el.classList.remove("selected"));
                mountedEl.classList.add("selected");
                _renderDetail(client, backup);
            });
        }

        on(header, "click", () => {
            const isOpen = itemsEl.style.display !== "none";
            itemsEl.style.display = isOpen ? "none" : "block";
            setContent(arrow, isOpen ? "▶" : "▼");
        });

        tree.appendChild(clientEl);
    }
}

async function loadTab(tab) {
    setHtml(qs("#backups-tree"), '<span class="loading"><span class="spinner"></span>Carregando…</span>');
    setHtml(qs("#backups-detail"), '<p class="empty">Selecione um backup para ver os detalhes.</p>');
    const clients = await fetchBackups(tab);
    _renderTree(clients);
}

initTabs("backups-layout", {
    clickable: false,
});

// Tab manual pois o layout nao e um container de tabs padrao
qsa(".tab-btn", qs(".client-tabs-header")).forEach(btn => {
    on(btn, "click", () => {
        if (btn.disabled) return;
        qsa(".tab-btn", qs(".client-tabs-header")).forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        _currentTab = btn.dataset.tab;
        loadTab(_currentTab);
    });
});

loadTab("hot");