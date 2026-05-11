import { formatBytes } from "../../../lib/format.js";
import { buildSummary, buildTable } from "../../../lib/builders.js";
import { el, append } from "../../../lib/anvil/element.js";
import { openSmartModal } from "../../../components/smart-modal.js";

function _healthBadge(passed) {
    if (passed === true)  { const s = el("span", { cls: ["health-badge", "health-ok"],   text: "OK"   }); return s; }
    if (passed === false) { const s = el("span", { cls: ["health-badge", "health-fail"], text: "FAIL" }); return s; }
    return null;
}

function _smartBtn(disks) {
    const btn = el("button", { cls: "btn-small", text: "SMART", style: "margin-left:auto" });
    btn.addEventListener("click", () => {
        const fakeDisks = disks.map(d => ({ name: d.name, type: "disk", model: d.model || "" }));
        const smartMap  = Object.fromEntries(disks.map(d => [d.name, d.smart]));
        openSmartModal(fakeDisks, smartMap);
    });
    return btn;
}

export function renderStorageModal(d, isRaid) {
    const fragment = document.createDocumentFragment();

    const summary = buildSummary([
        { label: "Usado",        value: formatBytes(d.used) },
        { label: "Livre",        value: formatBytes(d.free) },
        { label: "Total",        value: formatBytes(d.total) },
        { label: "Configuração", value: isRaid ? "RAID1" : "Sem RAID" },
    ]);
    summary.style.alignItems = "center";
    if (d.disks?.length) summary.appendChild(_smartBtn(d.disks));
    fragment.appendChild(summary);

    if (isRaid && d.raid_detail) {
        fragment.appendChild(buildSummary(
            Object.entries(d.raid_detail).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v }))
        ));
    }

    fragment.appendChild(buildTable(
        ["Disco", "Modelo", "Serial", "Temp", "Horas", "Saúde"],
        (d.disks || []).map(disk => [
            disk.name || "—",
            disk.model || "—",
            disk.serial || "—",
            disk.temp         != null ? `${disk.temp}°C`          : "—",
            disk.power_on_hours != null ? `${disk.power_on_hours}h` : "—",
            _healthBadge(disk.passed),
        ]),
        { style: "margin-top:1rem" }
    ));

    return fragment;
}