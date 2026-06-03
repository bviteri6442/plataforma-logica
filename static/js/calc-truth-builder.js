/**
 * LogicPuzzle Lab - Truth table builder (Tabla → Expresión)
 */

const VAR_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export class CalcTruthBuilder {
    constructor(containerId, onChange) {
        this.container = document.getElementById(containerId);
        this.onChange = onChange || (() => {});
        this.varCount = 2;
        this.rows = [];
        this._bound = false;
    }

    init() {
        if (!this.container) return;
        this._buildRows();
        this.render();
        if (!this._bound) {
            this.container.addEventListener('click', (e) => this._onClick(e));
            this._bound = true;
        }
    }

    _buildRows() {
        const vars = VAR_NAMES.slice(0, this.varCount);
        const n = 2 ** this.varCount;
        this.rows = [];
        for (let i = 0; i < n; i += 1) {
            const row = { F: 0 };
            vars.forEach((v, bit) => {
                const shift = this.varCount - 1 - bit;
                row[v] = (i >> shift) & 1;
            });
            this.rows.push(row);
        }
    }

    setVarCount(n) {
        this.varCount = Math.max(2, Math.min(6, n));
        this._buildRows();
        this.render();
        this.onChange();
    }

    getVariables() {
        return VAR_NAMES.slice(0, this.varCount);
    }

    getRows() {
        return this.rows.map((r) => {
            const out = { F: r.F };
            this.getVariables().forEach((v) => {
                out[v] = r[v];
            });
            return out;
        });
    }

    _onClick(e) {
        const varBtn = e.target.closest('[data-var-count]');
        if (varBtn) {
            this.setVarCount(parseInt(varBtn.dataset.varCount, 10));
            return;
        }

        const preset = e.target.closest('[data-preset]');
        if (preset) {
            this._applyPreset(preset.dataset.preset);
            return;
        }

        const cell = e.target.closest('[data-row][data-col="F"]');
        if (cell) {
            const idx = parseInt(cell.dataset.row, 10);
            this.rows[idx].F = this.rows[idx].F ? 0 : 1;
            cell.textContent = this.rows[idx].F;
            cell.classList.toggle('val-1', this.rows[idx].F === 1);
            cell.classList.toggle('val-0', this.rows[idx].F === 0);
            this.onChange();
        }
    }

    _applyPreset(name) {
        const vars = this.getVariables();
        this.rows.forEach((row, i) => {
            row.F = 0;
            if (name === 'and' && vars.length >= 2) {
                row.F = vars.every((v) => row[v] === 1) ? 1 : 0;
            } else if (name === 'or' && vars.length >= 2) {
                row.F = vars.some((v) => row[v] === 1) ? 1 : 0;
            } else if (name === 'xor' && vars.length >= 2) {
                const sum = vars.reduce((acc, v) => acc + row[v], 0);
                row.F = sum % 2;
            } else if (name === 'zero') {
                row.F = 0;
            } else if (name === 'one') {
                row.F = 1;
            }
        });
        this.render();
        this.onChange();
    }

    render() {
        if (!this.container) return;
        const vars = this.getVariables();

        let html = `
            <div class="calc-table-builder-controls">
                <span class="calc-builder-label">Variables:</span>
                <div class="calc-var-count-btns">
                    ${[2, 3, 4].map((n) => `
                        <button type="button" class="btn btn-sm ${n === this.varCount ? 'btn-primary' : 'btn-outline'}"
                                data-var-count="${n}">${n}</button>
                    `).join('')}
                </div>
            </div>
            <p class="calc-builder-hint text-muted">Toca la columna <strong>F</strong> para cambiar 0 ↔ 1.</p>
            <div class="calc-preset-row">
                <span class="calc-builder-label">Plantillas:</span>
                <button type="button" class="btn btn-ghost btn-sm" data-preset="and">AND</button>
                <button type="button" class="btn btn-ghost btn-sm" data-preset="or">OR</button>
                <button type="button" class="btn btn-ghost btn-sm" data-preset="xor">XOR</button>
                <button type="button" class="btn btn-ghost btn-sm" data-preset="zero">F=0</button>
                <button type="button" class="btn btn-ghost btn-sm" data-preset="one">F=1</button>
            </div>
            <div class="truth-table-wrapper calc-editable-table-wrap">
                <table class="truth-table calc-editable-table">
                    <thead>
                        <tr>
                            ${vars.map((v) => `<th>${v}</th>`).join('')}
                            <th class="output-col">F</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.rows.forEach((row, i) => {
            html += '<tr>';
            vars.forEach((v) => {
                html += `<td class="val-${row[v]}">${row[v]}</td>`;
            });
            html += `<td class="output-col calc-f-cell val-${row.F}" data-row="${i}" data-col="F" role="button" tabindex="0" title="Clic para alternar">${row.F}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        this.container.innerHTML = html;
    }
}
