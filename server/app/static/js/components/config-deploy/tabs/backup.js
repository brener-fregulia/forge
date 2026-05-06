const MODES = [
    { value: "none",     label: "Sem backup" },
    { value: "minimal",  label: "Mínimo" },
    { value: "advanced", label: "Avançado" },
    { value: "raw",      label: "Raw Image" },
];

let _selected = "none";

export function renderBackup(plan) {
    const container = document.getElementById("cd-backup-modes");
    const tpl       = document.getElementById("cd-backup-mode-tpl");
    if (!container || !tpl) return;

    container.innerHTML = "";
    _selected = plan?.backup_mode ?? "none";

    for (const mode of MODES) {
        const node  = tpl.content.cloneNode(true);
        const label = node.querySelector(".cd-backup-mode");
        const radio = node.querySelector("input[type='radio']");
        const span  = node.querySelector(".cd-backup-mode-label");

        radio.value = mode.value;
        span.textContent = mode.label;
        if (_selected === mode.value) label.classList.add("selected");

        container.appendChild(node);
    }

    container.querySelectorAll('input[name="cd-backup-mode"]').forEach(radio => {
        radio.addEventListener("change", () => {
            container.querySelectorAll(".cd-backup-mode")
                .forEach(el => el.classList.toggle("selected", el.querySelector("input").value === radio.value));
            _selected = radio.value;
        });
    });
}

export function collectBackup() {
    return { backup_mode: _selected };
}