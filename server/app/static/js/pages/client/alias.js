import { qs, on, show, hide, setContent } from "../../lib/anvil/dom.js";

export function initAlias(mac) {
    on(qs("#edit-alias-btn"), "click", () => {
        show(qs("#alias-form"));
        qs("#alias-input")?.focus();
    });

    on(qs("#cancel-alias-btn"), "click", () => {
        hide(qs("#alias-form"));
    });

    on(qs("#alias-edit-form"), "submit", async (e) => {
        e.preventDefault();
        const alias = qs("#alias-input")?.value.trim();
        if (!alias) return;
        const res = await fetch(`/api/clients/${mac}/alias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias }),
        });
        if (res.ok) {
            setContent(qs("#machine-alias"), alias);
            hide(qs("#alias-form"));
        } else {
            alert("Erro ao salvar nome");
        }
    });
}

export function updateAlias(alias) {
    if (!alias) return;
    setContent(qs("#machine-alias"), alias);
    const input = qs("#alias-input");
    if (input && !input.value) input.value = alias;
}