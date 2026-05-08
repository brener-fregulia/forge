import { createWS } from "./lib/ws.js";
import { initClipboard } from "./lib/clipboard.js";
import { renderHardware } from "./components/hardware-card.js";
import { renderDisks, tryInitialRender } from "./components/disks-table.js";
import { renderUsers } from "./components/users-table.js";
import { initSmartModal } from "./components/smart-modal.js";
import { initAlias, updateAlias } from "./pages/client/alias.js";
import { initCommand } from "./pages/client/command.js";
import { initLog, updateLog } from "./pages/client/log.js";
import { initDeploy, updateDeployState } from "./pages/client/deploy.js";

const mac = window.CLIENT_MAC;

const els = {
    hw:    document.getElementById("hw"),
    disks: document.getElementById("disks"),
    users: document.getElementById("users"),
    log:   document.getElementById("log"),
};

createWS("/ws/dashboard", {
    client_update:    ({ mac: m, client: c }) => m === mac && updateClient(c),
    client_connected: ({ mac: m, client: c }) => m === mac && updateClient(c),
    snapshot:         ({ clients }) => {
        const c = clients.find(x => x.mac === mac);
        if (c) updateClient(c);
    },
});

function updateMeta(c) {
    const status = document.getElementById("meta-status");
    if (status) {
        status.textContent = c.status;
        status.className   = `status status-${c.status}`;
    }
    const ip = document.getElementById("meta-ip");
    if (ip) ip.textContent = c.ip;
}

function updateClient(c) {
    if (c.hardware && typeof c.hardware === "object" && Object.keys(c.hardware).length > 0) {
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
    updateMeta(c);
    updateLog(c.log_tail, els.log);
    updateAlias(c.alias);
    updateDeployState(c.deploy_plan);
}

initSmartModal();
initAlias(mac);
initCommand(mac);
initLog(mac);
initDeploy(mac);
initClipboard();
tryInitialRender();