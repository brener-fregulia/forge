import { qs, qsa, setContent, setHtml, cloneTemplate, toggleClass } from "../../../../../lib/anvil/dom.js";
import { formatBytes } from "../../../../../lib/format.js";

let _selected   = null;
let _onChangeCb = null;

export function onSoChange(cb) { _onChangeCb = cb; }
export function collectSo()    { return _selected; }

export function renderSo(isos, savedIso = undefined) {
    const container = qs("#cd-so-list");
    if (!container) return;

    _selected = savedIso !== undefined ? savedIso : undefined;
    setHtml(container, "");

    const optionTpl = qs("#cd-so-option-tpl");
    const groupTpl  = qs("#cd-so-group-tpl");

    _appendOption(container, optionTpl, { filename: "", size: null }, savedIso, "Não instalar");

    const groups = { windows: [], linux: [], outros: [] };
    for (const iso of (isos || [])) {
        const cat = groups[iso.category] !== undefined ? iso.category : "outros";
        groups[cat].push(iso);
    }

    const labels = { windows: "Windows", linux: "Linux", outros: "Outros" };
    for (const [cat, items] of Object.entries(groups)) {
        if (!items.length) continue;
        const group   = groupTpl.content.cloneNode(true);
        const groupEl = group.querySelector(".cd-so-group");
        setContent(qs(".cd-so-group-label", groupEl), labels[cat]);
        for (const iso of items) _appendOption(groupEl, optionTpl, iso, savedIso);
        container.appendChild(groupEl);
    }

    qsa('input[name="cd-windows-iso"]', container).forEach(radio => {
        radio.addEventListener("change", () => {
            qsa(".cd-disk-option", container)
                .forEach(el => toggleClass(el, "selected", el.dataset.name === radio.value));
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
    toggleClass(label, "selected", isSelected);

    radio.value   = iso.filename;
    radio.checked = isSelected;

    setContent(name, labelOverride ?? iso.filename);
    setContent(meta, iso.size ? formatBytes(iso.size) : "");

    parent.appendChild(node);
}