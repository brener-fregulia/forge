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

document.getElementById("clear-log-btn").addEventListener("click", async () => {
    if (!confirm("Limpar o log deste cliente?")) return;
    const res = await fetch(`/api/clients/${mac}/log/clear`, {method: "POST"});
    if (!res.ok) alert("Erro ao limpar log");
});

// Botões "Copiar" — copia conteúdo do <pre> alvo para o clipboard
document.querySelectorAll(".btn-copy").forEach(btn => {
    btn.addEventListener("click", async () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        if (!target) return;

        try {
            await navigator.clipboard.writeText(target.textContent);
            const originalText = btn.textContent;
            btn.textContent = "Copiado!";
            btn.classList.add("copied");
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove("copied");
            }, 1200);
        } catch (err) {
            alert("Erro ao copiar: " + err);
        }
    });
});