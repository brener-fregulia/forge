import { qs, on, setContent, setHtml, cloneTemplate } from "../lib/anvil/dom.js";
import { formatBytes } from "../lib/format.js";
import { openSmartModal } from "./smart-modal.js";

let _disks = [];
let _smart = {};

export function tryInitialRender() {
    const raw = qs("#disks")?.textContent?.trim();
    if (raw && raw !== "[]" && raw !== "null") {
        try {
            const disks = JSON.parse(raw);
            if (disks?.length) renderDisks(disks, {}, []);
        } catch { }
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
            return `${e.letter}: - ${label}`;
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

    const container = qs("#disks-rendered");
    if (!container || !disks?.length) return;

    const table = cloneTemplate("disks-table-tpl");
    if (!table) return;
    const tbody = table.getElementById("disks-tbody");

    for (const d of disks) {
        const isPart = d.type === "part";
        const row = cloneTemplate(isPart ? "disk-row-part-tpl" : "disk-row-main-tpl");
        if (!row) continue;
        const tr = row.querySelector("tr");

        // Nome + drive label
        const nameEl = qs(".disk-name", tr);
        const dlabel = _driveLabel(d.name, driveLetters, disks, !isPart);

        if (!isPart) {
            const expand = document.createElement("img");
            expand.src = "/static/vendor/icons/chevron-right.svg";
            expand.className = "disk-expand tree-chevron";
            expand.alt = "";
            nameEl.appendChild(expand);
        }
        nameEl.appendChild(document.createTextNode(d.name));
        if (dlabel) {
            const span = document.createElement("span");
            span.className = "disk-drive-label";
            span.textContent = " " + dlabel;
            nameEl.appendChild(span);
        }

        // Modelo / serial
        setContent(qs(".disk-model", tr), [d.vendor, d.model].filter(Boolean).join(" ") || "-");
        const serialEl = qs(".disk-serial", tr);
        if (d.serial) {
            serialEl.className = "disk-serial";
            serialEl.innerHTML = `<code>${d.serial}</code>`;
        }

        // Tamanho
        setContent(qs(".disk-size", tr), d.size ? formatBytes(d.size) : "-");

        // Filesystem
        const fstypeEl = qs(".disk-fstype", tr);
        if (d.fstype) {
            const isNtfs = d.fstype.toLowerCase() === "ntfs";
            fstypeEl.innerHTML = `<span class="fs-badge ${isNtfs ? "fs-ntfs" : "fs-other"}">${d.fstype}</span>`;
        } else {
            setContent(fstypeEl, "-");
        }

        // Saúde SMART
        const healthEl = qs(".disk-health", tr);
        if (isPart) {
            setContent(healthEl, "-");
        } else if (smart && smart[d.name] !== undefined) {
            const s = smart[d.name];
            const passed = s.smart_status?.passed;
            const temp = s.temperature?.current;
            const badge = document.createElement("span");
            badge.className = passed === true ? "health-badge health-ok"
                : passed === false ? "health-badge health-fail"
                    : "health-badge health-unknown";
            badge.textContent = passed === true ? "OK" : passed === false ? "FAIL" : "?";
            healthEl.prepend(badge);
            if (temp != null) {
                const tempEl = document.createElement("span");
                tempEl.className = "health-temp";
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

    // Toggle expansão das rows pai
    tbody.querySelectorAll("tr.disk-main").forEach(mainRow => {
        mainRow.addEventListener("click", () => {
            const isExpanded = mainRow.classList.toggle("expanded");
            let next = mainRow.nextElementSibling;
            while (next?.classList.contains("disk-part")) {
                next.classList.toggle("visible", isExpanded);
                next = next.nextElementSibling;
            }
        });
    });

    setHtml(container, "");
    container.appendChild(table);

    on(qs("#open-smart-btn"), "click", () => {
        console.log("[smart] disks:", _disks.filter(d => d.type === "disk").map(d => d.name));
        console.log("[smart] smart keys:", Object.keys(_smart));
        openSmartModal(_disks, _smart);
    });
}