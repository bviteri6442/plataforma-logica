/**
 * LogicPuzzle Lab - Main Application
 * =====================================
 * Orchestrator that initializes all modules and manages global state.
 */

import { GATE_TYPES, getAvailableGates } from './gates.js';
import { CircuitRenderer } from './circuit.js';
import { DragDropManager } from './dragdrop.js';
import { Simulator } from './simulator.js';
import { TruthTableRenderer } from './truthtable.js';
import { PuzzleManager } from './puzzles.js';
import { LearningMode } from './learning.js';
import { ExamMode } from './exam.js';
import { MultiplayerClient } from './multiplayer.js';
import { KahootExamMixin } from './kahoot-exam.js';
import {
    sanitizeCalcInput,
    normalizeCalcExpression,
    validateCalcExpression,
    isAllowedCalcKey,
    formatCalcToken,
    friendlyCalcError,
} from './calc-input.js';
import { CalcTruthBuilder } from './calc-truth-builder.js';
import { sounds } from './sounds.js';
import { UIController } from './ui.js';

class LogicPuzzleApp {
    constructor() {
        this.ui = new UIController();
        this.puzzleManager = new PuzzleManager();
        this.learningMode = new LearningMode();
        this.examMode = new ExamMode(this.puzzleManager);
        this.multiplayer = new MultiplayerClient();
        this.slotLoader = null;

        // Circuit instances (created per mode)
        this.circuit = null;
        this.dragDrop = null;
        this.simulator = null;

        // Current mode state
        this.activeMode = null; // 'puzzle', 'free', 'exam', 'multiplayer'
        this.currentPuzzleData = null;
        this.mpQuestionIndex = 0;
        this.mpTimerInterval = null;
        this._mpWinModalShown = false;
    }

