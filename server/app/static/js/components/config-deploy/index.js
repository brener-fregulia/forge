import { initModal } from "../../lib/modal.js";
import { initTabs } from "../../lib/tabs.js";
import { renderDisco, collectDisco } from "./tabs/disco.js";
import { renderBackup, collectBackup, initBackup } from "./tabs/backup.js";
import { renderSo, collectSo, onSoChange } from "./tabs/so.js";
import { renderPos, collectPos } from "./tabs/pos.js";

const TAB_ORDER = ["disco", "backup", "so", "pos"];

export function initConfigDeploy(getMac) {
    const modal = initModal("config-deploy-modal");

    document.getElementById("deploy-btn")
        ?.addEventListener("click", async () => {
            const [clientData, isosData] = await Promise.all([
                fetch(`/api/clients/${getMac()}`).then(r => r.json()),
                fetch("/api/server/isos").then(r => r.json()),
            ]);

            initBackup(getMac());

            renderDisco(clientData.disks, clientData.deploy_plan?.target_disk ?? null, clientData.drive_letters);
            renderBackup(clientData.deploy_plan, clientData.drive_letters);
            renderSo(isosData.isos, clientData.deploy_plan ? clientData.deploy_plan.windows_iso : undefined);
            renderPos(clientData.deploy_plan);

            console.log(clientData.drive_letters)

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

    prevBtn?.addEventListener("click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        if (current > 0) tabs.goTo(TAB_ORDER[current - 1]);
    });

    nextBtn?.addEventListener("click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        const nextTab = TAB_ORDER[current + 1];
        if (!nextTab) return;
        const nextTabBtn = document.querySelector(`.tab-btn[data-tab="${nextTab}"]`);
        if (nextTabBtn?.disabled) return;
        tabs.goTo(nextTab);
    });

    onSoChange((value) => {
        const isIso = value && value !== "";
        tabs[isIso ? "enable" : "disable"]("pos");
        updateNav("so");
    });

    saveBtn?.addEventListener("click", async () => {
        const target_disk = collectDisco();
        if (!target_disk) { alert("Selecione um disco alvo"); return; }

        const windows_iso = collectSo();
        if (windows_iso === undefined) { alert("Selecione uma opção em Instalação SO"); return; }

        const plan = {
            target_disk,
            windows_iso,
            ...collectBackup(),
            ...collectPos(),
            backup_users: [],
            backup_root: false,
        };

        const res = await fetch(`/api/clients/${getMac()}/deploy/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plan),
        });

        if (res.ok) {
            modal.close();
            const execBtn = document.getElementById("execute-deploy-btn");
            if (execBtn) execBtn.disabled = false;
        } else {
            alert("Erro ao salvar plano");
        }
    });

    function updateNav(tabId) {
        const idx     = TAB_ORDER.indexOf(tabId);
        const isFirst = idx === 0;
        const isLast  = idx === TAB_ORDER.length - 1;
        const soVal   = collectSo();
        const soOk    = soVal !== undefined;

        if (prevBtn) prevBtn.disabled = isFirst;
        if (nextBtn) nextBtn.disabled = isLast || (tabId === "so" && !soOk) ||
            (tabId === "so" && soVal === null);
        const canSave = (isLast && soOk) || (tabId === "so" && soVal === null);
        if (saveBtn) saveBtn.disabled = !canSave;
    }
}