// Botões "Copiar" — inicializa todos os .btn-copy da página

export function initClipboard() {
    document.querySelectorAll(".btn-copy").forEach(btn => {
        btn.addEventListener("click", async () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            try {
                await navigator.clipboard.writeText(target.textContent);
                const original = btn.textContent;
                btn.textContent = "Copiado!";
                btn.classList.add("copied");
                setTimeout(() => { btn.textContent = original; btn.classList.remove("copied"); }, 1200);
            } catch (err) {
                alert("Erro ao copiar: " + err);
            }
        });
    });
}