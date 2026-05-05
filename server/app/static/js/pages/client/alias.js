export function initAlias(mac) {
    document.getElementById("edit-alias-btn")?.addEventListener("click", () => {
        document.getElementById("alias-form").style.display = "block";
        document.getElementById("alias-input").focus();
    });

    document.getElementById("cancel-alias-btn")?.addEventListener("click", () => {
        document.getElementById("alias-form").style.display = "none";
    });

    document.getElementById("alias-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const alias = document.getElementById("alias-input").value.trim();
        if (!alias) return;
        const res = await fetch(`/api/clients/${mac}/alias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias }),
        });
        if (res.ok) {
            document.getElementById("machine-alias").textContent = alias;
            document.getElementById("alias-form").style.display = "none";
        } else {
            alert("Erro ao salvar nome");
        }
    });
}

export function updateAlias(alias) {
    const el = document.getElementById("machine-alias");
    if (el && alias) el.textContent = alias;
}