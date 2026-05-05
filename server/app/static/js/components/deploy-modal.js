import { formatBytes } from "../lib/format.js";
import { initModal } from "../lib/modal.js";

export function initDeployModal(getMac) {
    const modal = initModal("deploy-modal");
    const body  = document.getElementById("deploy-modal-body");

    document.getElementById("deploy-btn")?.addEventListener("click", async () => {
        modal.open();
        body.innerHTML = '<div class="loading"><span class="spinner"></span>Carregando…</div>';

        const [clientData, isosData] = await Promise.all([
            fetch(`/api/clients/${getMac()}`).then(r => r.json()),
            fetch("/api/server/isos").then(r => r.json()),
        ]);

        body.innerHTML = renderForm(clientData, isosData.isos || []);
        initFormInteractions();
    });

    document.getElementById("deploy-cancel-btn")?.addEventListener("click", () => modal.close());

    document.getElementById("deploy-confirm-btn")?.addEventListener("click", async () => {
        const plan = collectPlan(getMac());
        if (!plan) return;

        const res = await fetch(`/api/clients/${getMac()}/deploy/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plan),
        });

        if (res.ok) {
            modal.close();
            const execBtn = document.getElementById("execute-deploy-btn");
            if (execBtn) {
                execBtn.disabled = false;
                execBtn.title = "Plano configurado — pronto para executar";
            }
        } else {
            alert("Erro ao salvar plano");
        }
    });
}

function renderForm(client, isos) {
    const disks = (client.disks || []).filter(d => d.type === "disk");
    const users = client.users || [];

    // Discos
    const disksHtml = disks.map((d, i) => `
        <label class="deploy-disk-option ${i === 0 ? 'selected' : ''}">
            <input type="radio" name="target_disk" value="${d.name}" ${i === 0 ? 'checked' : ''} style="display:none">
            <div>
                <strong><code>${d.name}</code> — ${d.model || "disco"}</strong>
                <div style="font-size:0.8rem;color:var(--text-dim)">${formatBytes(d.size)}</div>
            </div>
        </label>`).join("");

    // Usuários
    const usersHtml = users.map(u => `
        <div class="deploy-option">
            <input type="checkbox" id="user-${u.username}" name="backup_users" value="${u.username}" checked>
            <label for="user-${u.username}">${u.username} <span style="color:var(--text-dim)">(${formatBytes(u.size)})</span></label>
        </div>`).join("");

    // ISOs
    const isosHtml = isos.map((iso, i) => `
        <div class="deploy-option">
            <input type="radio" name="windows_iso" id="iso-${i}" value="${iso.filename}" ${i === isos.length - 1 ? 'checked' : ''}>
            <label for="iso-${i}">${iso.filename} <span style="color:var(--text-dim)">(${formatBytes(iso.size)})</span></label>
        </div>`).join("");

    return `
        <div class="deploy-section">
            <h4>Disco alvo</h4>
            ${disksHtml || '<p class="empty">Nenhum disco detectado</p>'}
        </div>

        <div class="deploy-section" id="backup-section">
            <h4>Backup</h4>
            <div class="deploy-option">
                <input type="checkbox" id="do-backup" checked>
                <label for="do-backup"><strong>Fazer backup antes de formatar</strong></label>
            </div>
            <div id="backup-options" style="margin-left:1.5rem;margin-top:0.5rem">
                <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:0.5rem">Usuários:</div>
                ${usersHtml || '<p class="empty" style="font-size:0.85rem">Nenhum usuário detectado</p>'}
                <div class="deploy-option" style="margin-top:0.5rem">
                    <input type="checkbox" id="backup-root">
                    <label for="backup-root">Arquivos soltos em C:\</label>
                </div>
            </div>
        </div>

        <div class="deploy-section">
            <h4>Instalação Windows</h4>
            ${isosHtml}
            <div class="deploy-option">
                <input type="radio" name="windows_iso" id="iso-none" value="">
                <label for="iso-none">Não instalar</label>
            </div>
        </div>

        <div class="deploy-section">
            <h4>Pós-instalação</h4>
            <div class="deploy-option">
                <input type="checkbox" id="do-drivers" checked>
                <label for="do-drivers">Injeção de drivers (SDIO)</label>
            </div>
            <div class="deploy-option">
                <input type="checkbox" id="do-debloat" checked>
                <label for="do-debloat">Debloat</label>
            </div>
            <div class="deploy-option">
                <input type="checkbox" id="do-restore" checked>
                <label for="do-restore">Restaurar backup</label>
            </div>
        </div>`;
}

function initFormInteractions() {
    // Radio de disco atualiza visual
    document.querySelectorAll('input[name="target_disk"]').forEach(radio => {
        radio.addEventListener("change", () => {
            document.querySelectorAll(".deploy-disk-option").forEach(el => el.classList.remove("selected"));
            radio.closest(".deploy-disk-option").classList.add("selected");
        });
    });

    // Toggle backup options
    document.getElementById("do-backup")?.addEventListener("change", (e) => {
        const opts = document.getElementById("backup-options");
        if (opts) opts.style.display = e.target.checked ? "block" : "none";
    });

    // Se não instalar, desabilita pós-instalação
    document.querySelectorAll('input[name="windows_iso"]').forEach(radio => {
        radio.addEventListener("change", () => {
            const isNone = document.querySelector('input[name="windows_iso"]:checked')?.value === "";
            ["do-drivers", "do-debloat"].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.disabled = isNone; el.closest(".deploy-option").style.opacity = isNone ? "0.4" : "1"; }
            });
        });
    });
}

function collectPlan(mac) {
    const targetDisk = document.querySelector('input[name="target_disk"]:checked')?.value;
    if (!targetDisk) { alert("Selecione um disco alvo"); return null; }

    const doBackup = document.getElementById("do-backup")?.checked ?? false;
    const backupUsers = [...document.querySelectorAll('input[name="backup_users"]:checked')].map(el => el.value);
    const backupRoot = document.getElementById("backup-root")?.checked ?? false;
    const windowsIso = document.querySelector('input[name="windows_iso"]:checked')?.value || null;
    const drivers = document.getElementById("do-drivers")?.checked ?? false;
    const debloat = document.getElementById("do-debloat")?.checked ?? false;
    const restore = document.getElementById("do-restore")?.checked ?? false;

    return {
        target_disk: targetDisk,
        backup: doBackup,
        backup_users: backupUsers,
        backup_root: backupRoot,
        windows_iso: windowsIso || null,
        drivers,
        debloat,
        restore,
    };
}