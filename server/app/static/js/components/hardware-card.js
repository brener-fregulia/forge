export function renderHardware(hw) {
    if (!hw || !Object.keys(hw).length) return;

    // CPU
    const cpuEl = document.getElementById("hw-cpu");
    if (cpuEl) cpuEl.textContent = hw.cpu || "—";

    // RAM
    const ramEl = document.getElementById("hw-ram");
    if (ramEl) {
        const ramPhysical = (hw.ram_slots || []).reduce((sum, s) => sum + (s.size_mb || 0), 0);
        ramEl.textContent = ramPhysical > 0
            ? `${(ramPhysical / 1024).toFixed(1)} GB`
            : `${(hw.ram_mb / 1024).toFixed(1)} GB`;
    }

    // GPU
    const gpuEl = document.getElementById("hw-gpu");
    if (gpuEl) {
        const gpus = hw.gpu || [];
        gpuEl.textContent = gpus.length
            ? gpus.map(g => g.label || `${g.vendor} ${g.device_id}`).join(", ")
            : "—";
    }

    // Modal RAM
    initRamModal(hw.ram_slots || []);
}

function initRamModal(slots) {
    const overlay  = document.getElementById("hw-ram-modal");
    const body     = document.getElementById("hw-ram-modal-body");
    const closeBtn = document.getElementById("hw-ram-modal-close");
    const openBtn  = document.getElementById("hw-ram-btn");
    if (!overlay) return;

    const close = () => overlay.classList.remove("open");
    closeBtn?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    openBtn?.addEventListener("click", () => {
        body.innerHTML = renderRamSlots(slots);
        overlay.classList.add("open");
    });
}

function renderRamSlots(slots) {
    if (!slots.length) return '<p class="empty">Sem informações de módulos.</p>';

    const tableTpl = document.getElementById("ram-slots-table-tpl");
    const rowTpl   = document.getElementById("ram-slot-row-tpl");
    if (!tableTpl || !rowTpl) return '';

    const table = tableTpl.content.cloneNode(true);
    const tbody = table.getElementById("ram-slots-tbody");

    for (const s of slots) {
        const empty = s.size_mb === 0;
        const row   = rowTpl.content.cloneNode(true);
        const tr    = row.querySelector("tr");
        if (empty) tr.style.opacity = "0.4";

        tr.querySelector(".slot-locator").textContent      = s.locator;
        tr.querySelector(".slot-bank").textContent         = s.bank;
        tr.querySelector(".slot-size").textContent         = empty ? "vazio" : `${(s.size_mb / 1024).toFixed(1)} GB`;
        tr.querySelector(".slot-type").textContent         = s.type || "—";
        tr.querySelector(".slot-speed").textContent        = s.speed_mts ? `${s.speed_mts} MT/s` : "—";
        tr.querySelector(".slot-width").textContent        = s.width_bits ? `${s.width_bits} bits` : "—";
        tr.querySelector(".slot-manufacturer").textContent = s.manufacturer || "—";
        tr.querySelector(".slot-part").textContent         = s.part || "—";

        tbody.appendChild(tr);
    }

    const container = document.createElement("div");
    container.appendChild(table);
    return container.innerHTML;
}