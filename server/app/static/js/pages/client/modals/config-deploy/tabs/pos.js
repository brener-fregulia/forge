import { qs, setContent, cloneTemplate, toggleClass } from "../../../../../lib/anvil/dom.js";

export function renderPos(plan) {
    const container = qs("#cd-pos-list");
    if (!container) return;

    container.innerHTML = "";

    const hasBackup = plan?.backup ?? false;

    const options = [
        { id: "cd-pos-drivers", label: "Injeção de drivers (SDIO)", checked: plan?.drivers ?? true,      disabled: false },
        { id: "cd-pos-debloat", label: "Debloat",                   checked: plan?.debloat ?? true,      disabled: false },
        { id: "cd-pos-restore", label: "Restaurar backup",          checked: plan?.restore ?? hasBackup, disabled: !hasBackup },
    ];

    for (const opt of options) {
        const node     = cloneTemplate("cd-pos-option-tpl");
        if (!node) continue;
        const checkbox = node.querySelector("input[type='checkbox']");
        const label    = node.querySelector("label");
        const wrapper  = node.querySelector(".cd-pos-option");

        checkbox.id       = opt.id;
        checkbox.checked  = opt.checked;
        checkbox.disabled = opt.disabled;
        label.htmlFor     = opt.id;
        setContent(label, opt.label);

        toggleClass(wrapper, "disabled", opt.disabled);

        container.appendChild(node);
    }
}

export function collectPos() {
    return {
        drivers: qs("#cd-pos-drivers")?.checked ?? false,
        debloat: qs("#cd-pos-debloat")?.checked ?? false,
        restore: qs("#cd-pos-restore")?.checked ?? false,
    };
}