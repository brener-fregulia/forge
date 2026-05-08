/**
 * Anvil — helpers DOM
 * Utilitarios para manipulacao do DOM sem repeticao de codigo.
 */

export const qs  = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export const show = (el) => { if (el) el.style.display = ""; };
export const hide = (el) => { if (el) el.style.display = "none"; };
export const toggle = (el, force) => {
    if (!el) return;
    const visible = force !== undefined ? force : el.style.display === "none";
    el.style.display = visible ? "" : "none";
};

export const addClass    = (el, ...cls) => el?.classList.add(...cls);
export const removeClass = (el, ...cls) => el?.classList.remove(...cls);
export const toggleClass = (el, cls, force) => el?.classList.toggle(cls, force);
export const hasClass    = (el, cls) => el?.classList.contains(cls) ?? false;

export const on  = (el, event, fn, opts) => el?.addEventListener(event, fn, opts);
export const off = (el, event, fn)       => el?.removeEventListener(event, fn);

export const setContent = (el, text) => { if (el) el.textContent = text; };
export const setHtml    = (el, html) => { if (el) el.innerHTML   = html; };

export const enable  = (el) => { if (el) el.disabled = false; };
export const disable = (el) => { if (el) el.disabled = true; };

export const cloneTemplate = (id) => {
    const tpl = document.getElementById(id);
    if (!tpl) return null;
    return tpl.content.cloneNode(true);
};