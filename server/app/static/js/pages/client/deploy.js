import { initConfigDeploy } from "../../components/config-deploy/index.js";

export function initDeploy(mac) {
    initConfigDeploy(() => mac);

    document.getElementById("execute-deploy-btn")?.addEventListener("click", () => {
        alert("Execução do deploy em desenvolvimento — em breve!");
    });
}

export function updateDeployState(deployPlan) {
    if (deployPlan) {
        const execBtn = document.getElementById("execute-deploy-btn");
        if (execBtn) execBtn.disabled = false;
    }
}