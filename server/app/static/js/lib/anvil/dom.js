/**
 * Anvil DOM — helpers para manipulacao do DOM
 * @module anvil/dom
 */

/**
 * Seleciona o primeiro elemento que corresponde ao seletor.
 * @param {string} selector - Seletor CSS
 * @param {Document|Element} [root=document] - Raiz da busca
 * @returns {Element|null}
 */
export const qs = (selector, root = document) => root.querySelector(selector);

/**
 * Seleciona todos os elementos que correspondem ao seletor.
 * @param {string} selector - Seletor CSS
 * @param {Document|Element} [root=document] - Raiz da busca
 * @returns {Element[]}
 */
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Exibe um elemento removendo display:none.
 * @param {Element|null} el
 */
export const show = (el) => { if (el) el.style.display = ""; };

/**
 * Oculta um elemento com display:none.
 * @param {Element|null} el
 */
export const hide = (el) => { if (el) el.style.display = "none"; };

/**
 * Alterna a visibilidade de um elemento.
 * @param {Element|null} el
 * @param {boolean} [force] - Se definido, forca o estado
 */
export const toggle = (el, force) => {
    if (!el) return;
    const visible = force !== undefined ? force : el.style.display === "none";
    el.style.display = visible ? "" : "none";
};

/**
 * Adiciona uma ou mais classes a um elemento.
 * @param {Element|null} el
 * @param {...string} cls
 */
export const addClass = (el, ...cls) => el?.classList.add(...cls);

/**
 * Remove uma ou mais classes de um elemento.
 * @param {Element|null} el
 * @param {...string} cls
 */
export const removeClass = (el, ...cls) => el?.classList.remove(...cls);

/**
 * Alterna uma classe em um elemento.
 * @param {Element|null} el
 * @param {string} cls
 * @param {boolean} [force]
 */
export const toggleClass = (el, cls, force) => el?.classList.toggle(cls, force);

/**
 * Verifica se um elemento possui uma classe.
 * @param {Element|null} el
 * @param {string} cls
 * @returns {boolean}
 */
export const hasClass = (el, cls) => el?.classList.contains(cls) ?? false;

/**
 * Registra um event listener em um elemento.
 * @param {Element|null} el
 * @param {string} event - Nome do evento
 * @param {EventListener} fn - Callback
 * @param {AddEventListenerOptions} [opts]
 */
export const on = (el, event, fn, opts) => el?.addEventListener(event, fn, opts);

/**
 * Remove um event listener de um elemento.
 * @param {Element|null} el
 * @param {string} event
 * @param {EventListener} fn
 */
export const off = (el, event, fn) => el?.removeEventListener(event, fn);

/**
 * Define o texto de um elemento.
 * @param {Element|null} el
 * @param {string} text
 */
export const setContent = (el, text) => { if (el) el.textContent = text; };

/**
 * Define o HTML interno de um elemento.
 * @param {Element|null} el
 * @param {string} html
 */
export const setHtml = (el, html) => { if (el) el.innerHTML = html; };

/**
 * Habilita um elemento de formulario.
 * @param {Element|null} el
 */
export const enable = (el) => { if (el) el.disabled = false; };

/**
 * Desabilita um elemento de formulario.
 * @param {Element|null} el
 */
export const disable = (el) => { if (el) el.disabled = true; };

/**
 * Clona o conteudo de um elemento <template> pelo id.
 * @param {string} id - ID do template
 * @returns {DocumentFragment|null}
 */
export const cloneTemplate = (id) => {
    const tpl = document.getElementById(id);
    if (!tpl) return null;
    return tpl.content.cloneNode(true);
};