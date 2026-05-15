import { qs, on, setContent } from "../../lib/anvil/dom.js";

export function initLog(mac) {
    on(qs("#clear-log-btn"), "click", async () => {
        if (!confirm("Limpar o log deste cliente?")) return;
        const res = await fetch(`/api/clients/${mac}/log/clear`, { method: "POST" });
        if (!res.ok) alert("Erro ao limpar log");
    });
}

export function updateLog(logTail, el) {
    const newLog = (logTail || []).join("\n");
    setContent(el, newLog);
}