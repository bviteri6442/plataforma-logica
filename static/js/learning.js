/**
 * LogicPuzzle Lab - Learning Mode
 * ==================================
 * Secuencia pedagógica paso a paso sobre lógica combinacional.
 */

import { generateGateTruthTable } from './gates.js';
import { TruthTableRenderer } from './truthtable.js';

const STORAGE_KEY = 'logicpuzzle_learning_index';

// ─── Contenido ordenado pedagógicamente ───

const LEARNING_MODULES = [
    {
        id: 'intro',
        section: 'fundamentos',
        sectionTitle: 'Fundamentos',
        title: 'Introducción a la Lógica Digital',
        icon: '📚',
        content: `
            <p>La <strong>Lógica Digital</strong> es la base de todos los sistemas computacionales.
            Trabaja con solo dos valores: <span class="text-green">1 (HIGH / Verdadero)</span> y
            <span class="text-red">0 (LOW / Falso)</span>.</p>
            <p>Las <strong>compuertas lógicas</strong> son los bloques que procesan señales binarias.
            Cada compuerta implementa una operación del Álgebra de Boole.</p>
            <h3 class="mt-2">Conceptos clave</h3>
            <ul class="learning-steps">
                <li><strong>Bit:</strong> unidad mínima de información (0 o 1).</li>
                <li><strong>Compuerta:</strong> circuito que realiza una operación lógica.</li>
                <li><strong>Tabla de verdad:</strong> todas las combinaciones de entrada y su resultado.</li>
                <li><strong>Expresión booleana:</strong> fórmula que describe la función del circuito.</li>
            </ul>
            <p class="mt-2 text-muted">Recorre las lecciones en orden: cada una construye sobre la anterior.</p>
        `
    },
    {
        id: 'and',
        section: 'basicas',
        sectionTitle: 'Compuertas Básicas',
        title: 'Compuerta AND',
        icon: '🔲',
        gateType: 'AND',
        formula: 'F = A · B = A AND B',
        content: `
            <p>La compuerta <strong>AND</strong> produce salida <span class="text-green">1</span>
            <em>solo</em> cuando <strong>todas</strong> sus entradas son 1.</p>
            <p>En Álgebra de Boole equivale a la <strong>multiplicación lógica</strong>.</p>
            <h3 class="mt-2">Analogía</h3>
            <p>Dos interruptores <strong>en serie</strong>: la luz se enciende solo si ambos están cerrados.</p>
        `
    },
    {
        id: 'or',
        section: 'basicas',
        title: 'Compuerta OR',
        icon: '🔳',
        gateType: 'OR',
        formula: 'F = A + B = A OR B',
        content: `
            <p>La compuerta <strong>OR</strong> produce salida <span class="text-green">1</span>
            cuando <strong>al menos una</strong> entrada es 1.</p>
            <p>Equivale a la <strong>suma lógica</strong> (no aritmética).</p>
            <h3 class="mt-2">Analogía</h3>
            <p>Dos interruptores <strong>en paralelo</strong>: basta con que uno esté cerrado.</p>
        `
    },
    {
        id: 'not',
        section: 'basicas',
        title: 'Compuerta NOT',
        icon: '🔄',
        gateType: 'NOT',
        formula: 'F = Ā = NOT A',
        content: `
            <p>La compuerta <strong>NOT</strong> invierte su entrada: 1 → 0 y 0 → 1.</p>
            <p>Es el <strong>complemento</strong> booleano. Solo tiene <strong>una entrada</strong>.</p>
            <h3 class="mt-2">Relación con AND y OR</h3>
            <p>NOT se combina con AND/OR para crear compuertas más complejas (NAND, NOR).</p>
        `
    },
    {
        id: 'nand',
        section: 'compuestas',
        sectionTitle: 'Compuertas Compuestas',
        title: 'Compuerta NAND',
        icon: '⚡',
        gateType: 'NAND',
        formula: 'F = ¬(A · B) = NOT (A AND B)',
        content: `
            <p><strong>NAND</strong> = NOT + AND. Salida 0 solo cuando todas las entradas son 1.</p>
            <h3 class="mt-2">Compuerta universal</h3>
            <p>Con NAND sola puedes implementar AND, OR y NOT. Es la más usada en circuitos integrados.</p>
        `
    },
    {
        id: 'nor',
        section: 'compuestas',
        title: 'Compuerta NOR',
        icon: '⚡',
        gateType: 'NOR',
        formula: 'F = ¬(A + B) = NOT (A OR B)',
        content: `
            <p><strong>NOR</strong> = NOT + OR. Salida 1 solo cuando todas las entradas son 0.</p>
            <p>También es <strong>compuerta universal</strong>, igual que NAND.</p>
        `
    },
    {
        id: 'xor',
        section: 'compuestas',
        title: 'Compuerta XOR',
        icon: '⊕',
        gateType: 'XOR',
        formula: 'F = A ⊕ B = A XOR B',
        content: `
            <p><strong>XOR</strong> (OR exclusivo): salida 1 cuando las entradas son <strong>diferentes</strong>.</p>
            <p>Si ambas son iguales (0-0 o 1-1), la salida es 0.</p>
            <h3 class="mt-2">Aplicación</h3>
            <p>Base de <strong>sumadores binarios</strong> y detección de paridad.</p>
        `
    },
    {
        id: 'xnor',
        section: 'compuestas',
        title: 'Compuerta XNOR',
        icon: '⊙',
        gateType: 'XNOR',
        formula: 'F = ¬(A ⊕ B) = A XNOR B',
        content: `
            <p><strong>XNOR</strong> (equivalencia): salida 1 cuando las entradas son <strong>iguales</strong>.</p>
            <p>Es la inversa de XOR. Sirve como <strong>comparador de bits</strong>.</p>
        `
    },
    {
        id: 'expresiones',
        section: 'algebra',
        sectionTitle: 'Álgebra Booleana',
        title: 'Expresiones y Precedencia',
        icon: '📝',
        content: `
            <p>Las expresiones combinan variables y operadores. Ejemplo:
            <span class="learning-formula" style="display:inline;padding:0.2rem 0.5rem;">F = (A · B) + C</span></p>
            <h3 class="mt-2">Orden de precedencia (mayor → menor)</h3>
            <ol class="learning-steps" style="list-style:none;">
                <li><strong>1.</strong> NOT (¬)</li>
                <li><strong>2.</strong> AND / NAND (· , ∧ , &)</li>
                <li><strong>3.</strong> XOR / XNOR (⊕)</li>
                <li><strong>4.</strong> OR / NOR (+ , ∨ , |)</li>
            </ol>
            <p class="mt-2">Usa paréntesis para forzar el orden: <code>NOT A AND B</code> = (NOT A) AND B.</p>
        `
    },
    {
        id: 'demorgan',
        section: 'algebra',
        title: 'Teoremas de De Morgan',
        icon: '📐',
        content: `
            <h3>Primer teorema</h3>
            <div class="learning-formula">¬(A · B) = Ā + B̄</div>
            <p>La negación de un AND equivale al OR de las negaciones → explica NAND.</p>
            <h3 class="mt-2">Segundo teorema</h3>
            <div class="learning-formula">¬(A + B) = Ā · B̄</div>
            <p>La negación de un OR equivale al AND de las negaciones → explica NOR.</p>
            <h3 class="mt-2">Utilidad</h3>
            <p>Permiten transformar circuitos entre formas AND-OR y simplificar diseños.</p>
        `
    },
    {
        id: 'halfadder',
        section: 'aritmetica',
        sectionTitle: 'Circuitos Aritméticos',
        title: 'Semi-Sumador (Half Adder)',
        icon: '➕',
        content: `
            <p>Suma <strong>dos bits</strong> A y B y produce:</p>
            <ul>
                <li><strong>Suma (S):</strong> A XOR B</li>
                <li><strong>Acarreo (C):</strong> A AND B</li>
            </ul>
            <div class="learning-formula">S = A ⊕ B &nbsp;&nbsp; C = A · B</div>
            <h3 class="mt-2">Ejemplo</h3>
            <p>1 + 1 = 10₂ → S = 0, C = 1 &nbsp;|&nbsp; 1 + 0 = 01₂ → S = 1, C = 0</p>
        `
    },
    {
        id: 'fulladder',
        section: 'aritmetica',
        title: 'Sumador Completo (Full Adder)',
        icon: '🔢',
        content: `
            <p>Suma <strong>tres bits</strong>: A, B y acarreo de entrada (Cin).</p>
            <ul>
                <li><strong>Suma:</strong> S = A ⊕ B ⊕ Cin</li>
                <li><strong>Acarreo:</strong> Cout = (A · B) + ((A ⊕ B) · Cin)</li>
            </ul>
            <div class="learning-formula">S = A ⊕ B ⊕ Cin</div>
            <div class="learning-formula">Cout = (A · B) + ((A ⊕ B) · Cin)</div>
            <p class="mt-2">Se construye con <strong>dos semi-sumadores</strong> y un OR. Varios en cascada forman un sumador de n bits.</p>
        `
    }
];

