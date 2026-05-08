import { formatBytes } from "../lib/format.js";

export function tryInitialRender() {
    const raw = document.getElementById("disks")?.textContent?.trim();
    if (raw && raw !== "[]" && raw !== "null") {
        try {
            const disks = JSON.parse(raw);
            if (disks?.length) renderDisks(disks, {}, []);
        } catch {}
    }
}

function _driveLabel(name, driveLetters, disks, isDisk) {
    if (!driveLetters?.length) return null;

    if (isDisk) {
        // Disco físico: busca letras das partições filhas
        const children = (disks || [])
            .filter(d => d.type === "part" && d.name.startsWith(name))
            .map(d => (driveLetters || []).find(dl => dl.device === d.name))
            .filter(Boolean);
        if (!children.length) return null;
        const letters = children.map(e => {
            const label = e.label || (e.letter === "C" ? "Windows" : "Dados");
            return `${e.letter}: — ${label}`;
        });
        return `(${letters.join(", ")})`;
    }

    const entry = (driveLetters || []).find(d => d.device === name);
    if (!entry) return null;
    return `(${entry.letter}:)`;
}

export function renderDisks(disks, smart, driveLetters) {
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
        const nameEl = tr.querySelector(".disk-name");
        const dlabel = _driveLabel(d.name, driveLetters, disks, !isPart);
        nameEl.textContent = d.name;
        if (dlabel) {
            const span = document.createElement("span");
            span.className = "disk-drive-label";
            span.textContent = " " + dlabel;
            nameEl.appendChild(span);
        }

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
        const healthEl    = tr.querySelector(".disk-health");
        const smartBtn    = tr.querySelector(".disk-smart-btn");
        if (smartBtn) smartBtn.dataset.disk = d.name;

        if (isPart) {
            healthEl.textContent = "—";
        } else if (smart && smart[d.name] !== undefined) {
            const s      = smart[d.name];
            const passed = s.smart_status?.passed;
            const temp   = s.temperature?.current;
            const badge  = document.createElement("span");
            badge.className = passed === true ? "health-badge health-ok"
                : passed === false ? "health-badge health-fail"
                : "health-badge health-unknown";
            badge.textContent = passed === true ? "OK" : passed === false ? "FAIL" : "?";
            healthEl.prepend(badge);
            if (temp != null) {
                const tempEl = document.createElement("span");
                tempEl.className = "health-temp";
                tempEl.textContent = `${temp}°C`;
                badge.after(tempEl);
            }
        } else {
            const loading = document.createElement("span");
            loading.className = "loading";
            loading.innerHTML = '<span class="spinner"></span>';
            healthEl.prepend(loading);
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

    document.getElementById("disks-rendered")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".disk-smart-btn");
        if (!btn) return;
        e.preventDefault();
        const disk = btn.dataset.disk;
        const data = smart?.[disk];
        title.textContent = `SMART — /dev/${disk}`;
        renderSmartBody(data);
        if (!data) document.getElementById("smart-table-container").innerHTML = '<p class="empty">Sem dados SMART para este disco.</p>';
        overlay.classList.add("open");
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
    const passed   = s.smart_status?.passed;
    const temp     = s.temperature?.current;
    const hours    = s.power_on_time?.hours;
    const attrs    = s.ata_smart_attributes?.table || [];
    const critical = new Set([5, 10, 184, 187, 188, 196, 197, 198, 201]);

    const summaryTpl = document.getElementById("smart-summary-tpl");
    const summary    = summaryTpl.content.cloneNode(true);
    const badge      = summary.querySelector(".smart-status-badge");
    badge.className  = `smart-status-badge health-badge ${passed === true ? "health-ok" : passed === false ? "health-fail" : "health-unknown"}`;
    badge.textContent = passed === true ? "PASSED" : passed === false ? "FAILED" : "UNKNOWN";
    summary.querySelector(".smart-temp").textContent  = temp != null ? `${temp}°C` : "—";
    summary.querySelector(".smart-hours").textContent = hours != null ? `${hours}h` : "—";

    document.getElementById("smart-summary").innerHTML = "";
    document.getElementById("smart-summary").appendChild(summary);

    const tableContainer = document.getElementById("smart-table-container");
    tableContainer.innerHTML = "";

    if (!attrs.length) {
        tableContainer.innerHTML = '<p class="empty">Sem atributos ATA disponíveis.</p>';
        return;
    }

    const tableTpl = document.getElementById("smart-table-tpl");
    const rowTpl   = document.getElementById("smart-row-tpl");
    const table    = tableTpl.content.cloneNode(true);
    const tbody    = table.getElementById("smart-tbody");

    const criticalAttrs = attrs.filter(a => critical.has(a.id));
    const normalAttrs   = attrs.filter(a => !critical.has(a.id));

    if (criticalAttrs.length) {
        const sep = document.createElement("tr");
        sep.innerHTML = `<td colspan="6" class="smart-separator">Atributos críticos</td>`;
        tbody.appendChild(sep);
    }

    let firstNormal = true;
    for (const a of [...criticalAttrs, ...normalAttrs]) {
        const rawVal  = Number(a.raw?.value ?? 0);
        const isCrit  = critical.has(a.id);
        const isFail  = isCrit && rawVal > 0;
        const isWarn  = isCrit && rawVal === 0 ? false : isCrit;

        if (!isCrit && firstNormal && criticalAttrs.length) {
            firstNormal = false;
            const sep = document.createElement("tr");
            sep.innerHTML = `<td colspan="6" class="smart-separator">Outros atributos</td>`;
            tbody.appendChild(sep);
        }

        const row = rowTpl.content.cloneNode(true);
        const tr  = row.querySelector("tr");

        tr.className = isFail ? "smart-fail" : (isCrit && rawVal > 0) ? "smart-warn" : "";
        tr.querySelector(".smart-col-id").textContent     = a.id;
        tr.querySelector(".smart-col-name").textContent   = a.name;
        tr.querySelector(".smart-col-value").textContent  = a.value;
        tr.querySelector(".smart-col-worst").textContent  = a.worst;
        tr.querySelector(".smart-col-thresh").textContent = a.thresh;
        tr.querySelector(".smart-col-raw").textContent    = a.raw?.string ?? a.raw?.value ?? "—";

        tbody.appendChild(tr);
    }

    tableContainer.appendChild(table);
}