// Componente de tabela de discos

import { formatBytes } from "../lib/format.js";

export function renderDisks(disks, smart) {
    const container = document.getElementById("disks-rendered");
    if (!container) return;
    if (!disks?.length) {
        container.innerHTML = '<p class="empty">Nenhum disco detectado.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Filesystem</th><th>Saúde</th><th>Identificação</th></tr></thead><tbody>';
    for (const d of disks) {
        const isPart = d.type === "part";
        const cls = isPart ? "disk-part" : "disk-main";

        const fs = d.fstype || "";
        const fsBadge = fs
            ? `<span class="fs-badge ${fs === "ntfs" ? "fs-ntfs" : "fs-other"}">${fs}</span>`
            : "—";

        let health = "—";
        if (!isPart && smart?.[d.name]) {
            const s = smart[d.name];
            const passed = s.smart_status?.passed;
            const temp = s.temperature?.current;
            health = passed === true
                ? `<span class="health-badge health-ok">OK</span>`
                : passed === false
                    ? `<span class="health-badge health-fail">FAIL</span>`
                    : `<span class="health-badge health-unknown">?</span>`;
            if (temp != null) health += ` <span class="health-temp">${temp}°C</span>`;
        }

        let ident = "—";
        if (!isPart) {
            const label = [d.vendor, d.model].filter(Boolean).map(s => s.trim()).join(" ") || "—";
            const serial = d.serial ? `<div class="disk-serial">SN: <code>${d.serial}</code></div>` : "";
            ident = `<div>${label}</div>${serial}`;
        }

        html += `<tr class="${cls}">
            <td><code>${d.name}</code></td>
            <td>${d.type}</td>
            <td>${formatBytes(d.size)}</td>
            <td>${fsBadge}</td>
            <td>${health}</td>
            <td>${ident}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

export function tryInitialRender() {
    try {
        const raw = document.getElementById("disks")?.textContent.trim();
        if (!raw) return;
        let disks;
        try { disks = JSON.parse(raw); }
        catch { disks = JSON.parse(raw.replace(/'/g, '"')); }
        renderDisks(disks, {});
    } catch (e) {
        console.warn("Erro ao renderizar discos iniciais:", e);
    }
}