import { initModal } from "../../lib/modal.js";
import { initTabs } from "../../lib/tabs.js";
import { renderDisco, collectDisco } from "./tabs/disco.js";
import { renderSo, collectSo, onSoChange } from "./tabs/so.js";

const TAB_ORDER = ["disco", "backup", "so", "pos"];

export function initConfigDeploy(getMac) {
    const modal = initModal("config-deploy-modal");

    document.getElementById("deploy-btn")
    ?.addEventListener("click", async () => {
        const clientData = await fetch(`/api/clients/${getMac()}`).then(r => r.json());
        renderDisco(clientData.disks, clientData.deploy_plan?.target_disk ?? null);

        const isosData = await fetch("/api/server/isos").then(r => r.json());
        renderSo(isosData.isos, clientData.deploy_plan?.windows_iso ?? null);

        modal.open();
    });

    document.getElementById("config-deploy-cancel")
        ?.addEventListener("click", () => modal.close());

    const prevBtn = document.getElementById("config-deploy-prev");
    const nextBtn = document.getElementById("config-deploy-next");
    const saveBtn = document.getElementById("config-deploy-save");

    const tabs = initTabs("config-deploy-tabs", {
        onChange: (tabId) => updateNav(tabId),
        clickable: false,
    });

    onSoChange((iso) => {
        if (iso !== null) tabs.enable("pos");
        else tabs.disable("pos");
    });

    prevBtn?.addEventListener("click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        if (current > 0) tabs.goTo(TAB_ORDER[current - 1]);
    });

    nextBtn?.addEventListener("click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        const nextTab = TAB_ORDER[current + 1];
        if (!nextTab) return;
        const nextBtn_ = document.querySelector(`.tab-btn[data-tab="${nextTab}"]`);
        if (nextBtn_?.disabled) return;
        tabs.goTo(nextTab);
    });

    function updateNav(tabId) {
        const idx = TAB_ORDER.indexOf(tabId);
        const isFirst = idx === 0;
        const isLast  = idx === TAB_ORDER.length - 1;

        if (prevBtn) prevBtn.style.visibility = isFirst ? "hidden" : "visible";
        if (nextBtn) nextBtn.style.display = isLast ? "none" : "";
        if (saveBtn) saveBtn.style.display = isLast ? "" : "none";
    }
}