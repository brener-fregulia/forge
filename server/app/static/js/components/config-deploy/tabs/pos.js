export function renderPos(plan) {
    const container = document.getElementById("cd-pos-list");
    const tpl       = document.getElementById("cd-pos-option-tpl");
    if (!container || !tpl) return;

    container.innerHTML = "";

    const hasBackup = plan?.backup ?? false;

    const options = [
        { id: "cd-pos-drivers",  label: "Injeção de drivers (SDIO)", checked: true,       disabled: false },
        { id: "cd-pos-debloat",  label: "Debloat",                   checked: true,       disabled: false },
        { id: "cd-pos-restore",  label: "Restaurar backup",          checked: hasBackup,  disabled: !hasBackup },
    ];

    for (const opt of options) {
        const node     = tpl.content.cloneNode(true);
        const checkbox = node.querySelector("input[type='checkbox']");
        const label    = node.querySelector("label");
        const wrapper  = node.querySelector(".cd-pos-option");

        checkbox.id       = opt.id;
        checkbox.checked  = opt.checked;
        checkbox.disabled = opt.disabled;
        label.htmlFor     = opt.id;
        label.textContent = opt.label;

        if (opt.disabled) wrapper.classList.add("disabled");

        container.appendChild(node);
    }
}

export function collectPos() {
    return {
        drivers: document.getElementById("cd-pos-drivers")?.checked ?? false,
        debloat: document.getElementById("cd-pos-debloat")?.checked  ?? false,
        restore: document.getElementById("cd-pos-restore")?.checked  ?? false,
    };
}