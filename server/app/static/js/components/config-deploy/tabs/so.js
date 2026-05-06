import { formatBytes } from "../../../lib/format.js";

let _selected = null;
let _onChangeCb = null;

export function onSoChange(cb) { _onChangeCb = cb; }
export function collectSo() { return _selected; }

export function renderSo(isos, savedIso = undefined) {
    const container = document.getElementById("cd-so-list");
    if (!container) return;

    _selected = savedIso !== undefined ? savedIso : undefined;
    container.innerHTML = "";

    const optionTpl = document.getElementById("cd-so-option-tpl");
    const groupTpl  = document.getElementById("cd-so-group-tpl");

    _appendOption(container, optionTpl, { filename: "", size: null }, savedIso, "Não instalar");

    const groups = { windows: [], linux: [], outros: [] };
    for (const iso of (isos || [])) {
        const cat = groups[iso.category] !== undefined ? iso.category : "outros";
        groups[cat].push(iso);
    }

    const labels = { windows: "Windows", linux: "Linux", outros: "Outros" };
    for (const [cat, items] of Object.entries(groups)) {
        if (!items.length) continue;
        const group = groupTpl.content.cloneNode(true);
        const groupEl = group.querySelector(".cd-so-group");
        groupEl.querySelector(".cd-so-group-label").textContent = labels[cat];
        for (const iso of items) {
            _appendOption(groupEl, optionTpl, iso, savedIso);
        }
        container.appendChild(groupEl);
    }

    container.querySelectorAll('input[name="cd-windows-iso"]').forEach(radio => {
        radio.addEventListener("change", () => {
            container.querySelectorAll(".cd-disk-option")
                .forEach(el => el.classList.toggle("selected", el.dataset.name === radio.value));
            _selected = radio.value === "" ? null : radio.value;
            _onChangeCb?.(radio.value);
        });
    });
}

function _appendOption(parent, tpl, iso, savedIso, labelOverride = null) {
    const node  = tpl.content.cloneNode(true);
    const label = node.querySelector(".cd-disk-option");
    const radio = node.querySelector("input[type='radio']");
    const name  = node.querySelector(".cd-disk-name");
    const meta  = node.querySelector(".cd-disk-meta");

    const isSelected = savedIso !== undefined && (
        (iso.filename === "" && savedIso === null) || savedIso === iso.filename
    );

    label.dataset.name = iso.filename;
    if (isSelected) label.classList.add("selected");

    radio.value = iso.filename;
    if (isSelected) radio.checked = true;

    name.textContent = labelOverride ?? iso.filename;
    meta.textContent = iso.size ? formatBytes(iso.size) : "";

    parent.appendChild(node);
}