import { qs, qsa, on, addClass, removeClass, toggleClass, setContent, cloneTemplate } from "../lib/anvil/dom.js";
import { formatBytes } from "../lib/format.js";

let _smart  = {};
let _disks  = [];
let _active = null;

const CRIT_RED    = new Set([5, 10, 196, 197, 198]);
const CRIT_YELLOW = new Set([184, 187, 188, 201]);

export function initSmartModal() {
    const overlay  = qs("#smart-modal");
    const closeBtn = qs("#smart-modal-close");
    if (!overlay) return;

    on(closeBtn, "click",    () => removeClass(overlay, "open"));
    on(overlay,  "click",    (e) => { if (e.target === overlay) removeClass(overlay, "open"); });
    on(document, "keydown",  (e) => { if (e.key === "Escape") removeClass(overlay, "open"); });
}

export function openSmartModal(disks, smart, initialDisk = null) {
    const overlay = qs("#smart-modal");
    if (!overlay) return;

    _smart  = smart  || {};
    _disks  = (disks || []).filter(d => d.type === "disk");
    _active = initialDisk || _disks[0]?.name || null;

    if (!_disks.length) return;

    _renderTabs();
    addClass(overlay, "open");
}

function _renderTabs() {
    const header  = qs("#smart-tabs-header");
    const content = qs("#smart-tabs-content");
    if (!header || !content) return;

    header.innerHTML  = "";
    content.innerHTML = "";

    for (const disk of _disks) {
        const btn = cloneTemplate("smart-tab-btn-tpl")?.querySelector(".tab-btn");
        if (!btn) continue;
        setContent(btn, disk.name);
        btn.dataset.tab = disk.name;
        toggleClass(btn, "active", disk.name === _active);
        on(btn, "click", () => _switchTab(disk.name));
        header.appendChild(btn);

        const panel = _buildPanel(disk);
        panel.dataset.tab = disk.name;
        if (disk.name !== _active) removeClass(panel, "active");
        content.appendChild(panel);
    }
}

function _switchTab(diskName) {
    _active = diskName;
    qsa(".tab-btn",   qs("#smart-tabs-header"))
        .forEach(b => toggleClass(b, "active", b.dataset.tab === diskName));
    qsa(".tab-panel", qs("#smart-tabs-content"))
        .forEach(p => toggleClass(p, "active", p.dataset.tab === diskName));
}

function _buildPanel(disk) {
    const frag  = cloneTemplate("smart-panel-tpl");
    const panel = frag.querySelector(".smart-panel");
    const s     = _smart?.[disk.name] || {};

    addClass(panel, "tab-panel", "active");

    _renderHealthBlock(qs(".smart-health-block", panel), s);
    _renderInfoGrid(qs(".smart-info-grid", panel), disk, s);
    _renderTable(qs(".smart-panel-table", panel), s);

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
    const attrs   = s.ata_smart_attributes?.table || [];
    const hasFail = attrs.some(a => CRIT_RED.has(a.id)    && Number(a.raw?.value ?? 0) > 0);
    const hasWarn = attrs.some(a => CRIT_YELLOW.has(a.id) && Number(a.raw?.value ?? 0) > 0);
    if (hasFail) return { pct: null, label: "Crítico" };
    if (hasWarn) return { pct: null, label: "Atenção" };
    return { pct: null, label: "Saudável" };
}

function _renderHealthBlock(el, s) {
    const health   = _calcHealth(s);
    const passed   = s.smart_status?.passed;
    const temp     = s.temperature?.current;
    const statusEl = qs(".smart-health-status", el);
    const pctEl    = qs(".smart-health-pct",    el);
    const tempEl   = qs(".smart-health-temp",   el);

    const cls = health.label === "Saudável" ? "health-ok"
              : health.label === "Atenção"  ? "health-warn" : "health-fail";

    setContent(statusEl, passed === false ? "Falha" : health.label);
    statusEl.className = `smart-health-status ${cls}`;
    setContent(pctEl,   health.pct != null ? `${health.pct}%` : "—");
    setContent(tempEl,  temp != null ? `${temp} °C` : "—");
}

