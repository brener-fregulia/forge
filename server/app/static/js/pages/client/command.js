import { qs, on } from "../../lib/anvil/dom.js";

export function initCommand(mac) {
    const form  = qs("#cmd-form");
    const input = qs("#cmd-input");
    on(form, "submit", async (e) => {
        e.preventDefault();
        const cmd = input.value.trim();
        if (!cmd) return;
        const res = await fetch(`/api/clients/${mac}/command`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ command: cmd }),
        });
        if (res.ok) input.value = "";
        else alert("Erro ao enviar comando: " + await res.text());
    });
}