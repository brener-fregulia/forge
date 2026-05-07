const MODES = [
    { value: "none",     label: "Sem backup" },
    { value: "minimal",  label: "Mínimo" },
    { value: "advanced", label: "Avançado" },
    { value: "raw",      label: "Raw Image" },
];

let _mode     = "none";
let _mac      = null;
let _tree     = {};
let _driveLetters = [];

export function initBackup(mac) {
    _mac       = mac;
}

export function renderBackup(plan, driveLetters) {
    const container = document.getElementById("cd-backup-modes");
    const tpl       = document.getElementById("cd-backup-mode-tpl");
    if (!container || !tpl) return;

    container.innerHTML = "";
    _mode = plan?.backup_mode ?? "none";
    _driveLetters = driveLetters || [];

    for (const mode of MODES) {
        const node  = tpl.content.cloneNode(true);
        const label = node.querySelector(".cd-backup-mode");
        const radio = node.querySelector("input[type='radio']");
        const span  = node.querySelector(".cd-backup-mode-label");

        radio.value = mode.value;
        span.textContent = mode.label;
        if (_mode === mode.value) label.classList.add("selected");

        container.appendChild(node);
    }

    container.querySelectorAll('input[name="cd-backup-mode"]').forEach(radio => {
        radio.addEventListener("change", () => {
            container.querySelectorAll(".cd-backup-mode")
                .forEach(el => el.classList.toggle("selected", el.querySelector("input").value === radio.value));
            _mode = radio.value;
            _renderContent(_driveLetters);
        });
    });

    _renderContent(_driveLetters);
}

function _renderContent(driveLetters) {
    const content = document.getElementById("cd-backup-content");
    if (!content) return;
    content.innerHTML = "";

    if (_mode === "advanced") {
        _renderTree(content, driveLetters);
    }
}

function _renderTree(container, driveLetters) {
    const volTpl = document.getElementById("cd-tree-volume-tpl");
    if (!volTpl || !driveLetters?.length) {
        container.innerHTML = '<p class="empty">Nenhum volume detectado.</p>';
        return;
    }

    for (const vol of driveLetters) {
        const node     = volTpl.content.cloneNode(true);
        const volEl    = node.querySelector(".cd-tree-volume");
        const header   = node.querySelector(".cd-tree-volume-header");
        const labelEl  = node.querySelector(".cd-tree-volume-label");
        const children = node.querySelector(".cd-tree-children");

        const displayLabel = `${vol.letter}: ${vol.label || (vol.letter === "C" ? "Windows" : "Dados")} (${vol.device})`;
        labelEl.textContent = displayLabel;

        volEl.dataset.device = vol.device;
        volEl.dataset.path   = "";

        _initCheck(node.querySelector(".cd-tree-check"), vol.device, "");

        header.addEventListener("click", (e) => {
            if (e.target.classList.contains("cd-tree-check")) return;
            const isOpen = children.style.display !== "none";
            children.style.display = isOpen ? "none" : "block";
            if (!isOpen && !children.dataset.loaded) {
                children.dataset.loaded = "1";
                _loadChildren(children, vol.device, "");
            }
        });

        container.appendChild(node);
    }
}

async function _loadChildren(container, device, path) {
    container.innerHTML = '<span class="loading"><span class="spinner"></span></span>';

    const mntPath = `/tmp/mnt_${device}/${path}`;
    const cmd = `sh /usr/lib/forge/forge-ls.sh /tmp/mnt_${device}/${path}`;

    const output = await _sendCommand(cmd);
    container.innerHTML = "";

    if (!output?.trim()) {
        container.innerHTML = '<p class="empty" style="padding-left:1rem">Vazio.</p>';
        return;
    }

    const nodeTpl = document.getElementById("cd-tree-node-tpl");
    const lines   = output.trim().split("\n").filter(Boolean);

    for (const line of lines) {
        const [type, ...nameParts] = line.split("\t");
        const name     = nameParts.join("\t");
        const isDir    = type === "d";
        const fullPath = path ? `${path}/${name}` : name;

        const node      = nodeTpl.content.cloneNode(true);
        const nodeEl    = node.querySelector(".cd-tree-node");
        const expandEl  = node.querySelector(".cd-tree-expand");
        const iconEl    = node.querySelector(".cd-tree-icon");
        const nameEl    = node.querySelector(".cd-tree-name");
        const children  = node.querySelector(".cd-tree-children");

        nameEl.textContent  = name;
        iconEl.textContent  = isDir ? "📁" : "📄";
        expandEl.textContent = isDir ? "▶" : "";
        nodeEl.dataset.path = fullPath;

        _initCheck(node.querySelector(".cd-tree-check"), device, fullPath);

        if (isDir) {
            expandEl.addEventListener("click", () => {
                const isOpen = children.style.display !== "none";
                children.style.display = isOpen ? "none" : "block";
                expandEl.textContent = isOpen ? "▶" : "▼";
                if (!isOpen && !children.dataset.loaded) {
                    children.dataset.loaded = "1";
                    _loadChildren(children, device, fullPath);
                }
            });
        }

        container.appendChild(node);
    }
}

function _initCheck(btn, device, path) {
    if (!btn) return;
    btn.dataset.device = device;
    btn.dataset.path   = path;
    _setCheckState(btn, _getState(device, path));

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const current  = btn.dataset.state;
        const newState = current === "all" ? "none" : "all";
        _setState(device, path, newState);
        _setCheckState(btn, newState);
        _propagateDown(btn.closest(".cd-tree-node, .cd-tree-volume"), device, path, newState);
        _propagateUp(btn);
    });
}

function _getState(device, path) {
    return _tree[`${device}:${path}`] ?? "none";
}

function _setState(device, path, state) {
    _tree[`${device}:${path}`] = state;
}

function _setCheckState(btn, state) {
    btn.dataset.state   = state;
    btn.textContent     = state === "all" ? "☑" : state === "partial" ? "▣" : "☐";
}

function _propagateDown(el, device, path, state) {
    if (!el) return;
    el.querySelectorAll(".cd-tree-check").forEach(b => {
        _setState(b.dataset.device, b.dataset.path, state);
        _setCheckState(b, state);
    });
}

function _propagateUp(btn) {
    let el = btn.closest(".cd-tree-node, .cd-tree-volume")?.parentElement?.closest(".cd-tree-node, .cd-tree-volume");
    while (el) {
        const checks   = [...el.querySelectorAll(":scope > .cd-tree-children .cd-tree-check")];
        const states   = checks.map(b => b.dataset.state);
        const allAll   = states.every(s => s === "all");
        const allNone  = states.every(s => s === "none");
        const parentBtn = el.querySelector(":scope > .cd-tree-check, :scope > .cd-tree-volume-header > .cd-tree-check");
        const newState  = allAll ? "all" : allNone ? "none" : "partial";
        if (parentBtn) {
            _setState(parentBtn.dataset.device, parentBtn.dataset.path, newState);
            _setCheckState(parentBtn, newState);
        }
        el = el.parentElement?.closest(".cd-tree-node, .cd-tree-volume");
    }
}

async function _sendCommand(cmd) {
    try {
        const res = await fetch(`/api/clients/${_mac}/command/exec`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        return data.output ?? "";
    } catch {
        return "";
    }
}

export function collectBackup() {
    const selection = Object.entries(_tree)
        .filter(([, state]) => state === "all")
        .map(([key]) => {
            const [device, ...pathParts] = key.split(":");
            const path = pathParts.join(":");
            return path ? `/tmp/mnt_${device}/${path}` : `/tmp/mnt_${device}`;
        });
    return { backup_mode: _mode, backup_selection: selection };
}