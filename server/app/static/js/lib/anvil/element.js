/**
 * Anvil Element - helpers genéricos para criação de elementos DOM
 * @module anvil/element
 */

/**
 * Cria um elemento com classes e conteúdo opcionais.
 * @param {string} tag
 * @param {Object} [opts]
 * @param {string|string[]} [opts.cls]
 * @param {string} [opts.text]
 * @param {string} [opts.style]
 * @returns {HTMLElement}
 */
export function el(tag, { cls, text, style } = {}) {
    const node = document.createElement(tag);
    if (cls) node.classList.add(...[].concat(cls));
    if (text != null) node.textContent = text;
    if (style) node.style.cssText = style;
    return node;
}

/**
 * Appenda múltiplos filhos a um elemento pai.
 * @param {HTMLElement} parent
 * @param {...Node} children
 * @returns {HTMLElement}
 */
export function append(parent, ...children) {
    for (const child of children) {
        if (child != null) parent.appendChild(child);
    }
    return parent;
}