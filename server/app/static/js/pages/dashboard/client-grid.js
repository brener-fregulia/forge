import { createWS } from "../../lib/ws.js";
import { qs, setHtml } from "../../lib/anvil/dom.js";

const grid = qs("#clients-grid");

export function initClientGrid() {
    createWS("/ws/dashboard", {
        snapshot:            ({ clients, devices }) => renderAll(clients, devices),
        client_connected:    ({ client }) => upsertClient(client),
        client_update:       ({ client }) => upsertClient(client),
        client_disconnected: ({ mac })    => removeClient(mac),
        device_update:       ({ device }) => upsertDevice(device),
        device_disconnected: ({ mac })    => removeDevice(mac),
    });
}

function renderAll(clients, devices) {
    setHtml(grid, "");
    clients.forEach(upsertClient);
    (devices || []).forEach(upsertDevice);
    if (!grid.children.length)
        setHtml(grid, '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>');
}

function upsertClient(c) {
    qs(".empty", grid)?.remove();
    // Se havia card de device para este MAC, substitui
    const existing = qs(`[data-mac="${c.mac}"]`, grid);
    const html = renderClientCard(c);
    if (existing) existing.outerHTML = html;
    else grid.insertAdjacentHTML("beforeend", html);
}

function upsertDevice(d) {
    qs(".empty", grid)?.remove();
    // Não sobrescreve se já há um Client ativo com este MAC
    const existing = qs(`[data-mac="${d.mac}"]`, grid);
    if (existing?.classList.contains("client-card")) return;
    const html = renderDeviceCard(d);
    if (existing) existing.outerHTML = html;
    else grid.insertAdjacentHTML("beforeend", html);
}

function removeClient(mac) {
    qs(`[data-mac="${mac}"]`, grid)?.remove();
    _checkEmpty();
}

function removeDevice(mac) {
    qs(`[data-mac="${mac}"]`, grid)?.remove();
    _checkEmpty();
}

function _checkEmpty() {
    if (!grid.children.length)
        setHtml(grid, '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>');
}

function renderClientCard(c) {
    const label = c.alias || c.hostname || "—";
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

function renderDeviceCard(d) {
    const label = d.alias || d.hostname || "—";
    return `
        <div class="client-card device-card" data-mac="${d.mac}">
            <div class="card-header">
                <span class="status status-${d.status}">${d.status}</span>
                <span class="mac">${d.mac}</span>
            </div>
            <div class="card-body">
                <div class="hostname">${label}</div>
                <div class="ip">${d.switch_port || "—"}</div>
            </div>
        </div>`;
}