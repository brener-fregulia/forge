import { qs, qsa, setContent, setHtml, cloneTemplate, toggleClass } from "../../../../lib/anvil/dom.js";
import { formatBytes } from "../../../../lib/format.js";

let _selected = null;

export function renderDisco(disks, savedDisk = null, driveLetters = []) {
    const container = qs("#cd-disco-list");
    if (!container) return;

    setHtml(container, "");
    _selected = savedDisk ?? null;

    const physical = (disks || []).filter(d => d.type === "disk");
    if (!physical.length) {
        setHtml(container, '<p class="empty">Nenhum disco físico detectado.</p>');
        return;
    }

    for (const d of physical) {
        const node  = cloneTemplate("cd-disco-option-tpl");
        if (!node) continue;
        const label = node.querySelector(".cd-disk-option");
        const radio = node.querySelector("input[type='radio']");

        label.dataset.name = d.name;
        toggleClass(label, "selected", savedDisk === d.name);

        radio.value   = d.name;
        radio.checked = savedDisk === d.name;

        const entry = (driveLetters || []).find(dl => dl.device === d.name ||
            disks.filter(p => p.type === "part" && p.name.startsWith(d.name))
                .some(p => dl.device === p.name));
        const driveLabel = entry
            ? ` (${entry.letter}: ${entry.label || (entry.letter === "C" ? "Windows" : "Dados")})`
            : "";

        qs(".cd-disk-name",  node).innerHTML  = `<code>${d.name}</code><span class="cd-disk-drive-label">${driveLabel}</span>`;
        setContent(qs(".cd-disk-model", node), [d.vendor, d.model].filter(Boolean).join(" ") || "Disco desconhecido");
        setContent(qs(".cd-disk-size",  node), formatBytes(d.size));

        const serialEl = qs(".cd-disk-serial", node);
        if (d.serial) setContent(serialEl, d.serial);
        else serialEl?.remove();

        container.appendChild(node);
    }

    qsa('input[name="cd-target-disk"]', container).forEach(radio => {
        radio.addEventListener("change", () => {
            qsa(".cd-disk-option", container)
                .forEach(el => toggleClass(el, "selected", el.dataset.name === radio.value));
            _selected = radio.value;
        });
    });
}

export function collectDisco() { return _selected; }