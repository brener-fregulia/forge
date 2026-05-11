import { qs, on, show, hide, setContent, addClass, removeClass } from "../../lib/anvil/dom.js";
import { formatBytes } from "../../lib/format.js";
import { renderCpuModal } from "./modals/server-cpu.js";
import { renderRamModal } from "./modals/server-ram.js";
import { renderStorageModal } from "./modals/server-storage.js";

// Modal genérico
const modal     = qs("#server-modal");
const modalTitle = qs("#server-modal-title");
const modalBody  = qs("#server-modal-body");

on(qs("#server-modal-close"), "click", () => removeClass(modal, "open"));
on(modal, "click", (e) => { if (e.target === modal) removeClass(modal, "open"); });
on(document, "keydown", (e) => { if (e.key === "Escape") removeClass(modal, "open"); });

async function openModal(title, endpoint, renderer) {
    setContent(modalTitle, title);
    modalBody.innerHTML = '<span class="loading"><span class="spinner"></span>Carregando…</span>';
    addClass(modal, "open");
    try {
        const res  = await fetch(endpoint);
        const data = await res.json();
        
        const result = renderer(data);
        modalBody.innerHTML = "";
        if (typeof result === "string") modalBody.innerHTML = result;
        else modalBody.appendChild(result);
    } catch (e) {
        modalBody.innerHTML = `<p class="empty">Erro ao carregar: ${e}</p>`;
    }
}

// Bindings dos botões (i)
on(qs("#ss-item-cpu .ss-info-btn"),  "click", () => openModal("CPU",          "/api/server/cpu",     renderCpuModal));
on(qs("#ss-item-ram .ss-info-btn"),  "click", () => openModal("RAM",          "/api/server/ram",     renderRamModal));
on(qs("#ss-item-hot .ss-info-btn"),  "click", () => openModal("Hot Cache",    "/api/server/storage", d => renderStorageModal(d.hot_cache,    false)));
on(qs("#ss-item-cold .ss-info-btn"), "click", () => openModal("Cold Storage", "/api/server/storage", d => renderStorageModal(d.cold_storage, true)));

// Polling de status
function set(id, text, cls = "") {
    const el = qs(`#${id}`);
    if (!el) return;
    setContent(el, text);
    el.className = "ss-value" + (cls ? ` ${cls}` : "");
}

async function updateStatus() {
    try {
        const res = await fetch("/api/server/status");
        if (!res.ok) return;
        const s = await res.json();

        const fmt = (used, total) => ({
            text: `${formatBytes(used)} / ${formatBytes(total)}`,
            pct:  total > 0 ? Math.round(used / total * 100) : 0,
        });

        // CPU
        const cpuClass = s.cpu_percent > 90 ? "critical" : s.cpu_percent > 70 ? "warn" : "ok";
        const cpuText  = s.cpu_temp !== null
            ? `${s.cpu_percent.toFixed(0)}% · ${s.cpu_temp}°C`
            : `${s.cpu_percent.toFixed(0)}%`;
        set("ss-cpu", cpuText, s.cpu_temp > 85 ? "critical" : s.cpu_temp > 70 ? "warn" : cpuClass);

        const cpuName = qs("#ss-cpu-name");
        if (cpuName && s.cpu_name) setContent(cpuName, s.cpu_name);

        // RAM
        const ram = fmt(s.ram.used, s.ram.total);
        set("ss-ram", `${ram.text} (${s.ram.percent}%)`,
            s.ram.percent > 90 ? "critical" : s.ram.percent > 75 ? "warn" : "");

        const mode = s.storage_mode ?? "hot_cold_raid";

        // Hot Cache
        const hotItem = qs("#ss-item-hot");
        if (hotItem) _toggleDisplay(hotItem, mode !== "simple");
        if (mode !== "simple" && s.hot_cache) {
            const hot = fmt(s.hot_cache.used, s.hot_cache.total);
            set("ss-hot", s.hot_cache.error ? "indisponível" : hot.text,
                s.hot_cache.error ? "warn" : hot.pct > 90 ? "critical" : "");
        }

        // Cold Storage
        const coldItem = qs("#ss-item-cold");
        if (coldItem) _toggleDisplay(coldItem, mode === "hot_cold_raid");
        if (mode === "hot_cold_raid" && s.cold_storage) {
            const cold = fmt(s.cold_storage.used, s.cold_storage.total);
            set("ss-cold", s.cold_storage.error ? "indisponível" : cold.text,
                s.cold_storage.error ? "warn" : cold.pct > 90 ? "critical" : "");
        }

        // RAID
        const raidItem = qs("#ss-item-raid");
        if (raidItem) _toggleDisplay(raidItem, mode === "hot_cold_raid");
        if (mode === "hot_cold_raid") {
            const raidClass = { healthy: "ok", syncing: "warn", degraded: "critical" };
            set("ss-raid", s.raid_status, raidClass[s.raid_status] || "");
        }

        // Uptime
        set("ss-uptime", s.uptime);

    } catch (e) {
        console.warn("[FORGE] status error:", e);
    }
}

/** show/hide por booleano — toggle sem importar toggle do dom.js para evitar conflito de nome */
function _toggleDisplay(el, visible) {
    if (visible) show(el); else hide(el);
}

export function initServerStatus() {
    updateStatus();
    setInterval(updateStatus, 5000);
}