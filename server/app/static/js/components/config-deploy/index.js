import { initModal } from "../../lib/modal.js";

export function initConfigDeploy(getMac) {
    const modal = initModal("config-deploy-modal");

    document.getElementById("deploy-btn")
        ?.addEventListener("click", () => modal.open());

    document.getElementById("config-deploy-cancel")
        ?.addEventListener("click", () => modal.close());
}