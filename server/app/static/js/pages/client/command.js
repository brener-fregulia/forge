export function initCommand(mac) {
    document.getElementById("cmd-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("cmd-input");
        const cmd = input.value.trim();
        if (!cmd) return;
        const res = await fetch(`/api/clients/${mac}/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: cmd }),
        });
        if (res.ok) input.value = "";
        else alert("Erro ao enviar comando: " + await res.text());
    });
}