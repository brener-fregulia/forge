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
            <th><input type="checkbox" id="select-all-users" checked title="Selecionar todos"></th>
            <th>Disco</th><th>Usuário</th><th>Tamanho</th>
        </tr></thead><tbody>`;

    for (const u of users) {
        html += `<tr>
            <td><input type="checkbox" class="user-select" data-device="${u.device}" data-username="${u.username}" checked></td>
            <td><code>${u.device}</code></td>
            <td>${u.username}</td>
            <td>${formatBytes(u.size)}</td>
        </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;

    // Selecionar todos
    document.getElementById("select-all-users")?.addEventListener("change", (e) => {
        document.querySelectorAll(".user-select").forEach(cb => cb.checked = e.target.checked);
    });
}

export function getSelectedUsers() {
    return [...document.querySelectorAll(".user-select:checked")].map(cb => ({
        device: cb.dataset.device,
        username: cb.dataset.username,
    }));
}