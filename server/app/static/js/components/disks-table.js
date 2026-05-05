import { formatBytes } from "../lib/format.js";

export function tryInitialRender() {
    const raw = document.getElementById("disks")?.textContent?.trim();
    if (raw && raw !== "[]" && raw !== "null") {
        try {
            const disks = JSON.parse(raw);
            if (disks?.length) renderDisks(disks, {});
        } catch {}
    }
}

export function renderDisks(disks, smart) {
    const container = document.getElementById("disks-rendered");
    if (!container || !disks?.length) return;

    const tableTpl  = document.getElementById("disks-table-tpl");
    const mainTpl   = document.getElementById("disk-row-main-tpl");
    const partTpl   = document.getElementById("disk-row-part-tpl");
    if (!tableTpl || !mainTpl || !partTpl) return;

    const table = tableTpl.content.cloneNode(true);
    const tbody = table.getElementById("disks-tbody");

    for (const d of disks) {
        const isPart = d.type === "part";
        const tpl    = isPart ? partTpl : mainTpl;
        const row    = tpl.content.cloneNode(true);
        const tr     = row.querySelector("tr");

        // Nome
        tr.querySelector(".disk-name").textContent = d.name;

        // Botão SMART (só discos físicos)
        const smartBtn = tr.querySelector(".disk-smart-btn");
        if (smartBtn) smartBtn.dataset.disk = d.name;

        // Modelo + Serial
        tr.querySelector(".disk-model").textContent = [d.vendor, d.model].filter(Boolean).join(" ") || "—";
        const serialEl = tr.querySelector(".disk-serial");
        if (d.serial) {
            serialEl.className = "disk-serial";
            serialEl.innerHTML = `<code>${d.serial}</code>`;
        }

        // Tamanho
        tr.querySelector(".disk-size").textContent = d.size ? formatBytes(d.size) : "—";

        // Filesystem badge
        const fstypeEl = tr.querySelector(".disk-fstype");
        if (d.fstype) {
            const isNtfs = d.fstype.toLowerCase() === "ntfs";
            fstypeEl.innerHTML = `<span class="fs-badge ${isNtfs ? 'fs-ntfs' : 'fs-other'}">${d.fstype}</span>`;
        } else {
            fstypeEl.textContent = "—";
        }

        // Saúde
        const healthEl = tr.querySelector(".disk-health");
        if (isPart) {
            healthEl.textContent = "—";
        } else if (smart && smart[d.name] !== undefined) {
            const s = smart[d.name];
            const passed = s.smart_status?.passed;
            const temp   = s.temperature?.current;
            let html = passed === true
                ? '<span class="health-badge health-ok">OK</span>'
                : passed === false
                    ? '<span class="health-badge health-fail">FAIL</span>'
                    : '<span class="health-badge health-unknown">?</span>';
            if (temp != null) html += ` <span class="health-temp">${temp}°C</span>`;
            healthEl.innerHTML = html;
        } else {
            healthEl.innerHTML = '<span class="loading"><span class="spinner"></span></span>';
        }

        tbody.appendChild(tr);
    }

    container.innerHTML = "";
    container.appendChild(table);
}

export function initSmartModal(smart) {
    const overlay  = document.getElementById("smart-modal");
    const title    = document.getElementById("smart-modal-title");
    const body     = document.getElementById("smart-modal-body");
    const close    = document.getElementById("smart-modal-close");
    if (!overlay) return;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    close?.addEventListener("click", () => overlay.classList.remove("open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") overlay.classList.remove("open"); });

    document.querySelectorAll(".disk-smart-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const disk = btn.dataset.disk;
            const data = smart?.[disk];
            title.textContent = `SMART — /dev/${disk}`;
            body.innerHTML = data ? renderSmartBody(data) : '<p class="empty">Sem dados SMART para este disco.</p>';
            overlay.classList.add("open");
        });
    });

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
}

function renderSmartBody(s) {
    const passed = s.smart_status?.passed;
    const temp   = s.temperature?.current ?? "—";
    const hours  = s.power_on_time?.hours ?? "—";
    const attrs  = s.ata_smart_attributes?.table || [];
    const critical = new Set([5, 10, 184, 187, 188, 196, 197, 198, 201]);

    const statusBadge = passed === true
        ? '<span class="health-badge health-ok">PASSED</span>'
        : passed === false
            ? '<span class="health-badge health-fail">FAILED</span>'
            : '<span class="health-badge health-unknown">UNKNOWN</span>';

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
            const cls = isFail ? "smart-fail" : isCritical ? "smart-warn" : "";
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