import { createWS } from "./lib/ws.js";
import { initDeployModal } from "./components/deploy-modal.js";
import { initClipboard } from "./lib/clipboard.js";
import { renderDisks, tryInitialRender, initSmartModal } from "./components/disks-table.js";
import { renderUsers } from "./components/users-table.js";

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

function updateClient(c) {
    if (c.hardware && typeof c.hardware === 'object' && Object.keys(c.hardware).length > 0) {
        els.hw.textContent = JSON.stringify(c.hardware, null, 2);
    }
    if (c.disks?.length) {
        els.disks.textContent = JSON.stringify(c.disks, null, 2);
        renderDisks(c.disks, c.smart);
        initSmartModal(c.smart);
    }
    if (Array.isArray(c.users)) {
        els.users.textContent = JSON.stringify(c.users, null, 2);
        renderUsers(c.users);
    }
    const newLog = (c.log_tail || []).join("\n");
    if (els.log.textContent !== newLog) {
        els.log.textContent = newLog;
    } //teste
    if (c.alias) {
        const el = document.getElementById("machine-alias");
        if (el) el.textContent = c.alias;
    }
}

document.getElementById("cmd-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("cmd-input");
    const cmd = input.value.trim();
    if (!cmd) return;
    const res = await fetch(`/api/clients/${mac}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
    });
    if (res.ok) input.value = "";
    else alert("Erro ao enviar comando: " + await res.text());
});

document.getElementById("clear-log-btn").addEventListener("click", async () => {
    if (!confirm("Limpar o log deste cliente?")) return;
    const res = await fetch(`/api/clients/${mac}/log/clear`, { method: "POST" });
    if (!res.ok) alert("Erro ao limpar log");
});

document.getElementById("edit-alias-btn")?.addEventListener("click", () => {
    document.getElementById("alias-form").style.display = "block";
    document.getElementById("alias-input").focus();
});

document.getElementById("cancel-alias-btn")?.addEventListener("click", () => {
    document.getElementById("alias-form").style.display = "none";
});

document.getElementById("alias-edit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alias = document.getElementById("alias-input").value.trim();
    if (!alias) return;
    const res = await fetch(`/api/clients/${mac}/alias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias }),
    });
    if (res.ok) {
        document.getElementById("machine-alias").textContent = alias;
        document.getElementById("alias-form").style.display = "none";
    } else {
        alert("Erro ao salvar nome");
    }
});

document.getElementById("execute-deploy-btn")?.addEventListener("click", () => {
    alert("Execução do deploy em desenvolvimento — em breve!");
});

initDeployModal(() => mac, () => null);
initClipboard();
tryInitialRender();