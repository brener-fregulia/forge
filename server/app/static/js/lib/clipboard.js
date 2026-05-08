import { qsa, on, addClass, removeClass } from "./anvil/dom.js";

export function initClipboard() {
    qsa(".btn-copy").forEach(btn => {
        on(btn, "click", async () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            try {
                await navigator.clipboard.writeText(target.textContent);
                const original = btn.textContent;
                btn.textContent = "Copiado!";
                addClass(btn, "copied");
                setTimeout(() => { btn.textContent = original; removeClass(btn, "copied"); }, 1200);
            } catch (err) {
                alert("Erro ao copiar: " + err);
            }
        });
    });
}