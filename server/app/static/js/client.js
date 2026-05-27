import { createWS } from "./lib/ws.js";
import { initClipboard } from "./lib/ui/clipboard.js";
import { renderHardware } from "./components/hardware-card.js";
import { renderDisks } from "./components/disks-table.js";
import { renderUsers } from "./components/users-table.js";
import { initSmartModal } from "./components/smart-modal.js";
import { initAlias, updateAlias } from "./pages/client/alias.js";
import { initCommand } from "./pages/client/command.js";
import { initLog, updateLog } from "./pages/client/log.js";
import { initDeploy, updateDeployState } from "./pages/client/deploy/index.js";
import { initTabs } from "./lib/ui/tabs.js";
import { initTerminal, fitAll } from "./pages/client/terminal/index.js";
import { qs, setContent } from "./lib/anvil/dom.js";

const mac = window.CLIENT_MAC;

const els = {
    hw:    qs("#hw"),
    disks: qs("#disks"),
    users: qs("#users"),
    log:   qs("#log"),
};

// Carga inicial via REST
async function loadInitialState() {
    try {
        const res = await fetch(`/api/clients/${mac}`);
        if (!res.ok) return;
        const c = await res.json();
        _renderStatic(c);
        updateMeta(c);
        updateAlias(c.alias);
        updateDeployState(c.deploy_plan);
    } catch (e) {
        console.warn("[FORGE] erro ao carregar estado inicial:", e);
    }
}

// Renderiza campos estáticos (hardware, discos, users) - chamado uma vez
function _renderStatic(c) {
    if (c.hardware && Object.keys(c.hardware).length > 0) {
        els.hw.textContent = JSON.stringify(c.hardware, null, 2);
        renderHardware(c.hardware);
    }
    if (c.disks?.length) {
        els.disks.textContent = JSON.stringify(c.disks, null, 2);
        renderDisks(c.disks, c.smart, c.drive_letters);
    }
    if (Array.isArray(c.users)) {
        els.users.textContent = JSON.stringify(c.users, null, 2);
        renderUsers(c.users, c.drive_letters);
    }
}

// Atualiza apenas campos dinâmicos via WS
function updateClient(c) {
    updateMeta(c);
    if (c.log_tail !== undefined) updateLog(c.log_tail, els.log);
    if (c.alias !== undefined) updateAlias(c.alias);
    if (c.deploy_plan !== undefined) updateDeployState(c.deploy_plan);
}

function updateMeta(c) {
    const status = qs("#meta-status");
    if (status && c.status) {
        setContent(status, c.status);
        status.className = `status status-${c.status}`;
    }
    const ip = qs("#meta-ip");
    if (ip && c.ip) setContent(ip, c.ip);
}

createWS("/ws/dashboard", {
    client_status:    ({ mac: m, status, progress, last_seen }) => {
        if (m !== mac) return;
        updateMeta({ status });
    },
    client_update:    ({ mac: m, client: c }) => m === mac && updateClient(c),
    client_connected: ({ mac: m, client: c }) => m === mac && updateClient(c),
    snapshot:         ({ clients }) => {
        const c = clients.find(x => x.mac === mac);
        if (c) updateClient(c);
    },
});

loadInitialState();
initTerminal(mac);
initSmartModal();
initAlias(mac);
initCommand(mac);
initLog(mac);
initDeploy(mac);
initClipboard();
initTabs("client-main-tabs", {
    clickable: true,
    onChange: (tabId) => { if (tabId === "terminal") fitAll(); }
});