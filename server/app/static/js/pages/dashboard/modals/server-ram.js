import { formatBytes } from "../../../lib/format.js";
import { buildSummary, buildTable } from "../../../lib/anvil/builders.js";

export function renderRamModal(d) {
    const el = document.createDocumentFragment();
    el.appendChild(buildSummary([
        { label: "Total",        value: formatBytes(d.total) },
        { label: "Em uso",       value: formatBytes(d.used) },
        { label: "Disponível",   value: formatBytes(d.available) },
        { label: "Uso",          value: `${d.percent}%` },
        { label: "Slots usados", value: `${d.slots_used} / ${d.slots_total}` },
    ]));
    el.appendChild(buildTable(
        ["Slot", "Tamanho", "Tipo", "Velocidade", "Fabricante", "Modelo"],
        (d.modules || []).map(m => [m.locator, m.size, m.type, m.speed, m.manufacturer, m.part_number]),
        { style: "margin-top:1rem" }
    ));
    return el;
}