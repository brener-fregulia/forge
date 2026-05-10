import { qs, qsa, on, toggleClass } from "./anvil/dom.js";

/**
 * Componente de abas reutilizavel.
 * @param {string} containerId - ID do container das abas
 * @param {Object} [opts]
 * @param {Function} [opts.onChange] - Callback ao trocar de aba
 * @param {boolean} [opts.clickable=false] - Permite clicar nas abas diretamente
 * @returns {{ goTo: Function, enable: Function, disable: Function, current: Function }|null}
 */
export function initTabs(containerId, { onChange, clickable = false } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const buttons = qsa(".tab-btn", container);
    const panels  = qsa(".tab-panel", container);
    let currentTab = null;

    function activate(tabId) {
        buttons.forEach(btn => toggleClass(btn, "active", btn.dataset.tab === tabId));
        panels.forEach(panel => toggleClass(panel, "active", panel.dataset.tab === tabId));
        currentTab = tabId;
        onChange?.(tabId);
    }

    if (clickable) {
        buttons.forEach(btn => {
            on(btn, "click", () => {
                if (btn.disabled) return;
                activate(btn.dataset.tab);
            });
        });
    } else {
        buttons.forEach(btn => btn.style.cursor = "default");
    }

    const first = qs(".tab-btn:not(:disabled)", container);
    if (first) activate(first.dataset.tab);

    return {
        goTo:    (tabId) => activate(tabId),
        enable:  (tabId) => { const btn = qs(`.tab-btn[data-tab="${tabId}"]`, container); if (btn) btn.disabled = false; },
        disable: (tabId) => { const btn = qs(`.tab-btn[data-tab="${tabId}"]`, container); if (btn) btn.disabled = true; },
        current: () => currentTab,
    };
}