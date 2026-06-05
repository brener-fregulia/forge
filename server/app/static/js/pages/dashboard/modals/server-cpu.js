import { buildSummary, buildTable } from "../../../lib/ui/builders.js";
import { qs, setContent } from "../../../lib/anvil/dom.js";

function _bar(pct) {
    const el = document.createElement("div");
    el.style.cssText = `display:inline-block;width:${pct}%;height:6px;background:var(--accent);border-radius:3px;vertical-align:middle`;
    return el;
}

export function renderCpuModal(d) {
    const existing = qs("#cpu-modal-root");
    if (existing) {
        _updateCpuModal(existing, d);
        return existing;
    }

    const root = document.createElement("div");
    root.id = "cpu-modal-root";

    root.appendChild(buildSummary([
        { label: "Modelo",          value: d.name || "-" },
        { label: "Cores / Threads", value: `${d.physical_cores}c / ${d.logical_cores}t` },
        { label: "Temperatura",     value: d.temp !== null ? `${d.temp}°C` : "-" },
        { label: "Clock atual",     value: d.freq_current ? `${d.freq_current} MHz` : "-" },
        { label: "Clock máx",       value: d.freq_max ? `${d.freq_max} MHz` : "-" },
    ]));

    const table = buildTable(
        ["Core", "Uso", ""],
        (d.per_core || []).map((p, i) => [`Core ${i}`, `${p.toFixed(0)}%`, _bar(p)]),
        { style: "margin-top:1rem" }
    );
    table.id = "cpu-cores-table";
    root.appendChild(table);

    return root;
}

function _updateCpuModal(root, d) {
    const summaryValues = root.querySelectorAll(".info-summary-item strong");
    const newValues = [
        d.name || "-",
        `${d.physical_cores}c / ${d.logical_cores}t`,
        d.temp !== null ? `${d.temp}°C` : "-",
        d.freq_current ? `${d.freq_current} MHz` : "-",
        d.freq_max ? `${d.freq_max} MHz` : "-",
    ];
    summaryValues.forEach((el, i) => {
        if (newValues[i] !== undefined) setContent(el, newValues[i]);
    });

    const rows = root.querySelectorAll("#cpu-cores-table tbody tr");
    (d.per_core || []).forEach((p, i) => {
        const row = rows[i];
        if (!row) return;
        const cells = row.querySelectorAll("td");
        setContent(cells[1], `${p.toFixed(0)}%`);
        cells[2].innerHTML = "";
        cells[2].appendChild(_bar(p));
    });
}