    async init() {
        // Load puzzles
        await this.puzzleManager.loadPuzzles();

        // Bind navigation
        this._bindNavigation();

        // Bind menu cards
        this._bindMenuCards();

        // Bind sound toggle
        this._bindSoundToggle();

        // Mobile navigation drawer
        this.ui.initMobileNav((screen) => this._navigateToScreen(screen));

        // Calculator & learning: bind once
        this._bindCalculator();
        this._bindLearningNav();
        this._bindQrShare();

        // Multiplayer callbacks
        this._bindMultiplayerEvents();

        // Deep link: ?room=CODE
        const urlRoom = new URLSearchParams(window.location.search).get('room');
        if (urlRoom) sessionStorage.setItem('pending_room', urlRoom.toUpperCase());

        // Hide splash after delay
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.classList.add('hidden');
            this.ui.navigateTo('main-menu');
        }, 2200);
    }

    // ─── Navigation ───

    _bindNavigation() {
        // Navbar buttons
        document.querySelectorAll('.nav-btn[data-screen]').forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.dataset.screen;
                sounds.nav();
                this._navigateToScreen(screen);
            });
        });

        // Brand click → home
        const brand = document.querySelector('.navbar-brand');
        if (brand) {
            brand.addEventListener('click', () => {
                sounds.nav();
                this._navigateToScreen('main-menu');
            });
        }
    }

    _bindMenuCards() {
        document.querySelectorAll('.menu-card[data-screen]').forEach(card => {
            card.addEventListener('click', () => {
                sounds.nav();
                this._navigateToScreen(card.dataset.screen);
            });
        });
    }

    _bindSoundToggle() {
        document.querySelectorAll('#sound-toggle, [title="Sonido"]').forEach(btn => {
            if (btn.dataset.soundBound) return;
            btn.dataset.soundBound = 'true';
            btn.addEventListener('click', () => {
                sounds.enabled = !sounds.enabled;
                document.querySelectorAll('[title="Sonido"], #sound-toggle').forEach(b => {
                    b.textContent = sounds.enabled ? '🔊' : '🔇';
                });
                sounds.click();
            });
        });
    }

    _navigateToScreen(screenId) {
        // Cleanup active modes
        this._cleanupActiveMode();

        this.ui.navigateTo(screenId);

        // Initialize screen content
        switch (screenId) {
            case 'puzzle-screen':
                this._initPuzzleList();
                break;
            case 'learning-screen':
                this._initLearning();
                break;
            case 'free-screen':
                this._initFreeMode();
                break;
            case 'exam-screen':
                this._initExamSetup();
                break;
            case 'calculator-screen':
                this._initCalculator();
                break;
        }
    }

    _cleanupActiveMode() {
        if (this.puzzleManager.timerInterval) {
            this.puzzleManager.stopTimer();
        }
        if (this.mpTimerInterval) {
            this._stopMpTimer();
        }
        this.activeMode = null;
        this.circuit = null;
        this.dragDrop = null;
        this.simulator = null;
    }

    // ─── Puzzle List ───

    _initPuzzleList() {
        const container = document.getElementById('puzzle-list-content');
        if (!container) return;

        const categories = this.puzzleManager.getPuzzlesByCategory();
        let html = '';

        for (const [catId, cat] of Object.entries(categories)) {
            html += `<div class="puzzle-category">`;
            html += `<h3 class="puzzle-category-title">${cat.name}</h3>`;
            html += `<div class="puzzle-cards">`;

            for (const puzzle of cat.puzzles) {
                const completion = this.puzzleManager.getCompletion(puzzle.id);
                const stars = completion?.stars || 0;
                const isCompleted = completion?.completed || false;

                html += `
                    <div class="puzzle-card ${isCompleted ? 'completed' : ''}"
                         data-puzzle-id="${puzzle.id}">
                        <div class="puzzle-card-header">
                            <span class="puzzle-card-icon">${puzzle.icon || '🔧'}</span>
                            <div class="puzzle-card-stars">
                                ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}
                            </div>
                        </div>
                        <div class="puzzle-card-name">${puzzle.name}</div>
                        <div class="puzzle-card-desc">${puzzle.description}</div>
                        <div class="puzzle-card-difficulty">
                            ${Array.from({length: 5}, (_, i) =>
                                `<div class="difficulty-dot ${i < puzzle.difficulty ? 'filled' : ''}"></div>`
                            ).join('')}
                        </div>
                    </div>
                `;
            }
            html += '</div></div>';
        }

        container.innerHTML = html;

        // Bind puzzle card clicks
        container.querySelectorAll('.puzzle-card').forEach(card => {
            card.addEventListener('click', () => {
                sounds.nav();
                this._startPuzzle(card.dataset.puzzleId);
            });
        });
    }

    // ─── Start Puzzle ───

    async _startPuzzle(puzzleId) {
        const puzzle = await this.puzzleManager.loadPuzzle(puzzleId);
        if (!puzzle) {
            this.ui.showToast('Error cargando el puzzle', 'error');
            return;
        }

        this.currentPuzzleData = puzzle;
        this.activeMode = 'puzzle';

        // Navigate to workspace
        this.ui.navigateTo('workspace-screen');

        // Setup workspace
        this._setupWorkspace(puzzle);

        // Setup puzzle info panel
        this._setupPuzzleInfo(puzzle);

        // Start timer
        this.puzzleManager.startTimer();
        this.puzzleManager.onTimerUpdate = (time) => this.ui.updateTimer(time);

        // Bind puzzle controls
        this._bindPuzzleControls(puzzle);
    }

    _setupWorkspace(puzzle) {
        const svgEl = document.getElementById('circuit-svg');
        if (!svgEl) return;

        // Clear previous content
        svgEl.innerHTML = '';

        // Create circuit renderer
        this.circuit = new CircuitRenderer(svgEl);
        this.circuit.applyDeviceViewport();

        // Setup drag & drop
        const palette = document.getElementById('gate-palette');
        this.dragDrop = new DragDropManager(this.circuit, palette, svgEl);

        // Setup simulator
        this.simulator = new Simulator(this.circuit);

        this._setFreeVarControlsVisible(false);

        // Add input nodes
        const inputs = puzzle.inputs || [];
        const inputSpacing = this.circuit.touchFriendly ? 100 : 80;
        const inputStartY = Math.max(80, (this.circuit.viewBox.h - inputs.length * inputSpacing) / 2);
        const outX = this.circuit.getOutputX();

        inputs.forEach((name, i) => {
            this.circuit.addInput(name, 60, inputStartY + i * inputSpacing);
        });

        // Add output node
        const outputs = puzzle.outputs || ['F'];
        outputs.forEach((name, i) => {
            this.circuit.addOutput(name, outX, inputStartY + i * inputSpacing + 40);
        });

        // Populate gate palette
        this._populatePalette(puzzle.available_gates);

        // Wire up callbacks
        this.dragDrop.onGateDropped = () => this._onCircuitChanged();
        this.dragDrop.onConnectionMade = () => this._onCircuitChanged();
        this.dragDrop.onInputToggled = (gateId) => this._toggleInput(gateId);

        this.circuit.onCircuitChanged = () => this._onCircuitChanged();
    }

    _populatePalette(allowedGates) {
        const palette = document.getElementById('gate-palette');
        if (!palette) return;

        palette.innerHTML = '<div class="palette-title">Compuertas</div>';

        const gates = allowedGates || Object.keys(GATE_TYPES);

        for (const type of gates) {
            const def = GATE_TYPES[type];
            if (!def) continue;

            const item = document.createElement('div');
            item.className = 'gate-item';
            item.dataset.gateType = type;
            item.innerHTML = `
                <div class="gate-item-icon">
                    <svg viewBox="0 0 ${def.width} ${def.height}">
                        <path d="${def.svgPath}"
                              fill="rgba(20,20,50,0.8)"
                              stroke="${def.color}"
                              stroke-width="2"/>
                        ${def.bubble ? `<circle cx="${def.bubble.cx}" cy="${def.bubble.cy}" r="${def.bubble.r}"
                                         fill="rgba(20,20,50,0.8)" stroke="${def.color}" stroke-width="2"/>` : ''}
                        ${def.extraPath ? `<path d="${def.extraPath}" fill="none" stroke="${def.color}" stroke-width="2"/>` : ''}
                    </svg>
                </div>
                <span class="gate-item-label">${def.label}</span>
            `;
            palette.appendChild(item);
        }
    }

    _setupPuzzleInfo(puzzle) {
        // Puzzle info bar
        const nameEl = document.getElementById('puzzle-name');
        const exprEl = document.getElementById('puzzle-expression');
        if (nameEl) nameEl.textContent = puzzle.name;
        if (exprEl) exprEl.innerHTML = this.ui.formatExpression(puzzle.expression);

        // Theory section
        const theoryEl = document.getElementById('info-theory');
        if (theoryEl) theoryEl.innerHTML = puzzle.theory || '';

        // Expected truth table
        const tableEl = document.getElementById('info-truth-table');
        if (tableEl && puzzle.expected_truth_table) {
            TruthTableRenderer.render(tableEl, {
                variables: puzzle.inputs,
                rows: puzzle.expected_truth_table
            });
        }

        // Hint section
        const hintEl = document.getElementById('info-hints');
        if (hintEl) hintEl.innerHTML = '<p class="text-muted">Haz clic en "Pista" para obtener ayuda.</p>';
    }

    _bindPuzzleControls(puzzle) {
        const verifyBtn = document.getElementById('verify-btn');
        if (verifyBtn) {
            verifyBtn.textContent = '✓ Verificar';
            verifyBtn.style.display = '';
            verifyBtn.onclick = () => this._verifyCircuit(puzzle);
        }

        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) hintBtn.style.display = '';

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => this._resetWorkspace(puzzle);
        }

        if (hintBtn) {
            hintBtn.onclick = () => this._showHint();
        }

        // Back button
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                this.puzzleManager.stopTimer();
                this._navigateToScreen('puzzle-screen');
            };
        }
    }

    _toggleInput(gateId) {
        const gate = this.circuit.gates.get(gateId);
        if (gate && gate.type === 'INPUT') {
            const newValue = gate.toggle();
            this.circuit.updateInputVisual(gateId);
            sounds.toggle(newValue);
            this.simulator.simulate();
        }
    }

    _onCircuitChanged() {
        if (this.simulator) {
            this.simulator.simulate();
        }
    }

    _verifyCircuit(puzzle) {
        if (!this.simulator || !puzzle) return;

        this.puzzleManager.attempts++;

        // Check circuit completeness
        const complete = this.simulator.isCircuitComplete();
        if (!complete.complete) {
            this.ui.showToast(complete.message, 'warning');
            sounds.error();
            return;
        }

        // Validate against expected truth table
        const result = this.simulator.validateCircuit(puzzle.expected_truth_table);

        // Update comparison table in info panel
        const compareEl = document.getElementById('info-truth-table');
        if (compareEl) {
            TruthTableRenderer.renderComparison(
                compareEl,
                puzzle.expected_truth_table,
                result.userTable,
                puzzle.inputs
            );
        }

        if (result.valid) {
            // Success!
            this.puzzleManager.stopTimer();
            const stars = this.puzzleManager.calculateStars(
                true,
                this.puzzleManager.elapsedSeconds,
                this.puzzleManager.hintsUsed,
                this.puzzleManager.attempts
            );
            const score = this.puzzleManager.calculateScore(
                puzzle.difficulty,
                stars,
                this.puzzleManager.elapsedSeconds
            );

            this.puzzleManager.recordCompletion(puzzle.id, stars, score);
            sounds.success();

            // Show success overlay
            setTimeout(() => {
                this.ui.showSuccess(
                    stars,
                    `${result.message}\nPuntuación: ${score} | Tiempo: ${this.puzzleManager.formatTime(this.puzzleManager.elapsedSeconds)}`,
                    () => this._navigateToScreen('puzzle-screen')
                );
            }, 500);
        } else {
            sounds.error();
            this.ui.showToast(result.message, 'error', 4000);

            // Shake effect
            const workspace = document.querySelector('.circuit-workspace');
            if (workspace) {
                workspace.classList.add('shake');
                setTimeout(() => workspace.classList.remove('shake'), 500);
            }
        }
    }

    _resetWorkspace(puzzle) {
        if (this.circuit) {
            this.circuit.clear();
        }
        if (puzzle) {
            this._setupWorkspace(puzzle);
        }
        sounds.remove();
        this.ui.showToast('Workspace reiniciado', 'info');
    }

    async _showHint() {
        const hint = await this.puzzleManager.getHint();
        if (hint) {
            const hintEl = document.getElementById('info-hints');
            if (hintEl) {
                hintEl.innerHTML = `
                    <div class="hint-box">
                        <span class="hint-box-icon">💡</span>
                        <strong>Pista ${hint.index}/${hint.total}:</strong>
                        ${hint.text}
                    </div>
                `;
            }
            this.ui.showToast(`Pista ${hint.index} de ${hint.total}`, 'info');
        } else {
            this.ui.showToast('No hay más pistas disponibles', 'warning');
        }
    }

    // ─── Free Mode ───

    _initFreeMode() {
        this.activeMode = 'free';
        this.ui.navigateTo('workspace-screen');

        const svgEl = document.getElementById('circuit-svg');
        if (!svgEl) return;

        svgEl.innerHTML = '';
        this.circuit = new CircuitRenderer(svgEl);
        this.circuit.applyDeviceViewport();

        const palette = document.getElementById('gate-palette');
        this.dragDrop = new DragDropManager(this.circuit, palette, svgEl);
        this.simulator = new Simulator(this.circuit);

        this._setFreeVarControlsVisible(true);
        this._bindFreeVarControls();

        // All gates available
        this._populatePalette(null);

        this.circuit.addInput('A', 60, 100);
        this.circuit.addInput('B', 60, 210);
        this.circuit.addOutput('F', this.circuit.getOutputX(), 160);

        // Wire up callbacks
        this.dragDrop.onGateDropped = () => this._onCircuitChanged();
        this.dragDrop.onConnectionMade = () => this._onCircuitChanged();
        this.dragDrop.onInputToggled = (gateId) => this._toggleInput(gateId);
        this.circuit.onCircuitChanged = () => this._onCircuitChanged();

        // Setup free mode info
        const nameEl = document.getElementById('puzzle-name');
        const exprEl = document.getElementById('puzzle-expression');
        if (nameEl) nameEl.textContent = 'Modo Libre';
        if (exprEl) exprEl.textContent = 'Construye cualquier circuito';

        const theoryEl = document.getElementById('info-theory');
        if (theoryEl) {
            theoryEl.innerHTML = '<p>Arrastra compuertas, conecta cables y experimenta libremente. Usa <strong>+ Variable</strong> para agregar C, D, E…</p>';
        }

        const tableEl = document.getElementById('info-truth-table');
        if (tableEl) tableEl.innerHTML = '<p class="text-muted">La tabla de verdad se actualizará al construir el circuito.</p>';

        // Setup free mode controls
        const verifyBtn = document.getElementById('verify-btn');
        if (verifyBtn) {
            verifyBtn.textContent = '📊 Tabla';
            verifyBtn.onclick = () => this._generateFreeTable();
        }

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this._initFreeMode();
            };
        }

        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) hintBtn.style.display = 'none';

        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.onclick = () => this._navigateToScreen('main-menu');
        }

        // Hide timer in free mode
        const timerEl = document.getElementById('puzzle-timer');
        if (timerEl) timerEl.textContent = '∞';
    }

    _setFreeVarControlsVisible(visible) {
        const el = document.getElementById('free-var-controls');
        if (el) el.hidden = !visible;
    }

    _bindFreeVarControls() {
        const addBtn = document.getElementById('add-var-btn');
        const removeBtn = document.getElementById('remove-var-btn');
        if (addBtn) addBtn.onclick = () => this._addFreeVariable();
        if (removeBtn) removeBtn.onclick = () => this._removeFreeVariable();
    }

    _addFreeVariable() {
        if (!this.circuit || this.activeMode !== 'free') return;

        const inputs = this.circuit.getInputNodes().sort((a, b) => a.name.localeCompare(b.name));
        const lastName = inputs[inputs.length - 1]?.name || 'A';
        if (lastName >= 'Z') {
            this.ui.showToast('Máximo 26 variables (A–Z)', 'warning');
            return;
        }

        const next = String.fromCharCode(lastName.charCodeAt(0) + 1);
        this.circuit.addInput(next, 60, 100);
        this._relayoutFreeInputs();
        this._repositionFreeOutput();
        this._onCircuitChanged();
        this.ui.showToast(`Variable ${next} agregada`, 'success');
    }

    _removeFreeVariable() {
        if (!this.circuit || this.activeMode !== 'free') return;

        const inputs = this.circuit.getInputNodes().sort((a, b) => a.name.localeCompare(b.name));
        if (inputs.length <= 2) {
            this.ui.showToast('Debes mantener al menos A y B', 'warning');
            return;
        }

        const last = inputs[inputs.length - 1];
        this.circuit.removeGate(last.id);
        this._relayoutFreeInputs();
        this._repositionFreeOutput();
        this._onCircuitChanged();
        this.ui.showToast(`Variable ${last.name} quitada`, 'info');
    }

    _relayoutFreeInputs() {
        if (!this.circuit) return;
        const inputs = this.circuit.getInputNodes().sort((a, b) => a.name.localeCompare(b.name));
        const spacing = this.circuit.touchFriendly ? 110 : 90;
        const startY = 80;
        inputs.forEach((inp, i) => {
            this.circuit.moveGate(inp.id, 60, startY + i * spacing);
        });
    }

    _repositionFreeOutput() {
        if (!this.circuit) return;
        const inputs = this.circuit.getInputNodes();
        const outputs = Array.from(this.circuit.gates.values()).filter((g) => g.type === 'OUTPUT');
        if (!outputs.length) return;

        const spacing = this.circuit.touchFriendly ? 110 : 90;
        const midY = 80 + Math.max(0, (inputs.length - 1) * spacing) / 2;
        this.circuit.moveGate(outputs[0].id, this.circuit.getOutputX(), midY);
    }

    _generateFreeTable() {
        if (!this.simulator) return;

        const complete = this.simulator.isCircuitComplete();
        if (!complete.complete) {
            this.ui.showToast(complete.message, 'warning');
            return;
        }

        const table = this.simulator.generateTruthTable();
        const tableEl = document.getElementById('info-truth-table');
        if (tableEl && table.rows.length > 0) {
            TruthTableRenderer.render(tableEl, table);
            this.ui.showToast('Tabla de verdad generada', 'success');
        }
    }

    // ─── Learning Mode ───

    _initLearning() {
        const container = document.getElementById('learning-content');
        if (!container) return;

        this.learningMode.currentIndex = LearningMode.loadProgress();
        this.learningMode.renderModule(container);
    }

    _bindLearningNav() {
        const container = document.getElementById('learning-content');
        if (!container || container.dataset.navBound) return;
        container.dataset.navBound = 'true';

        container.addEventListener('click', (e) => {
            const nextBtn = e.target.closest('#learn-next-btn');
            const prevBtn = e.target.closest('#learn-prev-btn');
            const dot = e.target.closest('.learning-progress-dot');

            if (nextBtn) {
                sounds.nav();
                if (this.learningMode.isLast()) {
                    this.ui.showToast('¡Has completado todas las lecciones!', 'success');
                    this._navigateToScreen('puzzle-screen');
                    return;
                }
                this.learningMode.next();
                this.learningMode.renderModule(container);
            } else if (prevBtn && !prevBtn.disabled) {
                sounds.nav();
                this.learningMode.previous();
                this.learningMode.renderModule(container);
            } else if (dot) {
                const index = parseInt(dot.dataset.learnIndex, 10);
                if (!Number.isNaN(index)) {
                    sounds.nav();
                    this.learningMode.goTo(index);
                    this.learningMode.renderModule(container);
                }
            }
        });
    }

    // ─── Kahoot Exam (see kahoot-exam.js) ───

    _bindQrShare() {
        const overlay = document.getElementById('qr-modal-overlay');
        const closeBtn = document.getElementById('qr-modal-close');
        const open = () => {
            overlay?.classList.add('active');
            overlay?.setAttribute('aria-hidden', 'false');
        };
        const close = () => {
            overlay?.classList.remove('active');
            overlay?.setAttribute('aria-hidden', 'true');
        };

        document.querySelectorAll('.qr-share-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                open();
            });
        });
        closeBtn?.addEventListener('click', close);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('active')) close();
        });
    }

    _setCalcMode(mode) {
        const exprPanel = document.getElementById('calc-panel-expr');
        const tablePanel = document.getElementById('calc-panel-table');
        document.querySelectorAll('.calc-mode-tab').forEach((tab) => {
            const active = tab.dataset.calcMode === mode;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        if (exprPanel) exprPanel.hidden = mode !== 'expr';
        if (tablePanel) tablePanel.hidden = mode !== 'table';
        const syntax = document.getElementById('calc-syntax-help');
        if (syntax) syntax.hidden = mode === 'table';
        if (mode === 'table') {
            this._initCalcTruthBuilder();
        }
    }

    _initCalcTruthBuilder() {
        if (!this.calcTruthBuilder) {
            this.calcTruthBuilder = new CalcTruthBuilder('calc-truth-builder');
        }
        this.calcTruthBuilder.init();
    }

    // ─── Calculator ───

    _bindCalculator() {
        if (this._calculatorBound) return;
        this._calculatorBound = true;

        document.querySelectorAll('.calc-mode-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                sounds.click();
                this._setCalcMode(tab.dataset.calcMode);
            });
        });

        document.getElementById('calc-from-table-btn')?.addEventListener('click', () => {
            this._calculateFromTable();
        });

        const calcBtn = document.getElementById('calc-btn');
        const input = document.getElementById('calc-input');
        const clearBtn = document.getElementById('calc-clear-btn');
        const backspaceBtn = document.getElementById('calc-backspace-btn');

        if (calcBtn) {
            calcBtn.addEventListener('click', () => this._calculateExpression());
        }

        if (input) {
            input.addEventListener('beforeinput', (e) => {
                if (e.inputType === 'insertText' && e.data && !isAllowedCalcKey(e.data)) {
                    e.preventDefault();
                }
            });

            input.addEventListener('input', () => {
                const cleaned = sanitizeCalcInput(input.value);
                if (cleaned !== input.value) {
                    const pos = input.selectionStart ?? cleaned.length;
                    input.value = cleaned;
                    const newPos = Math.max(0, Math.min(pos, cleaned.length));
                    input.setSelectionRange(newPos, newPos);
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData?.getData('text') || '').trim();
                const cleaned = sanitizeCalcInput(text);
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.value = input.value.slice(0, start) + cleaned + input.value.slice(end);
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._calculateExpression();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (input) {
                    input.value = '';
                    input.focus();
                }
                const resultContainer = document.getElementById('calc-result');
                if (resultContainer) {
                    resultContainer.innerHTML = '<p class="text-muted text-center">Ingresa una expresión y presiona "Generar".</p>';
                }
            });
        }

        if (backspaceBtn) {
            backspaceBtn.addEventListener('click', () => {
                if (input) {
                    input.value = input.value.slice(0, -1);
                    input.focus();
                }
            });
        }

        document.querySelectorAll('.shortcut-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!input) return;
                const token = btn.dataset.token || btn.textContent.trim();
                const insert = formatCalcToken(token);
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.value = sanitizeCalcInput(
                    input.value.slice(0, start) + insert + input.value.slice(end)
                );
                const newPos = start + insert.length;
                input.setSelectionRange(newPos, newPos);
                input.focus();
            });
        });
    }

    _initCalculator() {
        this._setCalcMode('expr');
        const input = document.getElementById('calc-input');
        if (input) {
            input.value = sanitizeCalcInput(input.value);
            input.focus();
        }
    }

    async _calculateFromTable() {
        if (!this.calcTruthBuilder) {
            this._initCalcTruthBuilder();
        }
        const resultContainer = document.getElementById('calc-table-result');
        if (!resultContainer || !this.calcTruthBuilder) return;

        const variables = this.calcTruthBuilder.getVariables();
        const rows = this.calcTruthBuilder.getRows();

        try {
            const response = await fetch('/api/truth-table-to-expression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variables, rows }),
            });
            const data = await response.json();

            if (!response.ok || data.error) {
                const msg = data.error || 'No se pudo obtener la expresión';
                this.ui.showToast(msg, 'error');
                resultContainer.innerHTML = `<p class="calc-error">${msg}</p>`;
                sounds.error();
                return;
            }

            const expressions = (data.expressions && data.expressions.length)
                ? data.expressions.slice(0, 2)
                : [data.expression].filter(Boolean);
            const labels = ['Respuesta 1', 'Respuesta 2'];
            const exprBlocks = expressions.map((expr, i) => `
                <div class="calc-expr-result-box${i > 0 ? ' calc-expr-result-box--alt' : ''}">
                    ${expressions.length > 1 ? `<p class="calc-expr-label">${labels[i]}</p>` : ''}
                    <div class="learning-formula">${this.ui.formatExpression(expr)}</div>
                </div>
            `).join('');

            resultContainer.innerHTML = `
                <div class="calc-result-header">
                    <h3 class="info-section-title">🧮 Expresión Booleana</h3>
                    <div class="calc-meta">
                        <span>${data.minterm_count} minterm${data.minterm_count !== 1 ? 's' : ''}</span>
                        <span>${expressions.length > 1 ? '2 formas' : 'SOP'}</span>
                    </div>
                </div>
                ${exprBlocks}
                <p class="text-muted text-center mt-1" style="font-size:0.85rem">${data.message || ''}</p>
            `;
            sounds.success();
        } catch (err) {
            this.ui.showToast('Error de conexión con el servidor', 'error');
            resultContainer.innerHTML = '<p class="calc-error">No se pudo conectar con el servidor.</p>';
            console.error(err);
        }
    }

    async _calculateExpression() {
        const input = document.getElementById('calc-input');
        const resultContainer = document.getElementById('calc-result');
        if (!input || !resultContainer) return;

        const raw = sanitizeCalcInput(input.value).trim();
        input.value = raw;

        const validation = validateCalcExpression(raw);
        if (!validation.ok) {
            this.ui.showToast(validation.message, 'warning');
            return;
        }

        const expression = normalizeCalcExpression(raw);

        try {
            const response = await fetch('/api/truth-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                const msg = friendlyCalcError(data.error || 'Error al procesar la expresión');
                this.ui.showToast(msg, 'error', 5000);
                resultContainer.innerHTML = `<p class="calc-error">${msg}</p>`;
                sounds.error();
                return;
            }

            const varCount = data.variables?.length || 0;
            const rowCount = data.rows?.length || 0;

            resultContainer.innerHTML = `
                <div class="calc-result-header">
                    <h3 class="info-section-title">📊 Tabla de Verdad</h3>
                    <div class="calc-meta">
                        <span>${varCount} variable${varCount !== 1 ? 's' : ''}</span>
                        <span>${rowCount} fila${rowCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="learning-formula">${this.ui.formatExpression(expression)}</div>
                <div id="calc-table" class="mt-2 truth-table-wrapper"></div>
            `;

            const tableEl = document.getElementById('calc-table');
            if (tableEl) {
                TruthTableRenderer.render(tableEl, data);
            }

            sounds.success();

        } catch (err) {
            this.ui.showToast('Error de conexión con el servidor', 'error');
            resultContainer.innerHTML = '<p class="calc-error">No se pudo conectar con el servidor. Verifica que la aplicación esté en ejecución.</p>';
            console.error(err);
        }
    }
}

// ─── Initialize on DOM ready ───
Object.assign(LogicPuzzleApp.prototype, KahootExamMixin);

let _viewportResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(_viewportResizeTimer);
    _viewportResizeTimer = setTimeout(() => {
        if (window.app?.circuit?.applyDeviceViewport) {
            window.app.circuit.applyDeviceViewport();
        }
    }, 200);
});

document.addEventListener('DOMContentLoaded', () => {
    const app = new LogicPuzzleApp();
    window.app = app;
    app.init();
});
