export function renderHardware(hw) {
    const container = document.getElementById("hw-rendered");
    if (!container || !hw || !Object.keys(hw).length) return;

    const gpus = (hw.gpu || []).map(g => `
        <div class="hw-item">
            <span class="hw-label">GPU</span>
            <span class="hw-value">${g.vendor} — ${g.label || g.device_id}</span>
        </div>`).join("");

    const ramSlots = (hw.ram_slots || []).map(s => `
        <div class="hw-item">
            <span class="hw-label">${s.locator}</span>
            <span class="hw-value">${s.size_mb > 0 ? s.size_mb + " MB" : "vazio"} — ${s.bank}</span>
        </div>`).join("");

    container.innerHTML = `
        <div class="hw-card">
            <div class="hw-section">
                <div class="hw-item">
                    <span class="hw-label">CPU</span>
                    <span class="hw-value">${hw.cpu || "—"}</span>
                </div>
                <div class="hw-item">
                    <span class="hw-label">RAM Total</span>
                    <span class="hw-value">${hw.ram_mb ? (hw.ram_mb / 1024).toFixed(1) + " GB" : "—"}</span>
                </div>
                ${gpus}
            </div>
            ${ramSlots ? `<div class="hw-section"><div class="hw-section-title">Módulos de RAM</div>${ramSlots}</div>` : ""}
        </div>`;
}