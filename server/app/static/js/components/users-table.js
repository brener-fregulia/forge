import { formatBytes } from "../lib/format.js";

export function renderUsers(users) {
    const container = document.getElementById("users-rendered");
    if (!container) return;

    if (!users?.length) {
        container.innerHTML = '<p class="empty">Nenhum usuário Windows encontrado.</p>';
        return;
    }

    let html = `<table class="users-table">
        <thead><tr>
            <th>Disco</th><th>Usuário</th><th>Tamanho</th>
        </tr></thead><tbody>`;

    for (const u of users) {
        html += `<tr>
            <td><code>${u.device}</code></td>
            <td>${u.username}</td>
            <td>${formatBytes(u.size)}</td>
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}