export class LearningMode {
    constructor() {
        this.modules = LEARNING_MODULES;
        this.currentIndex = LearningMode.loadProgress();
    }

    static loadProgress() {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved === null) return 0;
        const index = parseInt(saved, 10);
        return Number.isNaN(index) ? 0 : Math.max(0, Math.min(index, LEARNING_MODULES.length - 1));
    }

    saveProgress() {
        sessionStorage.setItem(STORAGE_KEY, String(this.currentIndex));
    }

    getModules() {
        return this.modules;
    }

    getCurrentModule() {
        return this.modules[this.currentIndex];
    }

    next() {
        if (this.currentIndex < this.modules.length - 1) {
            this.currentIndex++;
            this.saveProgress();
            return this.modules[this.currentIndex];
        }
        return null;
    }

    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.saveProgress();
            return this.modules[this.currentIndex];
        }
        return null;
    }

    goTo(index) {
        if (index >= 0 && index < this.modules.length) {
            this.currentIndex = index;
            this.saveProgress();
            return this.modules[this.currentIndex];
        }
        return null;
    }

    isFirst() {
        return this.currentIndex === 0;
    }

    isLast() {
        return this.currentIndex === this.modules.length - 1;
    }

    getSectionLabel(mod) {
        const sameSection = this.modules.filter(m => m.section === mod.section);
        const indexInSection = sameSection.indexOf(mod) + 1;
        return `${mod.sectionTitle || mod.section} · ${indexInSection}/${sameSection.length}`;
    }

    renderModule(container, module = null) {
        const mod = module || this.getCurrentModule();
        if (!mod) return;

        const stepNum = this.currentIndex + 1;
        const total = this.modules.length;
        const showSection = this.currentIndex === 0 ||
            this.modules[this.currentIndex - 1].section !== mod.section;

        let html = '';

        if (showSection && mod.sectionTitle) {
            html += `<div class="learning-section-badge">${mod.sectionTitle}</div>`;
        }

        html += `
            <div class="learning-card">
                <div class="learning-card-header">
                    <span class="learning-step-label">Lección ${stepNum} de ${total}</span>
                    <span class="learning-section-label">${this.getSectionLabel(mod)}</span>
                </div>
                <h2>${mod.icon} ${mod.title}</h2>
                <div class="learning-card-body">${mod.content}</div>
        `;

        if (mod.gateType) {
            html += `<div class="learning-formula">${mod.formula}</div>`;
            html += `<div id="learning-truth-table" class="mt-2 truth-table-wrapper"></div>`;
        }

        html += '</div>';

        const isFirst = this.isFirst();
        const isLast = this.isLast();

        html += `
            <nav class="learning-nav" aria-label="Navegación de lecciones">
                <button type="button" class="btn btn-nav btn-nav-prev" id="learn-prev-btn"
                    ${isFirst ? 'disabled aria-disabled="true"' : ''}>
                    <span class="btn-nav-icon">←</span>
                    <span class="btn-nav-text">Anterior</span>
                </button>

                <div class="learning-progress" role="tablist" aria-label="Progreso">
                    <span class="learning-progress-text">${stepNum} / ${total}</span>
                    <div class="learning-progress-dots">
                        ${this.modules.map((m, i) => `
                            <button type="button"
                                class="learning-progress-dot ${i < this.currentIndex ? 'completed' : ''} ${i === this.currentIndex ? 'active' : ''}"
                                data-learn-index="${i}"
                                title="${m.title}"
                                aria-label="Lección ${i + 1}: ${m.title}"
                                aria-current="${i === this.currentIndex ? 'step' : 'false'}">
                            </button>
                        `).join('')}
                    </div>
                </div>

                <button type="button" class="btn btn-nav btn-nav-next ${isLast ? 'btn-nav-finish' : ''}" id="learn-next-btn">
                    <span class="btn-nav-text">${isLast ? 'Finalizar' : 'Siguiente'}</span>
                    <span class="btn-nav-icon">${isLast ? '✓' : '→'}</span>
                </button>
            </nav>
        `;

        container.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (mod.gateType) {
            const tableContainer = document.getElementById('learning-truth-table');
            if (tableContainer) {
                const truthData = generateGateTruthTable(mod.gateType);
                TruthTableRenderer.renderGateTable(tableContainer, mod.gateType, truthData);
            }
        }
    }

    getTotal() {
        return this.modules.length;
    }
}
