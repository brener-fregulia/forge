import { createWS } from "./lib/ws.js";
import { initClipboard } from "./lib/clipboard.js";
import { renderDisks, tryInitialRender, initSmartModal } from "./components/disks-table.js";

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
});

function updateClient(c) {
    els.hw.textContent    = JSON.stringify(c.hardware, null, 2);
    els.disks.textContent = JSON.stringify(c.disks, null, 2);
    els.users.textContent = JSON.stringify(c.users, null, 2);
    els.log.textContent   = (c.log_tail || []).join("\n");
    renderDisks(c.disks, c.smart);
    initSmartModal(c.smart);
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

initClipboard();
tryInitialRender();
// Inicializa modal com smart vazio (será preenchido no primeiro update)
initSmartModal({});