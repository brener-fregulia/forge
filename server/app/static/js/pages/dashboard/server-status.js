import { qs, on, show, hide, setContent, setHtml, addClass, removeClass } from "../../lib/anvil/dom.js";
import { formatBytes } from "../../lib/format.js";
import { renderCpuModal } from "./modals/server-cpu.js";
import { renderRamModal } from "./modals/server-ram.js";
import { renderStorageModal } from "./modals/server-storage.js";
import { initSmartModal } from "../../components/smart-modal.js";

// Modal genérico
const modal     = qs("#server-modal");
const modalTitle = qs("#server-modal-title");
const modalBody  = qs("#server-modal-body");

on(qs("#server-modal-close"), "click", () => removeClass(modal, "open"));
on(modal, "click", (e) => { if (e.target === modal) removeClass(modal, "open"); });
on(document, "keydown", (e) => { if (e.key === "Escape") removeClass(modal, "open"); });

async function openModal(title, endpoint, renderer) {
    setContent(modalTitle, title);
    setHtml(modalBody, '<span class="loading"><span class="spinner"></span>Carregando…</span>');
    addClass(modal, "open");
    try {
        const res    = await fetch(endpoint);
        const data   = await res.json();
        const result = renderer(data);
        modalBody.innerHTML = "";
        if (typeof result === "string") modalBody.innerHTML = result;
        else modalBody.appendChild(result);
    } catch (e) {
        setHtml(modalBody, `<p class="empty">Erro ao carregar: ${e}</p>`);
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
            _setStorage("ss-item-hot", s.hot_cache.used, s.hot_cache.total, s.hot_cache.error);
        }

        // Cold Storage
        const coldItem = qs("#ss-item-cold");
        if (coldItem) _toggleDisplay(coldItem, mode === "hot_cold_raid");
        if (mode === "hot_cold_raid" && s.cold_storage) {
            _setStorage("ss-item-cold", s.cold_storage.used, s.cold_storage.total, s.cold_storage.error);
        }

        // RAID
        const raidItem = qs("#ss-item-raid");
        if (raidItem) _toggleDisplay(raidItem, mode === "hot_cold_raid");
        if (mode === "hot_cold_raid" && s.cold_storage) {
            _setStorage("ss-item-cold", s.cold_storage.used, s.cold_storage.total, s.cold_storage.error);
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

// discos fixos ainda - trazer de config futuramente
const IO_DISKS = {
    "ss-item-hot":  ["sda"],
    "ss-item-cold": ["md127"],
};

let _ioInterval = null;

async function _updateDiskIO() {
    const allDisks = [...IO_DISKS["ss-item-hot"], ...IO_DISKS["ss-item-cold"]];
    try {
        const res  = await fetch(`/api/server/disk-io?disks=${allDisks.join(",")}`);
        const data = await res.json();

        for (const [itemId, disks] of Object.entries(IO_DISKS)) {
            const item = qs(`#${itemId}`);
            if (!item) continue;

            // Soma MB/s de todos os discos do grupo
            const total_mb  = disks.reduce((sum, d) => sum + (data[d]?.total_mb ?? 0), 0);
            const read_mb   = disks.reduce((sum, d) => sum + (data[d]?.read_mb  ?? 0), 0);
            const write_mb  = disks.reduce((sum, d) => sum + (data[d]?.write_mb ?? 0), 0);
            const pct       = Math.max(...disks.map(d => data[d]?.pct ?? 0));
            const ceiling   = data[disks[0]]?.ceiling ?? 150;

            // Atualiza sublabel com MB/s
            let sublabel = qs(".ss-sublabel", item);
            if (!sublabel) {
                sublabel = document.createElement("span");
                sublabel.className = "ss-sublabel";
                item.appendChild(sublabel);
            }
            setContent(sublabel, `↑${write_mb.toFixed(1)} ↓${read_mb.toFixed(1)} MB/s`);

            // Atualiza barra
            _setIOBar(item, pct);
        }
    } catch (e) {
        console.warn("[FORGE] disk-io error:", e);
    }
}

function _setIOBar(item, pct) {
    const cls = pct > 90 ? "critical" : pct > 60 ? "warn" : "ok";
    let bar = qs(".ss-storage-bar", item);
    if (!bar) {
        bar = document.createElement("div");
        bar.className = "ss-storage-bar";
        const fill = document.createElement("div");
        fill.className = "ss-storage-fill";
        bar.appendChild(fill);
        item.appendChild(bar);
    }
    const fill = qs(".ss-storage-fill", bar);
    if (fill) {
        fill.style.width = `${pct}%`;
        fill.className   = `ss-storage-fill ${cls}`;
    }
}

export function initServerStatus() {
    updateStatus();
    setInterval(updateStatus, 5000);
    _updateDiskIO();
    setInterval(_updateDiskIO, 1000);
}