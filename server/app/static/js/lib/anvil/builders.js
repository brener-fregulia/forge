import { setContent } from "./dom.js";

/**
 * Constrói um bloco .info-summary com itens { label, value }
 * @param {Array<{label: string, value: string}>} items
 * @returns {HTMLElement}
 */
export function buildSummary(items) {
    const el = document.createElement("div");
    el.className = "info-summary";
    for (const { label, value } of items) {
        const item = document.createElement("div");
        item.className = "info-summary-item";
        const strong = document.createElement("strong");
        setContent(strong, value ?? "—");
        const span = document.createElement("span");
        setContent(span, label);
        item.appendChild(strong);
        item.appendChild(span);
        el.appendChild(item);
    }
    return el;
}

/**
 * Constrói uma .forge-table com cabeçalho e linhas
 * @param {string[]} headers
 * @param {Array<string[]>} rows
 * @param {Object} [opts]
 * @param {string} [opts.style] — style inline na tabela
 * @returns {HTMLElement}
 */
export function buildTable(headers, rows, { style } = {}) {
    const table = document.createElement("table");
    table.className = "forge-table";
    if (style) table.style.cssText = style;

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const h of headers) {
        const th = document.createElement("th");
        setContent(th, h);
        headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const cols of rows) {
        const tr = document.createElement("tr");
        for (const col of cols) {
            const td = document.createElement("td");
            if (col instanceof HTMLElement) td.appendChild(col);
            else setContent(td, col ?? "—");
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}