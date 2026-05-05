export function initLog(mac) {
    document.getElementById("clear-log-btn")?.addEventListener("click", async () => {
        if (!confirm("Limpar o log deste cliente?")) return;
        const res = await fetch(`/api/clients/${mac}/log/clear`, { method: "POST" });
        if (!res.ok) alert("Erro ao limpar log");
    });
}

export function updateLog(logTail, el) {
    const newLog = (logTail || []).join("\n");
    if (el.textContent !== newLog) el.textContent = newLog;
}