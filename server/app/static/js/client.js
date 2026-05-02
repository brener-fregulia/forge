// FORGE Client Detail — atualizações em tempo real e envio de comandos

const mac = window.CLIENT_MAC;
const ws = new WebSocket(`ws://${location.host}/ws/dashboard`);

const els = {
    hw: document.getElementById("hw"),
    disks: document.getElementById("disks"),
    users: document.getElementById("users"),
    log: document.getElementById("log"),
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if ((msg.type === "client_update" || msg.type === "client_connected") && msg.mac === mac) {
        const c = msg.client;
        els.hw.textContent = JSON.stringify(c.hardware, null, 2);
        els.disks.textContent = JSON.stringify(c.disks, null, 2);
        els.users.textContent = JSON.stringify(c.users, null, 2);
        els.log.textContent = (c.log_tail || []).join("\n");
    }
};

document.getElementById("cmd-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("cmd-input");
    const cmd = input.value.trim();
    if (!cmd) return;

    const res = await fetch(`/api/clients/${mac}/command`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({command: cmd}),
    });

    if (res.ok) {
        input.value = "";
    } else {
        alert("Erro ao enviar comando: " + (await res.text()));
    }
});