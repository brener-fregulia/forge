/**
 * Helper de ícones SVG — carrega inline do servidor.
 * @module ui/icons
 */

const _cache = {};

/**
 * Retorna o SVG do ícone como string HTML.
 * @param {string} name - Nome do ícone (ex: "settings")
 * @param {Object} [opts]
 * @param {string} [opts.size="20"] - Tamanho em px
 * @param {string} [opts.cls] - Classe CSS adicional
 * @returns {Promise<string>}
 */
export async function iconHtml(name, { size = "20", cls = "" } = {}) {
    if (!_cache[name]) {
        const res = await fetch(`/static/vendor/icons/${name}.svg`);
        _cache[name] = await res.text();
    }
    return _cache[name]
        .replace(/width="[^"]*"/, `width="${size}"`)
        .replace(/height="[^"]*"/, `height="${size}"`)
        .replace("<svg ", `<svg class="forge-icon ${cls}" `);
}

/**
 * Insere o SVG do ícone em um elemento DOM.
 * @param {Element} el - Elemento alvo
 * @param {string} name - Nome do ícone
 * @param {Object} [opts]
 */
export async function setIcon(el, name, opts = {}) {
    if (!el) return;
    el.innerHTML = await iconHtml(name, opts);
}