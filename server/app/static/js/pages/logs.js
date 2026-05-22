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

const _hidden = {};

function _renderLines(category, lines) {
    const container = qs(`#log-lines-${category}`);
    const countEl   = qs(`#log-count-${category}`);
    if (!container) return;

    const skip    = _hidden[category] ?? 0;
    const visible = lines.slice(skip);
    const prev    = _state[category] ?? 0;

    if (visible.length === prev && prev > 0) return;
    _state[category] = visible.length;

    container.innerHTML = "";
    for (const line of visible) {
        const node = cloneTemplate("log-line-tpl");
        if (!node) continue;
        const el = node.querySelector(".log-line");
        setContent(el, line);
        container.appendChild(node);
    }

    setContent(countEl, String(visible.length));
    container.scrollTop = container.scrollHeight;
}

qsa(".log-clear-btn").forEach(btn => {
    on(btn, "click", () => {
        const category = btn.dataset.category;
        const container = qs(`#log-lines-${category}`);
        const countEl   = qs(`#log-count-${category}`);

        // Marca quantas linhas pular a partir de agora
        _hidden[category] = (_hidden[category] ?? 0) + (_state[category] ?? 0);
        _state[category]  = 0;

        if (container) container.innerHTML = "";
        if (countEl)   setContent(countEl, "0");
    });
});

fetchLogs();
setInterval(fetchLogs, POLL_INTERVAL);