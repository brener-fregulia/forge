import { qs, setContent, setHtml, cloneTemplate } from "../lib/anvil/dom.js";
import { formatBytes } from "../lib/format.js";

export function renderUsers(users, driveLetters) {
    const container = qs("#users-rendered");
    if (!container) return;

    if (!users?.length) {
        setHtml(container, '<p class="empty">Nenhum usuário Windows encontrado.</p>');
        return;
    }

    const table = cloneTemplate("users-table-tpl");
    if (!table) return;
    const tbody = table.getElementById("users-tbody");

    for (const u of users) {
        const row = cloneTemplate("user-row-tpl");
        if (!row) continue;
        const entry = (driveLetters || []).find(d => d.device === u.device);
        const deviceLabel = entry
            ? `${entry.letter}: ${entry.label || (entry.letter === "C" ? "Windows" : "Dados")}`
            : u.device;
        setContent(qs(".user-device", row), deviceLabel);
        setContent(qs(".user-name",   row), u.username);
        setContent(qs(".user-size",   row), formatBytes(u.size));
        tbody.appendChild(row);
    }

    setHtml(container, "");
    container.appendChild(table);
}