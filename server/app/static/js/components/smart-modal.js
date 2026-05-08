import { initTabs } from "../lib/tabs.js";

let _smart = {};
let _tabs  = null;

export function initSmartModal() {
    const overlay  = document.getElementById("smart-modal");
    const closeBtn = document.getElementById("smart-modal-close");
    if (!overlay) return;

    closeBtn?.addEventListener("click", () => overlay.classList.remove("open"));
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") overlay.classList.remove("open");
    });
}

export function openSmartModal(disks, smart, initialDisk = null) {
    const overlay = document.getElementById("smart-modal");
    if (!overlay) return;

    _smart = smart || {};

    const physical = (disks || []).filter(d => d.type === "disk");
    if (!physical.length) return;

    _renderTabs(physical, initialDisk || physical[0].name);
    overlay.classList.add("open");
}

function _renderTabs(disks, activeDisk) {
    const header  = document.getElementById("smart-tabs-header");
    const content = document.getElementById("smart-tabs-content");
    const btnTpl  = document.getElementById("smart-tab-btn-tpl");
    const panelTpl = document.getElementById("smart-tab-panel-tpl");
    if (!header || !content || !btnTpl || !panelTpl) return;

    header.innerHTML  = "";
    content.innerHTML = "";

    for (const disk of disks) {
        const btn = btnTpl.content.cloneNode(true).querySelector(".tab-btn");
        btn.textContent  = disk.name;
        btn.dataset.tab  = disk.name;
        if (disk.name === activeDisk) btn.classList.add("active");
        header.appendChild(btn);

        const panel = panelTpl.content.cloneNode(true).querySelector(".tab-panel");
        panel.dataset.tab = disk.name;
        if (disk.name === activeDisk) panel.classList.add("active");
        _renderPanel(panel, disk.name);
        content.appendChild(panel);
    }

    _tabs = initTabs("smart-modal-tabs", {
        clickable: true,
        onChange: (tabId) => {
            const panel = content.querySelector(`.tab-panel[data-tab="${tabId}"]`);
            if (panel && !panel.dataset.rendered) {
                _renderPanel(panel, tabId);
            }
        },
    });

    // Copia JSON
    content.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("btn-copy-smart")) return;
        const tabId = _tabs?.current();
        const data  = _smart?.[tabId];
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

function _renderPanel(panel, diskName) {
    panel.dataset.rendered = "1";
    const s = _smart?.[diskName];

    const summaryContainer = panel.querySelector(".smart-summary");
    const tableContainer   = panel.querySelector(".smart-table-container");

    if (!s) {
        summaryContainer.innerHTML = '<p class="empty">Sem dados SMART para este disco.</p>';
        return;
    }

    _renderSummary(summaryContainer, s);
    _renderTable(tableContainer, s);
}

function _renderSummary(container, s) {
    const tpl    = document.getElementById("smart-summary-tpl");
    const node   = tpl.content.cloneNode(true);
    const passed = s.smart_status?.passed;
    const temp   = s.temperature?.current;
    const hours  = s.power_on_time?.hours;

    const badge = node.querySelector(".smart-status-badge");
    badge.className  = `smart-status-badge health-badge ${passed === true ? "health-ok" : passed === false ? "health-fail" : "health-unknown"}`;
    badge.textContent = passed === true ? "PASSED" : passed === false ? "FAILED" : "UNKNOWN";

    node.querySelector(".smart-temp").textContent  = temp  != null ? `${temp}°C` : "—";
    node.querySelector(".smart-hours").textContent = hours != null ? `${hours}h`  : "—";

    container.innerHTML = "";
    container.appendChild(node);
}

function _renderTable(container, s) {
    const attrs    = s.ata_smart_attributes?.table || [];
    const critical = new Set([5, 10, 184, 187, 188, 196, 197, 198, 201]);

    if (!attrs.length) {
        container.innerHTML = '<p class="empty">Sem atributos ATA disponíveis.</p>';
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

    for (const a of [...criticalAttrs, ...normalAttrs]) {
        if (!critical.has(a.id) && criticalAttrs.length) {
            const idx = [...criticalAttrs, ...normalAttrs].indexOf(a);
            if (idx === criticalAttrs.length) {
                const sep = document.createElement("tr");
                sep.innerHTML = `<td colspan="6" class="smart-separator">Outros atributos</td>`;
                tbody.appendChild(sep);
            }
        }

        const rawVal = Number(a.raw?.value ?? 0);
        const isCrit = critical.has(a.id);
        const isFail = isCrit && rawVal > 0;

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

    container.innerHTML = "";
    container.appendChild(table);
}