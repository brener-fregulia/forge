/**
 * Builders do FORGE — componentes UI específicos do design system
 */
import { el, append } from "../anvil/element.js";

/**
 * Constrói um bloco .info-summary com itens { label, value }
 * @param {Array<{label: string, value: string|Node}>} items
 * @returns {HTMLElement}
 */
export function buildSummary(items) {
    const summary = el("div", { cls: "info-summary" });
    for (const { label, value } of items) {
        const item   = el("div", { cls: "info-summary-item" });
        const strong = el("strong");
        if (value instanceof Node) strong.appendChild(value);
        else strong.textContent = value ?? "—";
        append(item, strong, el("span", { text: label }));
        summary.appendChild(item);
    }
    return summary;
}

/**
 * Constrói uma .forge-table com cabeçalho e linhas
 * @param {string[]} headers
 * @param {Array<Array<string|number|Node|null|undefined>>} rows
 * @param {Object} [opts]
 * @param {string} [opts.style]
 * @returns {HTMLElement}
 */
export function buildTable(headers, rows, { style } = {}) {
    const table = el("table", { cls: "forge-table", style });

    const thead   = el("thead");
    const headRow = el("tr");
    for (const h of headers) headRow.appendChild(el("th", { text: h }));
    append(thead, headRow);

    const tbody = el("tbody");
    for (const cols of rows) {
        const tr = el("tr");
        for (const col of cols) {
            const td = el("td");
            if (col == null)             td.textContent = "—";
            else if (col instanceof Node) td.appendChild(col);
            else                         td.textContent = String(col);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    append(table, thead, tbody);
    return table;
}