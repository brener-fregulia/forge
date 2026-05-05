/**
 * Cria e gerencia um modal genérico.
 * @param {string} overlayId - ID do elemento overlay
 * @param {Object} opts - opções
 */
export function initModal(overlayId, { onClose } = {}) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return null;

    const close = () => {
        overlay.classList.remove("open");
        onClose?.();
    };

    overlay.querySelector(".modal-close")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    return {
        open: () => overlay.classList.add("open"),
        close,
    };
}

/**
 * Renderiza um footer padrão de modal com botões Cancelar e ação primária.
 * @param {string} confirmId - ID do botão de confirmação
 * @param {string} confirmLabel - texto do botão (ex: "💾 Salvar")
 * @param {string} cancelId - ID do botão cancelar
 */
export function renderModalFooter(confirmId, confirmLabel, cancelId = "modal-cancel-btn") {
    return `
        <div class="modal-footer">
            <button class="btn-small" id="${cancelId}">Cancelar</button>
            <button class="btn-primary" id="${confirmId}">${confirmLabel}</button>
        </div>`;
}