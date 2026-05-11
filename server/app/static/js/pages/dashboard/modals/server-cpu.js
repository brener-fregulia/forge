import { buildSummary, buildTable } from "../../../lib/builders.js";

export function renderCpuModal(d) {
    const bar = (pct) => {
        const el = document.createElement("div");
        el.style.cssText = `display:inline-block;width:${pct}%;height:6px;background:var(--accent);border-radius:3px;vertical-align:middle`;
        return el;
    };

    const el = document.createDocumentFragment();
    el.appendChild(buildSummary([
        { label: "Modelo",      value: d.name || "—" },
        { label: "Cores / Threads", value: `${d.physical_cores}c / ${d.logical_cores}t` },
        { label: "Temperatura", value: d.temp !== null ? `${d.temp}°C` : "—" },
        { label: "Fan",         value: d.fan_rpm !== null ? `${d.fan_rpm} RPM` : "—" },
        { label: "Clock atual", value: d.freq_current ? `${d.freq_current} MHz` : "—" },
        { label: "Clock máx",   value: d.freq_max ? `${d.freq_max} MHz` : "—" },
    ]));
    el.appendChild(buildTable(
        ["Core", "Uso", ""],
        (d.per_core || []).map((p, i) => [`Core ${i}`, `${p.toFixed(0)}%`, bar(p)]),
        { style: "margin-top:1rem" }
    ));
    return el;
}