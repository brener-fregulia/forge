import { qs, on, addClass, removeClass, setContent, cloneTemplate } from "../lib/anvil/dom.js";

export function renderHardware(hw) {
    if (!hw || !Object.keys(hw).length) return;

    // CPU
    const cpuEl = qs("#hw-cpu");
    if (cpuEl) setContent(cpuEl, hw.cpu || "—");

    // RAM
    const ramEl = qs("#hw-ram");
    if (ramEl) {
        const ramPhysical = (hw.ram_slots || []).reduce((sum, s) => sum + (s.size_mb || 0), 0);
        setContent(ramEl, ramPhysical > 0
            ? `${(ramPhysical / 1024).toFixed(1)} GB`
            : `${(hw.ram_mb / 1024).toFixed(1)} GB`);
    }

    // GPU
    const gpuEl = qs("#hw-gpu");
    if (gpuEl) {
        const gpus = hw.gpu || [];
        setContent(gpuEl, gpus.length
            ? gpus.map(g => g.label || `${g.vendor} ${g.device_id}`).join(", ")
            : "—");
    }

    // Modal RAM
    _initRamModal(hw.ram_slots || []);
}

function _initRamModal(slots) {
    const overlay  = qs("#hw-ram-modal");
    const body     = qs("#hw-ram-modal-body");
    const closeBtn = qs("#hw-ram-modal-close");
    const openBtn  = qs("#hw-ram-btn");
    if (!overlay) return;

    const close = () => removeClass(overlay, "open");
    on(closeBtn,  "click", close);
    on(overlay,   "click", (e) => { if (e.target === overlay) close(); });
    on(document,  "keydown", (e) => { if (e.key === "Escape") close(); });

    on(openBtn, "click", () => {
        body.innerHTML = _renderRamSlots(slots);
        addClass(overlay, "open");
    });
}

function _renderRamSlots(slots) {
    if (!slots.length) return '<p class="empty">Sem informações de módulos.</p>';

    const table = cloneTemplate("ram-slots-table-tpl");
    if (!table) return '';

    const tbody = table.getElementById("ram-slots-tbody");

    for (const s of slots) {
        const row = cloneTemplate("ram-slot-row-tpl");
        if (!row) continue;
        const tr  = row.querySelector("tr");
        if (s.size_mb === 0) tr.style.opacity = "0.4";

        qs(".slot-locator",     tr).textContent = s.locator;
        qs(".slot-bank",        tr).textContent = s.bank;
        qs(".slot-size",        tr).textContent = s.size_mb === 0 ? "vazio" : `${(s.size_mb / 1024).toFixed(1)} GB`;
        qs(".slot-type",        tr).textContent = s.type || "—";
        qs(".slot-speed",       tr).textContent = s.speed_mts ? `${s.speed_mts} MT/s` : "—";
        qs(".slot-width",       tr).textContent = s.width_bits ? `${s.width_bits} bits` : "—";
        qs(".slot-manufacturer",tr).textContent = s.manufacturer || "—";
        qs(".slot-part",        tr).textContent = s.part || "—";

        tbody.appendChild(tr);
    }

    const container = document.createElement("div");
    container.appendChild(table);
    return container.innerHTML;
}