import { formatBytes } from "../lib/format.js";
import { openSmartModal } from "./smart-modal.js";

let _disks = [];
let _smart = {};

export function tryInitialRender() {
    const raw = document.getElementById("disks")?.textContent?.trim();
    if (raw && raw !== "[]" && raw !== "null") {
        try {
            const disks = JSON.parse(raw);
            if (disks?.length) renderDisks(disks, {}, []);
        } catch {}
    }
}

function _driveLabel(name, driveLetters, disks, isDisk) {
    if (!driveLetters?.length) return null;

    if (isDisk) {
        const children = (disks || [])
            .filter(d => d.type === "part" && d.name.startsWith(name))
            .map(d => (driveLetters || []).find(dl => dl.device === d.name))
            .filter(Boolean);
        if (!children.length) return null;
        const letters = children.map(e => {
            const label = e.label || (e.letter === "C" ? "Windows" : "Dados");
            return `${e.letter}: — ${label}`;
        });
        return `(${letters.join(", ")})`;
    }

    const entry = (driveLetters || []).find(d => d.device === name);
    if (!entry) return null;
    return `(${entry.letter}:)`;
}

export function renderDisks(disks, smart, driveLetters) {
    _disks = disks;
    _smart = smart;

    const container = document.getElementById("disks-rendered");
    if (!container || !disks?.length) return;

    const tableTpl = document.getElementById("disks-table-tpl");
    const mainTpl  = document.getElementById("disk-row-main-tpl");
    const partTpl  = document.getElementById("disk-row-part-tpl");
    if (!tableTpl || !mainTpl || !partTpl) return;

    const table = tableTpl.content.cloneNode(true);
    const tbody = table.getElementById("disks-tbody");

    for (const d of disks) {
        const isPart = d.type === "part";
        const tpl    = isPart ? partTpl : mainTpl;
        const row    = tpl.content.cloneNode(true);
        const tr     = row.querySelector("tr");

        const nameEl = tr.querySelector(".disk-name");
        const dlabel = _driveLabel(d.name, driveLetters, disks, !isPart);
        nameEl.textContent = d.name;
        if (dlabel) {
            const span = document.createElement("span");
            span.className   = "disk-drive-label";
            span.textContent = " " + dlabel;
            nameEl.appendChild(span);
        }

        tr.querySelector(".disk-model").textContent = [d.vendor, d.model].filter(Boolean).join(" ") || "—";
        const serialEl = tr.querySelector(".disk-serial");
        if (d.serial) {
            serialEl.className = "disk-serial";
            serialEl.innerHTML = `<code>${d.serial}</code>`;
        }

        tr.querySelector(".disk-size").textContent = d.size ? formatBytes(d.size) : "—";

        const fstypeEl = tr.querySelector(".disk-fstype");
        if (d.fstype) {
            const isNtfs = d.fstype.toLowerCase() === "ntfs";
            fstypeEl.innerHTML = `<span class="fs-badge ${isNtfs ? 'fs-ntfs' : 'fs-other'}">${d.fstype}</span>`;
        } else {
            fstypeEl.textContent = "—";
        }

        const healthEl = tr.querySelector(".disk-health");
        if (isPart) {
            healthEl.textContent = "—";
        } else if (smart && smart[d.name] !== undefined) {
            const s      = smart[d.name];
            const passed = s.smart_status?.passed;
            const temp   = s.temperature?.current;
            const badge  = document.createElement("span");
            badge.className   = passed === true ? "health-badge health-ok"
                : passed === false ? "health-badge health-fail"
                : "health-badge health-unknown";
            badge.textContent = passed === true ? "OK" : passed === false ? "FAIL" : "?";
            healthEl.prepend(badge);
            if (temp != null) {
                const tempEl = document.createElement("span");
                tempEl.className   = "health-temp";
                tempEl.textContent = `${temp}°C`;
                badge.after(tempEl);
            }
        } else {
            const loading = document.createElement("span");
            loading.className = "loading";
            loading.innerHTML = '<span class="spinner"></span>';
            healthEl.prepend(loading);
        }

        tbody.appendChild(tr);
    }

    container.innerHTML = "";
    container.appendChild(table);

    document.getElementById("open-smart-btn")?.addEventListener("click", () => {
        // Temporário em disks-table.js, antes do openSmartModal
        console.log("[smart] disks:", _disks.filter(d => d.type === "disk").map(d => d.name));
        console.log("[smart] smart keys:", Object.keys(_smart));
        openSmartModal(_disks, _smart);
    });
}