import { formatBytes } from "../../../lib/format.js";

let _selected = null;

export function renderDisco(disks, savedDisk = null) {
    const container = document.getElementById("cd-disco-list");
    if (!container) return;

    const physical = (disks || []).filter(d => d.type === "disk");

    if (!physical.length) {
        container.innerHTML = '<p class="empty">Nenhum disco físico detectado.</p>';
        return;
    }

    container.innerHTML = physical.map(d => `
        <label class="cd-disk-option" data-name="${d.name}">
            <input type="radio" name="cd-target-disk" value="${d.name}"
                ${savedDisk === d.name ? "checked" : ""}>
            <div class="cd-disk-info">
                <div class="cd-disk-name"><code>${d.name}</code></div>
                <div class="cd-disk-model">${[d.vendor, d.model].filter(Boolean).join(" ") || "Disco desconhecido"}</div>
                <div class="cd-disk-meta">
                    <span>${formatBytes(d.size)}</span>
                    ${d.serial ? `<span class="cd-disk-serial">${d.serial}</span>` : ""}
                </div>
            </div>
        </label>
    `).join("");

    // Restaura seleção visual se havia disco salvo
    if (savedDisk) {
        const opt = container.querySelector(`.cd-disk-option[data-name="${savedDisk}"]`);
        if (opt) { opt.classList.add("selected"); _selected = savedDisk; }
    }

    container.querySelectorAll('input[name="cd-target-disk"]').forEach(radio => {
        radio.addEventListener("change", () => {
            container.querySelectorAll(".cd-disk-option")
                .forEach(el => el.classList.toggle("selected", el.dataset.name === radio.value));
            _selected = radio.value;
        });
    });
}

export function collectDisco() {
    return _selected;
}