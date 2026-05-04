import { createWS } from "../../lib/ws.js";

const grid = document.getElementById("clients-grid");

export function initClientGrid() {
    createWS("/ws/dashboard", {
        snapshot:            ({ clients }) => renderAll(clients),
        client_connected:    ({ client }) => upsertClient(client),
        client_update:       ({ client }) => upsertClient(client),
        client_disconnected: ({ mac })    => removeClient(mac),
    });
}

function renderAll(clients) {
    if (!clients.length) return;
    grid.innerHTML = "";
    clients.forEach(upsertClient);
}

function upsertClient(c) {
    grid.querySelector(".empty")?.remove();
    const existing = grid.querySelector(`[data-mac="${c.mac}"]`);
    const label = c.alias || c.hostname || "—";
    const html = renderCard(c, label);
    if (existing) existing.outerHTML = html;
    else grid.insertAdjacentHTML("beforeend", html);
}

function removeClient(mac) {
    grid.querySelector(`[data-mac="${mac}"]`)?.remove();
    if (!grid.children.length)
        grid.innerHTML = '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>';
}

function renderCard(c, label) {
    return `
        <a href="/client/${c.mac}" class="client-card" data-mac="${c.mac}">
            <div class="card-header">
                <span class="status status-${c.status}">${c.status}</span>
                <span class="mac">${c.mac}</span>
            </div>
            <div class="card-body">
                <div class="hostname">${label}</div>
                <div class="ip">${c.ip}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${c.progress}%"></div>
                </div>
            </div>
        </a>`;
}