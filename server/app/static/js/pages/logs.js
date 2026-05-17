import { qs, qsa, on, setContent, cloneTemplate } from "../lib/anvil/dom.js";

const POLL_INTERVAL = 2000;
const _state = {};

async function fetchLogs() {
    try {
        const res  = await fetch("/api/server/logs");
        const data = await res.json();
        for (const [category, lines] of Object.entries(data)) {
            _renderLines(category, lines);
        }
    } catch (e) {
        console.error("[logs] erro:", e);
    }
}

function _renderLines(category, lines) {
    const container = qs(`#log-lines-${category}`);
    const countEl   = qs(`#log-count-${category}`);
    if (!container) return;

    const prev = _state[category] ?? 0;
    if (lines.length === prev && prev > 0) return;
    _state[category] = lines.length;

    container.innerHTML = "";
    for (const line of lines) {
        const node = cloneTemplate("log-line-tpl");
        if (!node) continue;
        const el = node.querySelector(".log-line");
        setContent(el, line);
        container.appendChild(node);
    }

    setContent(countEl, String(lines.length));
    container.scrollTop = container.scrollHeight;
}

// Limpar categoria localmente (não persiste no servidor)
qsa(".log-clear-btn").forEach(btn => {
    on(btn, "click", () => {
        const category = btn.dataset.category;
        const container = qs(`#log-lines-${category}`);
        const countEl   = qs(`#log-count-${category}`);
        if (container) container.innerHTML = "";
        if (countEl)   setContent(countEl, "0");
        _state[category] = 0;
    });
});

fetchLogs();
setInterval(fetchLogs, POLL_INTERVAL);