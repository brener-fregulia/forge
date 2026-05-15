import { qs, on } from "../../lib/anvil/dom.js";

export function initCommand(mac) {
    const form  = qs("#cmd-form");
    const input = qs("#cmd-input");
    on(form, "submit", async (e) => {
        e.preventDefault();
        const cmd = input.value.trim();
        if (!cmd) return;
        try {
            const res = await fetch(`/api/clients/${mac}/command/exec`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ command: cmd }),
            });
            if (res.ok) input.value = "";
            else alert("Erro: " + await res.text());
        } catch (err) {
            console.error("[cmd] erro:", err);
        }
    });
}