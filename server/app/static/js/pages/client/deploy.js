import { qs, on, enable } from "../../lib/anvil/dom.js";
import { initConfigDeploy } from "./modals/config-deploy/index.js";

export function initDeploy(mac) {
    initConfigDeploy(() => mac);

    on(qs("#execute-deploy-btn"), "click", () => {
        alert("Execução do deploy em desenvolvimento — em breve!");
    });
}

export function updateDeployState(deployPlan) {
    if (deployPlan) enable(qs("#execute-deploy-btn"));
}