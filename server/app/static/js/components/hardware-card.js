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
            ? `${(ramPhysical / 1024).toFixed(1)} GB físico / ${(hw.ram_mb / 1024).toFixed(1)} GB disponível`
            : `${(hw.ram_mb / 1024).toFixed(1)} GB`;
    }

    // GPU
    const gpuEl = document.getElementById("hw-gpu");
    if (gpuEl) {
        const gpus = hw.gpu || [];
        gpuEl.textContent = gpus.length
            ? gpus.map(g => `${g.vendor} — ${g.label || g.device_id}`).join(", ")
            : "—";
    }

    // Slots de RAM
    const slotsSection = document.getElementById("hw-ram-slots-section");
    const slotsContainer = document.getElementById("hw-ram-slots");
    if (slotsSection && slotsContainer && hw.ram_slots?.length) {
        slotsContainer.innerHTML = hw.ram_slots.map(s => `
            <div class="hw-item">
                <span class="hw-label">${s.locator}</span>
                <span class="hw-value">${s.size_mb > 0 ? (s.size_mb / 1024).toFixed(1) + " GB" : "vazio"} — ${s.bank}</span>
            </div>`).join("");
        slotsSection.style.display = "block";
    }
}