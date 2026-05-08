import { formatBytes } from "../lib/format.js";

let _smart  = {};
let _disks  = [];
let _active = null;

const CRIT_RED    = new Set([5, 10, 196, 197, 198]);
const CRIT_YELLOW = new Set([184, 187, 188, 201]);

export function initSmartModal() {
    const overlay  = document.getElementById("smart-modal");
    const closeBtn = document.getElementById("smart-modal-close");
    if (!overlay) return;

    closeBtn?.addEventListener("click",  () => overlay.classList.remove("open"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") overlay.classList.remove("open"); });
}

export function openSmartModal(disks, smart, initialDisk = null) {
    const overlay = document.getElementById("smart-modal");
    if (!overlay) return;

    _smart  = smart  || {};
    _disks  = (disks || []).filter(d => d.type === "disk");
    _active = initialDisk || _disks[0]?.name || null;

    if (!_disks.length) return;

    _renderTabs();
    overlay.classList.add("open");
}

function _renderTabs() {
    const header  = document.getElementById("smart-tabs-header");
    const content = document.getElementById("smart-tabs-content");
    const btnTpl  = document.getElementById("smart-tab-btn-tpl");
    if (!header || !content || !btnTpl) return;

    header.innerHTML  = "";
    content.innerHTML = "";

    for (const disk of _disks) {
        const btn = btnTpl.content.cloneNode(true).querySelector(".tab-btn");
        btn.textContent = disk.name;
        btn.dataset.tab = disk.name;
        if (disk.name === _active) btn.classList.add("active");
        btn.addEventListener("click", () => _switchTab(disk.name));
        header.appendChild(btn);

        const panel = _buildPanel(disk);
        panel.dataset.tab = disk.name;
        if (disk.name !== _active) panel.classList.remove("active");
        content.appendChild(panel);
    }
}

function _switchTab(diskName) {
    _active = diskName;
    document.getElementById("smart-tabs-header")
        ?.querySelectorAll(".tab-btn")
        .forEach(b => b.classList.toggle("active", b.dataset.tab === diskName));
    document.getElementById("smart-tabs-content")
        ?.querySelectorAll(".tab-panel")
        .forEach(p => p.classList.toggle("active", p.dataset.tab === diskName));
}

function _buildPanel(disk) {
    const tpl   = document.getElementById("smart-panel-tpl");
    const panel = tpl.content.cloneNode(true).querySelector(".smart-panel");
    const s     = _smart?.[disk.name] || {};

    panel.classList.add("tab-panel", "active");

    _renderHealthBlock(panel.querySelector(".smart-health-block"), s);
    _renderInfoGrid(panel.querySelector(".smart-info-grid"), disk, s);
    _renderTable(panel.querySelector(".smart-panel-table"), s);

    return panel;
}

function _detectType(s) {
    if (s.nvme_smart_health_information_log) return "nvme";
    if (s.rotation_rate === 0) return "ssd";
    return "hdd";
}

function _calcHealth(s) {
    const type = _detectType(s);
    if (type === "nvme") {
        const used = s.nvme_smart_health_information_log?.percentage_used ?? 0;
        return { pct: 100 - used, label: used > 90 ? "Crítico" : used > 50 ? "Atenção" : "Saudável" };
    }
    if (type === "ssd" && s.spare_available?.current_percent != null) {
        const spare = s.spare_available.current_percent;
        return { pct: spare, label: spare < 10 ? "Crítico" : spare < 30 ? "Atenção" : "Saudável" };
    }
    const attrs = s.ata_smart_attributes?.table || [];
    const hasFail = attrs.some(a => CRIT_RED.has(a.id) && Number(a.raw?.value ?? 0) > 0);
    const hasWarn = attrs.some(a => CRIT_YELLOW.has(a.id) && Number(a.raw?.value ?? 0) > 0);
    if (hasFail) return { pct: null, label: "Crítico" };
    if (hasWarn) return { pct: null, label: "Atenção" };
    return { pct: null, label: "Saudável" };
}

function _renderHealthBlock(el, s) {
    const health  = _calcHealth(s);
    const passed  = s.smart_status?.passed;
    const temp    = s.temperature?.current;

    const statusEl = el.querySelector(".smart-health-status");
    const pctEl    = el.querySelector(".smart-health-pct");
    const tempEl   = el.querySelector(".smart-health-temp");

    const cls = health.label === "Saudável" ? "health-ok"
        : health.label === "Atenção" ? "health-warn" : "health-fail";

    statusEl.textContent = passed === false ? "Falha" : health.label;
    statusEl.className   = `smart-health-status ${cls}`;
    pctEl.textContent    = health.pct != null ? `${health.pct}%` : "—";
    tempEl.textContent   = temp != null ? `${temp} °C` : "—";
}

function _renderInfoGrid(el, disk, s) {
    const type = _detectType(s);
    const rowTpl = document.getElementById("smart-info-row-tpl");

    const rows = [];

    // Comuns
    rows.push(["Modelo",       s.model_name || disk.model || "—"]);
    rows.push(["Número Serial", s.serial_number || "—"]);
    rows.push(["Firmware",     s.firmware_version || "—"]);
    rows.push(["Capacidade",   s.user_capacity?.bytes ? formatBytes(s.user_capacity.bytes) : "—"]);
    rows.push(["Horas ligado", s.power_on_time?.hours != null ? `${s.power_on_time.hours} horas` : "—"]);
    rows.push(["Vezes ligado", s.power_cycle_count != null ? `${s.power_cycle_count} vezes` : "—"]);

    if (type === "nvme") {
        rows.push(["Interface",    s.device?.protocol || "NVMe"]);
        rows.push(["Padrão",       s.nvme_version?.string || "—"]);
        const pciSpeed = s.pcie_link_speed?.current?.string;
        if (pciSpeed) rows.push(["Velocidade", pciSpeed]);
    } else {
        const iface = [s.sata_version?.string, s.interface_speed?.current?.string]
            .filter(Boolean).join(" — ");
        rows.push(["Interface",    iface || "SATA"]);
        rows.push(["Form Factor",  s.form_factor?.name || "—"]);
        rows.push(["Rotation Rate", s.rotation_rate === 0 ? "— (SSD)" : s.rotation_rate ? `${s.rotation_rate} RPM` : "—"]);
        if (s.trim?.supported != null)
            rows.push(["TRIM", s.trim.supported ? "Suportado" : "Não suportado"]);
    }

    for (const [label, value] of rows) {
        const row = rowTpl.content.cloneNode(true);
        row.querySelector(".smart-info-label").textContent = label;
        row.querySelector(".smart-info-value").textContent = value;
        el.appendChild(row);
    }
}

function _renderTable(el, s) {
    const type    = _detectType(s);
    const tableTpl = document.getElementById("smart-table-tpl");
    const rowTpl   = document.getElementById("smart-row-tpl");
    if (!tableTpl || !rowTpl) return;

    const table = tableTpl.content.cloneNode(true);
    const tbody = table.querySelector("tbody");

    if (type === "nvme") {
        const log = s.nvme_smart_health_information_log || {};
        const nvmeAttrs = [
            ["Critical Warning",        log.critical_warning],
            ["Available Spare",         log.available_spare != null ? `${log.available_spare}%` : null],
            ["Available Spare Thresh",  log.available_spare_threshold != null ? `${log.available_spare_threshold}%` : null],
            ["Percentage Used",         log.percentage_used != null ? `${log.percentage_used}%` : null],
            ["Data Units Read",         log.data_units_read],
            ["Data Units Written",      log.data_units_written],
            ["Host Read Commands",      log.host_read_commands],
            ["Host Write Commands",     log.host_write_commands],
            ["Controller Busy Time",    log.controller_busy_time],
            ["Power Cycles",            log.power_cycles],
            ["Power On Hours",          log.power_on_hours],
            ["Unsafe Shutdowns",        log.unsafe_shutdowns],
            ["Media Errors",            log.media_errors],
            ["Num Error Log Entries",   log.num_err_log_entries],
        ];

        for (const [name, val] of nvmeAttrs) {
            if (val == null) continue;
            const row  = rowTpl.content.cloneNode(true);
            const tr   = row.querySelector("tr");
            const dot  = tr.querySelector(".smart-dot");
            const isCrit = name === "Critical Warning" && Number(val) > 0;
            const isWarn = name === "Media Errors" && Number(val) > 0;
            dot.className = `smart-dot ${isCrit ? "dot-fail" : isWarn ? "dot-warn" : "dot-ok"}`;
            tr.querySelector(".smart-col-id").textContent   = "—";
            tr.querySelector(".smart-col-name").textContent = name;
            tr.querySelector(".smart-col-raw").textContent  = String(val);
            tbody.appendChild(tr);
        }
    } else {
        const attrs = s.ata_smart_attributes?.table || [];
        for (const a of attrs) {
            const rawVal  = Number(a.raw?.value ?? 0);
            const isFail  = CRIT_RED.has(a.id)    && rawVal > 0;
            const isWarn  = CRIT_YELLOW.has(a.id) && rawVal > 0;
            const row     = rowTpl.content.cloneNode(true);
            const tr      = row.querySelector("tr");
            const dot     = tr.querySelector(".smart-dot");

            dot.className = `smart-dot ${isFail ? "dot-fail" : isWarn ? "dot-warn" : "dot-ok"}`;
            tr.querySelector(".smart-col-id").textContent   = String(a.id).padStart(3, "0");
            tr.querySelector(".smart-col-name").textContent = a.name;
            tr.querySelector(".smart-col-raw").textContent  = a.raw?.string ?? String(rawVal);
            tbody.appendChild(tr);
        }
    }

    el.innerHTML = "";
    el.appendChild(table);
}