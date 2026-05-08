import { formatBytes } from "../../../lib/format.js";

export function renderStorageModal(d, isRaid) {
    const disks = (d.disks || []).map(disk => `
        <tr>
            <td><code>${disk.name || "—"}</code></td>
            <td>${disk.model || "—"}</td>
            <td>${disk.serial || "—"}</td>
            <td>${disk.temp != null ? disk.temp + "°C" : "—"}</td>
            <td>${disk.power_on_hours != null ? disk.power_on_hours + "h" : "—"}</td>
            <td>${disk.passed === true
                ? '<span class="health-badge health-ok">OK</span>'
                : disk.passed === false
                    ? '<span class="health-badge health-fail">FAIL</span>'
                    : "—"}</td>
        </tr>`).join("");

    const raidInfo = isRaid && d.raid_detail ? `
        <div class="info-summary" style="margin-top:1rem">
            ${Object.entries(d.raid_detail).map(([k, v]) =>
                `<div class="info-summary-item"><strong>${v}</strong><span>${k.replace(/_/g, " ")}</span></div>`
            ).join("")}
        </div>` : "";

    return `
        <div class="info-summary">
            <div class="info-summary-item"><strong>${formatBytes(d.used)}</strong><span>Usado</span></div>
            <div class="info-summary-item"><strong>${formatBytes(d.free)}</strong><span>Livre</span></div>
            <div class="info-summary-item"><strong>${formatBytes(d.total)}</strong><span>Total</span></div>
            <div class="info-summary-item"><strong>${isRaid ? "RAID1" : "Sem RAID"}</strong><span>Configuração</span></div>
        </div>
        ${raidInfo}
        <table class="forge-table" style="margin-top:1rem">
            <thead><tr><th>Disco</th><th>Modelo</th><th>Serial</th><th>Temp</th><th>Horas</th><th>Saúde</th></tr></thead>
            <tbody>${disks}</tbody>
        </table>`;
}