function _renderInfoGrid(el, disk, s) {
    const type = _detectType(s);
    const rows = [];

    rows.push(["Modelo",        s.model_name || disk.model || "—"]);
    rows.push(["Número Serial", s.serial_number || "—"]);
    rows.push(["Firmware",      s.firmware_version || "—"]);
    rows.push(["Capacidade",    s.user_capacity?.bytes ? formatBytes(s.user_capacity.bytes) : "—"]);
    rows.push(["Horas ligado",  s.power_on_time?.hours != null ? `${s.power_on_time.hours} horas` : "—"]);
    rows.push(["Vezes ligado",  s.power_cycle_count != null ? `${s.power_cycle_count} vezes` : "—"]);

    if (type === "nvme") {
        rows.push(["Interface",  s.device?.protocol || "NVMe"]);
        rows.push(["Padrão",     s.nvme_version?.string || "—"]);
        const pciSpeed = s.pcie_link_speed?.current?.string;
        if (pciSpeed) rows.push(["Velocidade", pciSpeed]);
    } else {
        const iface = [s.sata_version?.string, s.interface_speed?.current?.string]
            .filter(Boolean).join(" — ");
        rows.push(["Interface",     iface || "SATA"]);
        rows.push(["Form Factor",   s.form_factor?.name || "—"]);
        rows.push(["Rotation Rate", s.rotation_rate === 0 ? "— (SSD)" : s.rotation_rate ? `${s.rotation_rate} RPM` : "—"]);
        if (s.trim?.supported != null)
            rows.push(["TRIM", s.trim.supported ? "Suportado" : "Não suportado"]);
    }

    for (const [label, value] of rows) {
        const row = cloneTemplate("smart-info-row-tpl");
        if (!row) continue;
        setContent(qs(".smart-info-label", row), label);
        setContent(qs(".smart-info-value", row), value);
        el.appendChild(row);
    }
}

function _renderTable(el, s) {
    const type = _detectType(s);
    const table = cloneTemplate("smart-table-tpl");
    if (!table) return;
    const tbody = table.querySelector("tbody");

    if (type === "nvme") {
        const log = s.nvme_smart_health_information_log || {};
        const nvmeAttrs = [
            ["Critical Warning",       log.critical_warning],
            ["Available Spare",        log.available_spare        != null ? `${log.available_spare}%`           : null],
            ["Available Spare Thresh", log.available_spare_threshold != null ? `${log.available_spare_threshold}%` : null],
            ["Percentage Used",        log.percentage_used        != null ? `${log.percentage_used}%`           : null],
            ["Data Units Read",        log.data_units_read],
            ["Data Units Written",     log.data_units_written],
            ["Host Read Commands",     log.host_read_commands],
            ["Host Write Commands",    log.host_write_commands],
            ["Controller Busy Time",   log.controller_busy_time],
            ["Power Cycles",           log.power_cycles],
            ["Power On Hours",         log.power_on_hours],
            ["Unsafe Shutdowns",       log.unsafe_shutdowns],
            ["Media Errors",           log.media_errors],
            ["Num Error Log Entries",  log.num_err_log_entries],
        ];

        for (const [name, val] of nvmeAttrs) {
            if (val == null) continue;
            const row  = cloneTemplate("smart-row-tpl");
            if (!row) continue;
            const tr   = row.querySelector("tr");
            const dot  = qs(".smart-dot", tr);
            const isCrit = name === "Critical Warning" && Number(val) > 0;
            const isWarn = name === "Media Errors"     && Number(val) > 0;
            dot.className = `smart-dot ${isCrit ? "dot-fail" : isWarn ? "dot-warn" : "dot-ok"}`;
            setContent(qs(".smart-col-id",   tr), "—");
            setContent(qs(".smart-col-name", tr), name);
            setContent(qs(".smart-col-raw",  tr), String(val));
            tbody.appendChild(tr);
        }
    } else {
        const attrs = s.ata_smart_attributes?.table || [];
        for (const a of attrs) {
            const rawVal = Number(a.raw?.value ?? 0);
            const isFail = CRIT_RED.has(a.id)    && rawVal > 0;
            const isWarn = CRIT_YELLOW.has(a.id) && rawVal > 0;
            const row    = cloneTemplate("smart-row-tpl");
            if (!row) continue;
            const tr  = row.querySelector("tr");
            const dot = qs(".smart-dot", tr);
            dot.className = `smart-dot ${isFail ? "dot-fail" : isWarn ? "dot-warn" : "dot-ok"}`;
            setContent(qs(".smart-col-id",   tr), String(a.id).padStart(3, "0"));
            setContent(qs(".smart-col-name", tr), a.name);
            setContent(qs(".smart-col-raw",  tr), a.raw?.string ?? String(rawVal));
            tbody.appendChild(tr);
        }
    }

    el.innerHTML = "";
    el.appendChild(table);
}