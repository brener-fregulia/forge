import { formatBytes } from "../../../lib/format.js";
import { buildSummary, buildTable } from "../../../lib/anvil/builders.js";

function _healthBadge(passed) {
    if (passed === true)  { const s = document.createElement("span"); s.className = "health-badge health-ok";   s.textContent = "OK";   return s; }
    if (passed === false) { const s = document.createElement("span"); s.className = "health-badge health-fail"; s.textContent = "FAIL"; return s; }
    return "—";
}

export function renderStorageModal(d, isRaid) {
    const el = document.createDocumentFragment();

    el.appendChild(buildSummary([
        { label: "Usado",         value: formatBytes(d.used) },
        { label: "Livre",         value: formatBytes(d.free) },
        { label: "Total",         value: formatBytes(d.total) },
        { label: "Configuração",  value: isRaid ? "RAID1" : "Sem RAID" },
    ]));

    if (isRaid && d.raid_detail) {
        el.appendChild(buildSummary(
            Object.entries(d.raid_detail).map(([k, v]) => ({
                label: k.replace(/_/g, " "),
                value: v,
            }))
        ));
    }

    el.appendChild(buildTable(
        ["Disco", "Modelo", "Serial", "Temp", "Horas", "Saúde"],
        (d.disks || []).map(disk => [
            disk.name || "—",
            disk.model || "—",
            disk.serial || "—",
            disk.temp != null ? `${disk.temp}°C` : "—",
            disk.power_on_hours != null ? `${disk.power_on_hours}h` : "—",
            _healthBadge(disk.passed),
        ]),
        { style: "margin-top:1rem" }
    ));

    return el;
}