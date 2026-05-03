import { formatBytes } from "../../lib/format.js";
import { renderCpuModal } from "./modals/server-cpu.js";
import { renderRamModal } from "./modals/server-ram.js";
import { renderStorageModal } from "./modals/server-storage.js";

// Modal genérico
const modal = document.getElementById("server-modal");
const modalTitle = document.getElementById("server-modal-title");
const modalBody = document.getElementById("server-modal-body");

document.getElementById("server-modal-close")
    ?.addEventListener("click", () => modal.classList.remove("open"));
modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal?.classList.remove("open");
});

async function openModal(title, endpoint, renderer) {
    modalTitle.textContent = title;
    modalBody.innerHTML = '<span class="loading"><span class="spinner"></span>Carregando…</span>';
    modal.classList.add("open");
    try {
        const res = await fetch(endpoint);
        const data = await res.json();
        modalBody.innerHTML = renderer(data);
    } catch (e) {
        modalBody.innerHTML = `<p class="empty">Erro ao carregar: ${e}</p>`;
    }
}

// Bindings dos botões (i)
document.querySelector("#ss-item-cpu .ss-info-btn")
    ?.addEventListener("click", () => openModal("CPU", "/api/server/cpu", renderCpuModal));
document.querySelector("#ss-item-ram .ss-info-btn")
    ?.addEventListener("click", () => openModal("RAM", "/api/server/ram", renderRamModal));
document.querySelector("#ss-item-hot .ss-info-btn")
    ?.addEventListener("click", () => openModal("Hot Cache", "/api/server/storage", d => renderStorageModal(d.hot_cache, false)));
document.querySelector("#ss-item-cold .ss-info-btn")
    ?.addEventListener("click", () => openModal("Cold Storage", "/api/server/storage", d => renderStorageModal(d.cold_storage, true)));

// Polling de status
function set(id, text, cls = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "ss-value" + (cls ? ` ${cls}` : "");
}

async function updateStatus() {
    try {
        const res = await fetch("/api/server/status");
        if (!res.ok) return;
        const s = await res.json();
        const fmt = (used, total) => ({
            text: `${formatBytes(used)} / ${formatBytes(total)}`,
            pct: total > 0 ? Math.round(used / total * 100) : 0,
        });

        const cpuClass = s.cpu_percent > 90 ? "critical" : s.cpu_percent > 70 ? "warn" : "ok";
        const cpuText = s.cpu_temp !== null
            ? `${s.cpu_percent.toFixed(0)}% · ${s.cpu_temp}°C`
            : `${s.cpu_percent.toFixed(0)}%`;
        set("ss-cpu", cpuText, s.cpu_temp > 85 ? "critical" : s.cpu_temp > 70 ? "warn" : cpuClass);

        const ram = fmt(s.ram.used, s.ram.total);
        set("ss-ram", `${ram.text} (${s.ram.percent}%)`,
            s.ram.percent > 90 ? "critical" : s.ram.percent > 75 ? "warn" : "");

        const hot = fmt(s.hot_cache.used, s.hot_cache.total);
        set("ss-hot", s.hot_cache.error ? "indisponível" : hot.text,
            s.hot_cache.error ? "warn" : hot.pct > 90 ? "critical" : "");

        const cold = fmt(s.cold_storage.used, s.cold_storage.total);
        set("ss-cold", s.cold_storage.error ? "indisponível" : cold.text,
            s.cold_storage.error ? "warn" : cold.pct > 90 ? "critical" : "");

        const raidClass = { healthy: "ok", syncing: "warn", degraded: "critical" };
        set("ss-raid", s.raid_status, raidClass[s.raid_status] || "");
        set("ss-uptime", s.uptime);
    } catch (e) {
        console.warn("[FORGE] status error:", e);
    }
}

export function initServerStatus() {
    updateStatus();
    setInterval(updateStatus, 5000);
}