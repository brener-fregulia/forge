import { formatBytes } from "../lib/format.js";

export function renderUsers(users, driveLetters) {
    const container = document.getElementById("users-rendered");
    if (!container) return;

    if (!users?.length) {
        container.innerHTML = '<p class="empty">Nenhum usuário Windows encontrado.</p>';
        return;
    }

    // Clona template da tabela
    const tableTpl = document.getElementById("users-table-tpl");
    const table = tableTpl.content.cloneNode(true);
    const tbody = table.getElementById("users-tbody");

    // Clona template de linha para cada usuário
    const rowTpl = document.getElementById("user-row-tpl");
    for (const u of users) {
        const row = rowTpl.content.cloneNode(true);
        const entry = (driveLetters || []).find(d => d.device === u.device);
        const deviceLabel = entry
            ? `${entry.letter}: ${entry.label || (entry.letter === "C" ? "Windows" : "Dados")}`
            : u.device;
        row.querySelector(".user-device").textContent = deviceLabel;
        row.querySelector(".user-name").textContent = u.username;
        row.querySelector(".user-size").textContent = formatBytes(u.size);
        tbody.appendChild(row);
    }

    container.innerHTML = "";
    container.appendChild(table);
}