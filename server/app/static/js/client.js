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
        renderDisks(c.disks, c.smart);
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

// Renderiza discos em tabela amigável
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "—";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let n = Number(bytes);
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    return n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2) + " " + units[i];
}

function renderDisks(disks, smart) {
    const container = document.getElementById("disks-rendered");
    if (!container) return;
    if (!disks || !disks.length) {
        container.innerHTML = '<p class="empty">Nenhum disco detectado.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Nome</th><th>Tipo</th><th>Tamanho</th><th>Filesystem</th><th>Saúde</th><th>Identificação</th></tr></thead><tbody>';
    for (const d of disks) {
        const isPart = d.type === "part";
        const cls = isPart ? "disk-part" : "disk-main";

        const fs = d.fstype || "";
        const fsClass = fs === "ntfs" ? "fs-ntfs" : (fs ? "fs-other" : "");
        const fsBadge = fs ? `<span class="fs-badge ${fsClass}">${fs}</span>` : "—";

        // Saúde SMART (apenas discos físicos)
        let health = "—";
        if (!isPart && smart && smart[d.name]) {
            const s = smart[d.name];
            const passed = s.smart_status?.passed;
            const tempCurrent = s.temperature?.current;
            if (passed === true) {
                health = `<span class="health-badge health-ok">OK</span>`;
            } else if (passed === false) {
                health = `<span class="health-badge health-fail">FAIL</span>`;
            } else {
                health = `<span class="health-badge health-unknown">?</span>`;
            }
            if (tempCurrent != null) {
                health += ` <span class="health-temp">${tempCurrent}°C</span>`;
            }
        }

        // Identificação
        let ident = "—";
        if (!isPart) {
            const parts = [];
            if (d.vendor) parts.push(d.vendor.trim());
            if (d.model) parts.push(d.model.trim());
            const head = parts.join(" ") || "—";
            const serial = d.serial ? `<div class="disk-serial">SN: <code>${d.serial}</code></div>` : "";
            ident = `<div>${head}</div>${serial}`;
        }

        html += `<tr class="${cls}">
            <td><code>${d.name}</code></td>
            <td>${d.type}</td>
            <td>${formatBytes(d.size)}</td>
            <td>${fsBadge}</td>
            <td>${health}</td>
            <td>${ident}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Renderiza ao carregar e a cada update
function tryInitialRender() {
    try {
        const disksRaw = document.getElementById("disks").textContent.trim();
        if (!disksRaw) return;
        // Pode vir como Python repr (aspas simples) ou JSON — tenta JSON primeiro
        let disks;
        try {
            disks = JSON.parse(disksRaw);
        } catch {
            disks = JSON.parse(disksRaw.replace(/'/g, '"'));
        }
        // No render inicial, smart vem do server, então só pega via WebSocket update
        renderDisks(disks, {});
    } catch (e) {
        console.warn("Erro ao renderizar discos iniciais:", e);
    }
}
tryInitialRender();