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
            <td>
                <code>${d.name}</code>
                ${!isPart ? `<button class="btn-small btn-smart disk-name-link" data-disk="${d.name}">SMART</button>` : ""}
            </td>
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

export function initSmartModal(smart) {
    const overlay = document.getElementById("smart-modal");
    const title   = document.getElementById("smart-modal-title");
    const body    = document.getElementById("smart-modal-body");
    const close   = document.getElementById("smart-modal-close");

    if (!overlay) return;

    // Fecha ao clicar no overlay ou no botão
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    close.addEventListener("click", () => overlay.classList.remove("open"));
    // Delega clique no botão copiar (recriado a cada abertura do modal)
    body.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("btn-copy-smart")) return;
        const disk = title.textContent.replace("SMART — /dev/", "");
        const data = smart?.[disk];
        if (!data) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            const btn = e.target;
            const orig = btn.textContent;
            btn.textContent = "Copiado!";
            btn.classList.add("copied");
            setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1200);
        } catch (err) {
            alert("Erro ao copiar: " + err);
        }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") overlay.classList.remove("open"); });

    // Abre ao clicar no nome do disco
    document.querySelectorAll(".disk-name-link").forEach(el => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            const disk = el.dataset.disk;
            const data = smart?.[disk];
            title.textContent = `SMART — /dev/${disk}`;
            body.innerHTML = data ? renderSmartBody(disk, data) : '<p class="empty">Sem dados SMART para este disco.</p>';
            overlay.classList.add("open");
        });
    });
}

function renderSmartBody(disk, s) {
    const passed  = s.smart_status?.passed;
    const temp    = s.temperature?.current ?? "—";
    const hours   = s.power_on_time?.hours ?? "—";
    const attrs   = s.ata_smart_attributes?.table || [];

    // Atributos críticos para destacar
    const critical = new Set([5, 10, 184, 187, 188, 196, 197, 198, 201]);

    const statusBadge = passed === true
        ? `<span class="health-badge health-ok">PASSED</span>`
        : passed === false
            ? `<span class="health-badge health-fail">FAILED</span>`
            : `<span class="health-badge health-unknown">UNKNOWN</span>`;

    const rawJson = JSON.stringify(s, null, 2);
    let html = `
        <button class="btn-small btn-copy-smart" style="float:right;margin-bottom:0.5rem">Copiar JSON</button>
        <div class="smart-summary">
            <div class="smart-summary-item">${statusBadge}<span>Status</span></div>
            <div class="smart-summary-item"><strong>${temp}°C</strong><span>Temperatura</span></div>
            <div class="smart-summary-item"><strong>${hours}h</strong><span>Horas ligado</span></div>
        </div>`;

    if (attrs.length) {
        html += `<table class="smart-table">
            <thead><tr>
                <th>ID</th><th>Atributo</th><th>Valor</th><th>Pior</th><th>Thresh</th><th>Raw</th>
            </tr></thead><tbody>`;

        for (const a of attrs) {
            const isCritical = critical.has(a.id);
            const rawVal = Number(a.raw?.value ?? 0);
            const isFail = isCritical && rawVal > 0;
            const cls = isFail ? "smart-fail" : (isCritical ? "smart-warn" : "");
            html += `<tr class="${cls}">
                <td>${a.id}</td>
                <td>${a.name}</td>
                <td>${a.value}</td>
                <td>${a.worst}</td>
                <td>${a.thresh}</td>
                <td>${a.raw?.string ?? a.raw?.value ?? "—"}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    } else {
        html += `<p class="empty">Sem atributos ATA disponíveis.</p>`;
    }

    return html;
}