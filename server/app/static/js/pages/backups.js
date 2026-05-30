import { qs, qsa, on, setContent, setHtml, cloneTemplate } from "../lib/anvil/dom.js";
import { formatBytes } from "../lib/format.js";

let _currentTab = "hot";

async function fetchBackups(tab) {
    const res = await fetch(`/api/server/backups/${tab}`);
    const data = await res.json();
    return data.clients || [];
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

    let duration = "-";
    let speed    = "-";
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
        ["Dispositivo", m.device      || "-"],
        ["Status",      m.status      || "-"],
        ["Tamanho",     formatBytes(backup.size)],
        ["Duração",     duration],
        ["Velocidade",  speed],
        ["Iniciado",    m.started_at  ? new Date(m.started_at).toLocaleString("pt-BR") : "-"],
        ["Concluído",   m.finished_at ? new Date(m.finished_at).toLocaleString("pt-BR") : "-"],
        ["Job ID",      m.job_id      || "-"],
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

function _makeBtn(cls, title, iconSrc) {
    const btn = document.createElement("button");
    btn.className = cls;
    btn.title     = title;
    const img     = document.createElement("img");
    img.src       = iconSrc;
    img.className = "btn-icon";
    img.alt       = "";
    btn.appendChild(img);
    return btn;
}

function _renderTree(clients) {
    const tree = qs("#backups-tree");
    setHtml(tree, "");

    if (!clients.length) {
        setHtml(tree, '<p class="empty">Nenhum backup encontrado.</p>');
        return;
    }

    for (const client of clients) {
        const node     = cloneTemplate("backup-client-tpl");
        const clientEl = node.querySelector(".backup-client");
        const header   = node.querySelector(".backup-client-header");
        const arrow    = node.querySelector(".backup-client-arrow");
        const macEl    = node.querySelector(".backup-client-mac");
        const itemsEl  = node.querySelector(".backup-client-items");

        setContent(macEl, client.mac);

        const chevron     = document.createElement("img");
        chevron.src       = "/static/vendor/icons/chevron-right.svg";
        chevron.className = "tree-chevron";
        chevron.alt       = "";
        arrow.innerHTML   = "";
        arrow.appendChild(chevron);

        for (const backup of client.backups) {
            const itemNode = cloneTemplate("backup-item-tpl");
            const itemEl   = itemNode.querySelector(".backup-item");
            const modeEl   = itemNode.querySelector(".backup-item-mode");
            const nameEl   = itemNode.querySelector(".backup-item-name");
            const sizeEl   = itemNode.querySelector(".backup-item-size");

            setContent(modeEl, _modeLabel(backup.mode));
            modeEl.style.color = _modeColor(backup.mode);
            setContent(nameEl, backup.name);
            setContent(sizeEl, formatBytes(backup.size));

            const compressBtn = _makeBtn("backup-compress-btn", "Compactar e replicar para cold storage", "/static/vendor/icons/device-floppy.svg");
            const deleteBtn   = _makeBtn("backup-delete-btn", "Excluir backup", "/static/vendor/icons/trash.svg");

            itemsEl.appendChild(itemNode);
            const mountedEl = itemsEl.lastElementChild;

            mountedEl.appendChild(compressBtn);
            mountedEl.appendChild(deleteBtn);

            on(compressBtn, "click", async (e) => {
                e.stopPropagation();
                if (!confirm(`Compactar e replicar ${backup.name} para cold storage?`)) return;
                compressBtn.disabled = true;
                const res = await fetch(`/api/server/backups/${_currentTab}/${client.mac}/${backup.name}/compress`, {
                    method: "POST",
                });
                if (res.ok) loadTab(_currentTab);
                else alert("Erro ao compactar backup");
                compressBtn.disabled = false;
            });

            on(deleteBtn, "click", async (e) => {
                e.stopPropagation();
                if (!confirm(`Excluir ${backup.name}?`)) return;
                const res = await fetch(`/api/server/backups/${_currentTab}/${client.mac}/${backup.name}`, {
                    method: "DELETE",
                });
                if (res.ok) loadTab(_currentTab);
                else alert("Erro ao excluir backup");
            });

            on(mountedEl, "click", () => {
                qsa(".backup-item", qs("#backups-tree")).forEach(el => el.classList.remove("selected"));
                mountedEl.classList.add("selected");
                _renderDetail(client, backup);
            });
        }

        on(header, "click", () => {
            const isOpen = itemsEl.style.display !== "none";
            itemsEl.style.display = isOpen ? "none" : "block";
            chevron.src = isOpen
                ? "/static/vendor/icons/chevron-right.svg"
                : "/static/vendor/icons/chevron-down.svg";
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