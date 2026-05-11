import { qs, on, enable, disable } from "../../../../lib/anvil/dom.js";
import { initModal } from "../../../../lib/modal.js";
import { initTabs } from "../../../../lib/tabs.js";
import { renderDisco, collectDisco } from "./tabs/disco.js";
import { renderBackup, collectBackup, initBackup } from "./tabs/backup.js";
import { renderSo, collectSo, onSoChange } from "./tabs/so.js";
import { renderPos, collectPos } from "./tabs/pos.js";

const TAB_ORDER = ["disco", "backup", "so", "pos"];

export function initConfigDeploy(getMac) {
    const modal = initModal("config-deploy-modal");

    on(qs("#deploy-btn"), "click", async () => {
        const [clientData, isosData] = await Promise.all([
            fetch(`/api/clients/${getMac()}`).then(r => r.json()),
            fetch("/api/server/isos").then(r => r.json()),
        ]);

        initBackup(getMac());

        renderDisco(clientData.disks, clientData.deploy_plan?.target_disk ?? null, clientData.drive_letters);
        renderBackup(clientData.deploy_plan, clientData.drive_letters);
        renderSo(isosData.isos, clientData.deploy_plan ? clientData.deploy_plan.windows_iso : undefined);
        renderPos(clientData.deploy_plan);

        console.log(clientData.drive_letters);

        modal.open();
    });

    on(qs("#config-deploy-cancel"), "click", () => modal.close());

    const prevBtn = qs("#config-deploy-prev");
    const nextBtn = qs("#config-deploy-next");
    const saveBtn = qs("#config-deploy-save");

    const tabs = initTabs("config-deploy-tabs", {
        onChange: (tabId) => _updateNav(tabId, prevBtn, nextBtn, saveBtn),
        clickable: false,
    });

    on(prevBtn, "click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        if (current > 0) tabs.goTo(TAB_ORDER[current - 1]);
    });

    on(nextBtn, "click", () => {
        const current = TAB_ORDER.indexOf(tabs.current());
        const nextTab = TAB_ORDER[current + 1];
        if (!nextTab) return;
        const nextTabBtn = qs(`.tab-btn[data-tab="${nextTab}"]`);
        if (nextTabBtn?.disabled) return;
        tabs.goTo(nextTab);
    });

    onSoChange((value) => {
        const isIso = value && value !== "";
        tabs[isIso ? "enable" : "disable"]("pos");
        _updateNav("so", prevBtn, nextBtn, saveBtn);
    });

    on(saveBtn, "click", async () => {
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
            backup_root:  false,
        };

        const res = await fetch(`/api/clients/${getMac()}/deploy/plan`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(plan),
        });

        if (res.ok) {
            modal.close();
            enable(qs("#execute-deploy-btn"));
        } else {
            alert("Erro ao salvar plano");
        }
    });
}

function _updateNav(tabId, prevBtn, nextBtn, saveBtn) {
    const idx     = TAB_ORDER.indexOf(tabId);
    const isFirst = idx === 0;
    const isLast  = idx === TAB_ORDER.length - 1;
    const soVal   = collectSo();
    const soOk    = soVal !== undefined;

    if (prevBtn) prevBtn.disabled = isFirst;
    if (nextBtn) nextBtn.disabled = isLast
        || (tabId === "so" && !soOk)
        || (tabId === "so" && soVal === null);

    const canSave = (isLast && soOk) || (tabId === "so" && soVal === null);
    if (saveBtn) saveBtn.disabled = !canSave;
}