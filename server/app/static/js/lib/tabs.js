/**
 * Componente de abas reutilizavel.
 *
 * Uso:
 *   const tabs = initTabs("meu-container", { onChange: (id) => ... });
 *   tabs.goTo("disco");
 *   tabs.enable("pos");
 *   tabs.disable("pos");
 */
export function initTabs(containerId, { onChange, clickable = false } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const buttons = container.querySelectorAll(".tab-btn");
    const panels  = container.querySelectorAll(".tab-panel");
    let currentTab = null;

    function activate(tabId) {
        buttons.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
        panels.forEach(panel => panel.classList.toggle("active", panel.dataset.tab === tabId));
        currentTab = tabId;
        onChange?.(tabId);
    }

    if (clickable) {
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.disabled) return;
                activate(btn.dataset.tab);
            });
        });
    } else {
        // Remove cursor pointer das abas quando nao clicavel
        buttons.forEach(btn => btn.style.cursor = "default");
    }

    // Ativa a primeira aba por padrao
    const first = container.querySelector(".tab-btn:not(:disabled)");
    if (first) activate(first.dataset.tab);

    return {
        goTo:    (tabId) => activate(tabId),
        enable:  (tabId) => {
            const btn = container.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (btn) btn.disabled = false;
        },
        disable: (tabId) => {
            const btn = container.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (btn) btn.disabled = true;
        },
        current: () => currentTab,
    };
}