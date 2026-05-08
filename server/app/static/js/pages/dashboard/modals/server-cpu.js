export function renderCpuModal(d) {
    const bar = (pct) =>
        `<div style="display:inline-block;width:${pct}%;height:6px;background:var(--accent);border-radius:3px;vertical-align:middle"></div>`;
    const cores = (d.per_core || []).map((p, i) =>
        `<tr><td>Core ${i}</td><td>${p.toFixed(0)}%</td><td style="width:120px">${bar(p)}</td></tr>`
    ).join("");
    return `
        <div class="info-summary">
            <div class="info-summary-item"><strong>${d.name || "—"}</strong><span>Modelo</span></div>
            <div class="info-summary-item"><strong>${d.physical_cores}c / ${d.logical_cores}t</strong><span>Cores / Threads</span></div>
            <div class="info-summary-item"><strong>${d.temp !== null ? d.temp + "°C" : "—"}</strong><span>Temperatura</span></div>
            <div class="info-summary-item"><strong>${d.fan_rpm !== null ? d.fan_rpm + " RPM" : "—"}</strong><span>Fan</span></div>
            <div class="info-summary-item"><strong>${d.freq_current ? d.freq_current + " MHz" : "—"}</strong><span>Clock atual</span></div>
            <div class="info-summary-item"><strong>${d.freq_max ? d.freq_max + " MHz" : "—"}</strong><span>Clock máx</span></div>
        </div>
        <table class="forge-table" style="margin-top:1rem">
            <thead><tr><th>Core</th><th>Uso</th><th></th></tr></thead>
            <tbody>${cores}</tbody>
        </table>`;
}