import { createWS } from "./lib/ws.js";
import { formatBytes } from "./lib/format.js";

const grid = document.getElementById("clients-grid");

createWS("/ws/dashboard", {
    snapshot:           ({ clients }) => renderAll(clients),
    client_connected:   ({ client }) => upsertClient(client),
    client_update:      ({ client }) => upsertClient(client),
    client_disconnected:({ mac })    => removeClient(mac),
});

function renderAll(clients) {
    grid.innerHTML = "";
    if (!clients.length) {
        grid.innerHTML = '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>';
        return;
    }
    clients.forEach(upsertClient);
}

function upsertClient(c) {
    grid.querySelector(".empty")?.remove();
    const existing = grid.querySelector(`[data-mac="${c.mac}"]`);
    const html = renderCard(c);
    if (existing) existing.outerHTML = html;
    else grid.insertAdjacentHTML("beforeend", html);
}

function removeClient(mac) {
    grid.querySelector(`[data-mac="${mac}"]`)?.remove();
    if (!grid.children.length) {
        grid.innerHTML = '<p class="empty">Nenhum cliente conectado. Aguardando boot PXE…</p>';
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

// Status do servidor — atualiza a cada 5s
async function updateServerStatus() {
    try {
        const res = await fetch("/api/server/status");
        if (!res.ok) return;
        const s = await res.json();

        const fmt = (used, total) => {
            const u = formatBytes(used);
            const t = formatBytes(total);
            const pct = total > 0 ? Math.round(used / total * 100) : 0;
            return { text: `${u} / ${t}`, pct };
        };

        set("ss-cpu", `${s.cpu_percent.toFixed(0)}%`,
            s.cpu_percent > 90 ? "critical" : s.cpu_percent > 70 ? "warn" : "ok");
        if (s.cpu_temp !== null) {
            const tempClass = s.cpu_temp > 85 ? "critical" : s.cpu_temp > 70 ? "warn" : "ok";
            set("ss-cpu", `${s.cpu_percent.toFixed(0)}% · ${s.cpu_temp}°C`, tempClass);
        }

        const ram = fmt(s.ram.used, s.ram.total);
        set("ss-ram", `${ram.text} (${s.ram.percent}%)`,
            s.ram.percent > 90 ? "critical" : s.ram.percent > 75 ? "warn" : "");

        const hot = fmt(s.hot_cache.used, s.hot_cache.total);
        set("ss-hot", s.hot_cache.error ? "indisponível" : `${hot.text}`,
            s.hot_cache.error ? "warn" : hot.pct > 90 ? "critical" : "");

        const cold = fmt(s.cold_storage.used, s.cold_storage.total);
        set("ss-cold", s.cold_storage.error ? "indisponível" : `${cold.text}`,
            s.cold_storage.error ? "warn" : cold.pct > 90 ? "critical" : "");

        const raidClass = { healthy: "ok", syncing: "warn", degraded: "critical" };
        set("ss-raid", s.raid_status, raidClass[s.raid_status] || "");

        set("ss-uptime", s.uptime);
    } catch (e) {
        console.warn("[FORGE] Erro ao buscar status do servidor:", e);
    }
}

function set(id, text, cls = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "ss-value" + (cls ? ` ${cls}` : "");
}

updateServerStatus();
setInterval(updateServerStatus, 5000);