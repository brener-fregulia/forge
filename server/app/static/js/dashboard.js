// FORGE Dashboard — atualizações em tempo real via WebSocket

const ws = new WebSocket(`ws://${location.host}/ws/dashboard`);
const grid = document.getElementById("clients-grid");

ws.onopen = () => console.log("[FORGE] Dashboard WS conectado");
ws.onclose = () => console.log("[FORGE] Dashboard WS desconectado");
ws.onerror = (e) => console.error("[FORGE] WS erro:", e);

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "snapshot") {
        renderAll(msg.clients);
    } else if (msg.type === "client_connected" || msg.type === "client_update") {
        upsertClient(msg.client);
    } else if (msg.type === "client_disconnected") {
        removeClient(msg.mac);
    }
};

function renderAll(clients) {
    grid.innerHTML = "";
    if (!clients.length) {
        grid.innerHTML = '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>';
        return;
    }
    clients.forEach(upsertClient);
}

function upsertClient(c) {
    const empty = grid.querySelector(".empty");
    if (empty) empty.remove();

    const existing = grid.querySelector(`[data-mac="${c.mac}"]`);
    const html = renderCard(c);
    if (existing) {
        existing.outerHTML = html;
    } else {
        grid.insertAdjacentHTML("beforeend", html);
    }
}

function removeClient(mac) {
    const card = grid.querySelector(`[data-mac="${mac}"]`);
    if (card) card.remove();
    if (!grid.children.length) {
        grid.innerHTML = '<p class="empty" id="empty-state">Nenhum cliente conectado. Aguardando boot PXE…</p>';
    }
}

function renderCard(c) {
    return `
        <a href="/client/${c.mac}" class="client-card" data-mac="${c.mac}">
            <div class="card-header">
                <span class="status status-${c.status}">${c.status}</span>
                <span class="mac">${c.mac}</span>
            </div>
            <div class="card-body">
                <div class="hostname">${c.hostname || "—"}</div>
                <div class="ip">${c.ip}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${c.progress}%"></div>
                </div>
            </div>
        </a>
    `;
}