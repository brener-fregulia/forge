import { qs, on } from "../../lib/anvil/dom.js";
import { el } from "../../lib/anvil/element.js";

let _mac = null;
let _sessions = [];
let _activeIdx = null;

export function fitAll() {
    _sessions.forEach(s => s.fitAddon?.fit());
}

export function initTerminal(mac) {
    _mac = mac;
    on(qs("#terminal-new-btn"), "click", _openSession);
}

async function _openSession() {
    const res  = await fetch(`/api/clients/${_mac}/terminal/open`, { method: "POST" });
    const data = await res.json();
    if (!data.port) return;

    const idx       = _sessions.length;
    const sessionId = `s${idx}`;

    // Cria aba
    const header = qs("#terminal-tabs-header");
    const newBtn = qs("#terminal-new-btn");
    const tabBtn = el("button", { cls: "tab-btn", text: `Terminal ${idx + 1}` });
    on(tabBtn, "click", () => _activateSession(idx));
    header.insertBefore(tabBtn, newBtn);

    // Cria painel
    const panel = el("div", { cls: "terminal-panel" });
    panel.dataset.session = sessionId;
    qs("#terminal-panels").appendChild(panel);

    // Inicializa xterm
    const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "monospace",
        theme: {
            background: "#0d1117",
            foreground: "#c9d1d9",
            cursor:     "#f78166",
        },
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(panel);
    fitAddon.fit();

    // WebSocket de terminal
    const wsUrl = `ws://${location.host}/ws/terminal/${encodeURIComponent(_mac)}/${sessionId}/${data.port}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen  = () => term.write("\r\n\x1b[32mConectado ao terminal\x1b[0m\r\n");
    ws.onclose = () => term.write("\r\n\x1b[31mSessão encerrada\x1b[0m\r\n");
    ws.onerror = (e) => console.error("[terminal] ws erro:", e);

    ws.onmessage = (e) => {
        const bytes = e.data instanceof ArrayBuffer ? new Uint8Array(e.data) : e.data;
        term.write(bytes);
    };

    term.onData(d => {
        if (ws.readyState === WebSocket.OPEN) ws.send(d);
    });

    _sessions.push({ term, ws, fitAddon, tabBtn, panel });
    _activateSession(idx);
}

function _activateSession(idx) {
    _activeIdx = idx;
    _sessions.forEach((s, i) => {
        s.tabBtn.classList.toggle("active", i === idx);
        s.panel.classList.toggle("active",  i === idx);
    });
    // Aguarda o DOM mostrar o painel antes de fazer fit
    requestAnimationFrame(() => {
        _sessions[idx]?.fitAddon.fit();
    });
}