/**
 * LogicPuzzle Lab - Truth Table Module
 * =======================================
 * Generates and displays truth tables in the UI.
 */

export class TruthTableRenderer {
    /**
     * Render a truth table into a container element.
     * @param {HTMLElement} container - Container to render into
     * @param {object} tableData - { variables: string[], rows: object[] }
     * @param {object} options - { highlightOutput: boolean, differences: array }
     */
    static render(container, tableData, options = {}) {
        if (!tableData || !tableData.rows || tableData.rows.length === 0) {
            container.innerHTML = '<p class="text-muted">Sin datos para mostrar.</p>';
            return;
        }

        const { variables = [], rows = [] } = tableData;
        const differences = options.differences || [];
        const diffRowIndices = new Set(differences.map(d => d.row));

        // Determine columns: input variables + output
        const inputCols = variables.length > 0
            ? variables
            : Object.keys(rows[0]).filter(k => k !== 'F');
        const outputCols = Object.keys(rows[0]).filter(k => !inputCols.includes(k));

        let html = '<table class="truth-table">';

        // Header
        html += '<thead><tr>';
        for (const col of inputCols) {
            html += `<th>${col}</th>`;
        }
        for (const col of outputCols) {
            html += `<th class="output-col">${col}</th>`;
        }
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const isIncorrect = diffRowIndices.has(i);
            const rowClass = isIncorrect ? 'row-incorrect' : (options.highlightCorrect ? 'row-correct' : '');

            html += `<tr class="${rowClass}">`;
            for (const col of inputCols) {
                const val = row[col];
                html += `<td class="val-${val}">${val}</td>`;
            }
            for (const col of outputCols) {
                const val = row[col];
                html += `<td class="output-col val-${val}">${val}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody>';
        html += '</table>';

        container.innerHTML = html;
    }

    /**
     * Render a comparison between expected and actual truth tables.
     */
    static renderComparison(container, expectedTable, actualTable, variables) {
        if (!expectedTable || expectedTable.length === 0) {
            container.innerHTML = '<p class="text-muted">Sin tabla esperada.</p>';
            return;
        }

        const inputCols = variables || Object.keys(expectedTable[0]).filter(k => k !== 'F');

        let html = '<table class="truth-table">';

        // Header
        html += '<thead><tr>';
        for (const col of inputCols) {
            html += `<th>${col}</th>`;
        }
        html += '<th class="output-col">Esperado</th>';
        if (actualTable && actualTable.length > 0) {
            html += '<th class="output-col">Tu circuito</th>';
        }
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        for (let i = 0; i < expectedTable.length; i++) {
            const expected = expectedTable[i];
            const actual = actualTable ? actualTable[i] : null;
            const match = actual ? expected.F === actual.F : null;
            const rowClass = match === false ? 'row-incorrect' : (match === true ? 'row-correct' : '');

            html += `<tr class="${rowClass}">`;
            for (const col of inputCols) {
                html += `<td class="val-${expected[col]}">${expected[col]}</td>`;
            }
            html += `<td class="output-col val-${expected.F}">${expected.F}</td>`;
            if (actual) {
                const icon = match ? '✓' : '✗';
                html += `<td class="output-col val-${actual.F}">${actual.F} ${match === false ? '✗' : ''}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody>';
        html += '</table>';

        container.innerHTML = html;
    }

    /**
     * Generate truth table HTML for a single gate type (for learning mode).
     */
    static renderGateTable(container, gateType, truthTableData) {
        const n = truthTableData[0]?.inputs.length || 2;
        const inputLabels = n === 1 ? ['A'] : ['A', 'B'];

        let html = '<table class="truth-table">';

        // Header
        html += '<thead><tr>';
        for (const label of inputLabels) {
            html += `<th>${label}</th>`;
        }
        html += `<th class="output-col">F = ${gateType}</th>`;
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        for (const row of truthTableData) {
            html += '<tr>';
            for (const val of row.inputs) {
                html += `<td class="val-${val}">${val}</td>`;
            }
            html += `<td class="output-col val-${row.output}">${row.output}</td>`;
            html += '</tr>';
        }
        html += '</tbody>';
        html += '</table>';

        container.innerHTML = html;
    }
}
