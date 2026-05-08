import { formatBytes } from "../../../../../lib/format.js";

let _selected = null;

export function renderDisco(disks, savedDisk = null, driveLetters = []) {
    const container = document.getElementById("cd-disco-list");
    const tpl       = document.getElementById("cd-disco-option-tpl");
    if (!container || !tpl) return;

    container.innerHTML = "";
    _selected = savedDisk ?? null;

    const physical = (disks || []).filter(d => d.type === "disk");
    if (!physical.length) {
        container.innerHTML = '<p class="empty">Nenhum disco físico detectado.</p>';
        return;
    }

    for (const d of physical) {
        const node  = tpl.content.cloneNode(true);
        const label = node.querySelector(".cd-disk-option");
        const radio = node.querySelector("input[type='radio']");

        label.dataset.name = d.name;
        if (savedDisk === d.name) { label.classList.add("selected"); }

        radio.value = d.name;
        if (savedDisk === d.name) radio.checked = true;

        node.querySelector(".cd-disk-name").innerHTML  = `<code>${d.name}</code>`;
        const entry = (driveLetters || []).find(dl => dl.device === d.name ||
            disks.filter(p => p.type === "part" && p.name.startsWith(d.name))
                .some(p => dl.device === p.name));
        const driveLabel = entry
            ? ` (${entry.letter}: ${entry.label || (entry.letter === "C" ? "Windows" : "Dados")})`
            : "";
        node.querySelector(".cd-disk-name").innerHTML = `<code>${d.name}</code><span class="cd-disk-drive-label">${driveLabel}</span>`;
        node.querySelector(".cd-disk-model").textContent = [d.vendor, d.model].filter(Boolean).join(" ") || "Disco desconhecido";
        node.querySelector(".cd-disk-size").textContent  = formatBytes(d.size);

        const serialEl = node.querySelector(".cd-disk-serial");
        if (d.serial) serialEl.textContent = d.serial;
        else serialEl.remove();

        container.appendChild(node);
    }

    container.querySelectorAll('input[name="cd-target-disk"]').forEach(radio => {
        radio.addEventListener("change", () => {
            container.querySelectorAll(".cd-disk-option")
                .forEach(el => el.classList.toggle("selected", el.dataset.name === radio.value));
            _selected = radio.value;
        });
    });
}

export function collectDisco() { return _selected; }