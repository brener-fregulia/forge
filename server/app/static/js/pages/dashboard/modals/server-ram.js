import { formatBytes } from "../../../lib/format.js";

export function renderRamModal(d) {
    const modules = (d.modules || []).map(m => `
        <tr>
            <td>${m.locator || "—"}</td>
            <td>${m.size || "—"}</td>
            <td>${m.type || "—"}</td>
            <td>${m.speed || "—"}</td>
            <td>${m.manufacturer || "—"}</td>
            <td>${m.part_number || "—"}</td>
        </tr>`).join("");
    return `
        <div class="smart-summary">
            <div class="smart-summary-item"><strong>${formatBytes(d.total)}</strong><span>Total</span></div>
            <div class="smart-summary-item"><strong>${formatBytes(d.used)}</strong><span>Em uso</span></div>
            <div class="smart-summary-item"><strong>${formatBytes(d.available)}</strong><span>Disponível</span></div>
            <div class="smart-summary-item"><strong>${d.percent}%</strong><span>Uso</span></div>
            <div class="smart-summary-item"><strong>${d.slots_used} / ${d.slots_total}</strong><span>Slots usados</span></div>
        </div>
        <table class="smart-table">
            <thead><tr><th>Slot</th><th>Tamanho</th><th>Tipo</th><th>Velocidade</th><th>Fabricante</th><th>Modelo</th></tr></thead>
            <tbody>${modules}</tbody>
        </table>`;
}