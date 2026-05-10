import { qs, on, addClass, removeClass } from "./anvil/dom.js";

/**
 * Cria e gerencia um modal genérico.
 * @param {string} overlayId - ID do elemento overlay
 * @param {Object} [opts]
 * @param {Function} [opts.onClose] - Callback executado ao fechar
 * @returns {{ open: Function, close: Function }|null}
 */
export function initModal(overlayId, { onClose } = {}) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return null;

    const close = () => {
        removeClass(overlay, "open");
        onClose?.();
    };

    on(qs(".modal-close", overlay), "click", close);
    on(overlay, "click", (e) => { if (e.target === overlay) close(); });
    on(document, "keydown", (e) => { if (e.key === "Escape") close(); });

    return {
        open:  () => addClass(overlay, "open"),
        close,
    };
}

/**
 * Renderiza um footer padrao de modal com botoes Cancelar e acao primaria.
 * @param {string} confirmId - ID do botao de confirmacao
 * @param {string} confirmLabel - Texto do botao (ex: "Salvar")
 * @param {string} [cancelId="modal-cancel-btn"] - ID do botao cancelar
 * @returns {string} HTML do footer
 */
export function renderModalFooter(confirmId, confirmLabel, cancelId = "modal-cancel-btn") {
    return `
        <div class="modal-footer">
            <button class="btn-small" id="${cancelId}">Cancelar</button>
            <button class="btn-primary" id="${confirmId}">${confirmLabel}</button>
        </div>`;
}