/**
 * LogicPuzzle Lab - Kahoot Exam Controller
 * Mixin methods for multiplayer exam (attached to LogicPuzzleApp).
 */

import { renderLeaderboard } from './multiplayer.js';
import { SlotCircuitLoader } from './slotmode.js';
import { CircuitRenderer } from './circuit.js';
import { DragDropManager } from './dragdrop.js';
import { Simulator } from './simulator.js';
import { sounds } from './sounds.js';

export const KahootExamMixin = {
    _bindMultiplayerEvents() {
        const mp = this.multiplayer;

        mp.onLobbyUpdate = (data) => this._renderExamLobby(data);
        mp.onJoined = () => this._renderExamLobby();

        mp.onGameStarted = (data) => {
            this.mpQuestionIndex = 0;
            this._startMultiplayerQuestion(data);
        };

        mp.onNextQuestion = (data) => {
            this.mpQuestionIndex = data.question_index;
            this._startMultiplayerQuestion(data);
        };

        mp.onAnswerRecorded = (data) => {
            if (data.correct) {
                this._showKahootWinModal(data);
            } else {
                this.ui.showToast(data.message || 'Incorrecto', 'error');
            }
            this._updateMultiplayerLeaderboard(data.leaderboard);
        };

        mp.onGameFinished = (data) => {
            this._stopMpTimer();
            this.ui.navigateTo('exam-screen');
            this._showMultiplayerFinalResults(data);
        };

        mp.onError = (msg) => this.ui.showToast(msg, 'error');
        mp.onPlayerAnswered = (data) => this._updateMultiplayerLeaderboard(data.leaderboard);
    },

    _initExamSetup() {
        const container = document.getElementById('exam-content');
        if (!container) return;

        const pendingRoom = sessionStorage.getItem('pending_room') || '';

        container.innerHTML = `
            <div class="exam-kahoot-setup">
                <h2>🎮 Examen Multijugador</h2>
                <p class="text-secondary">Estilo Kahoot · 15 preguntas · Completa circuitos arrastrando compuertas</p>

                <div class="exam-kahoot-tabs">
                    <button type="button" class="btn btn-primary" id="tab-join">👤 Unirme</button>
                    <button type="button" class="btn btn-outline" id="tab-admin">🔑 Administrador</button>
                </div>

                <div id="panel-join" class="exam-kahoot-panel">
                    <div class="form-group">
                        <label for="join-name">Tu nombre</label>
                        <input type="text" id="join-name" class="calculator-input" maxlength="24"
                               placeholder="Ej: María" autocomplete="name">
                    </div>
                    <div class="form-group">
                        <label for="join-code">Código de sala</label>
                        <input type="text" id="join-code" class="calculator-input" maxlength="6"
                               placeholder="ABC123" value="${pendingRoom}" style="text-transform:uppercase">
                    </div>
                    <button type="button" class="btn btn-success btn-lg" id="btn-join-room">
                        Entrar al lobby 🚀
                    </button>
                </div>

                <div id="panel-admin" class="exam-kahoot-panel hidden">
                    <div class="form-group">
                        <label for="admin-pin">PIN de administrador</label>
                        <input type="password" id="admin-pin" class="calculator-input"
                               placeholder="PIN configurado en el servidor">
                    </div>
                    <button type="button" class="btn btn-primary btn-lg" id="btn-create-room">
                        Crear sala de examen 🎯
                    </button>
                </div>

                <div id="exam-lobby" class="exam-lobby hidden">
                    <div class="exam-lobby-header">
                        <div>
                            <span class="exam-room-code" id="lobby-room-code"></span>
                            <p class="text-muted" id="lobby-player-count"></p>
                        </div>
                        <div id="admin-controls" class="hidden">
                            <button type="button" class="btn btn-success btn-lg" id="btn-start-game">
                                ▶ Iniciar examen (15 preguntas)
                            </button>
                            <button type="button" class="btn btn-outline btn-sm" id="btn-next-q">
                                Siguiente pregunta →
                            </button>
                        </div>
                    </div>
                    <h3 class="mt-2">🏁 Participantes</h3>
                    <div id="lobby-leaderboard" class="exam-lobby-table"></div>
                    <p class="text-muted text-center mt-2" id="lobby-status">
                        Esperando a que el administrador inicie el examen...
                    </p>
                </div>
            </div>
        `;

        document.getElementById('tab-join')?.addEventListener('click', () => {
            document.getElementById('panel-join')?.classList.remove('hidden');
            document.getElementById('panel-admin')?.classList.add('hidden');
        });

        document.getElementById('tab-admin')?.addEventListener('click', () => {
            document.getElementById('panel-admin')?.classList.remove('hidden');
            document.getElementById('panel-join')?.classList.add('hidden');
        });

        document.getElementById('btn-join-room')?.addEventListener('click', () => this._joinExamRoom());
        document.getElementById('btn-create-room')?.addEventListener('click', () => this._createExamRoom());
        document.getElementById('btn-start-game')?.addEventListener('click', () => this.multiplayer.startGame());
        document.getElementById('btn-next-q')?.addEventListener('click', () => this.multiplayer.nextQuestion());
    },

    async _joinExamRoom() {
        const name = document.getElementById('join-name')?.value?.trim();
        const code = document.getElementById('join-code')?.value?.trim().toUpperCase();
        if (!name || !code) {
            this.ui.showToast('Ingresa tu nombre y el código de sala', 'warning');
            return;
        }
        try {
            await this.multiplayer.joinRoom(code, name);
            sessionStorage.setItem('pending_room', code);
            document.getElementById('panel-join')?.classList.add('hidden');
            document.getElementById('panel-admin')?.classList.add('hidden');
            document.querySelector('.exam-kahoot-tabs')?.classList.add('hidden');
            document.getElementById('exam-lobby')?.classList.remove('hidden');
            this.multiplayer.requestLobby();
        } catch (err) {
            this.ui.showToast(err.message || 'No se pudo unir', 'error');
        }
    },

    async _createExamRoom() {
        const pin = document.getElementById('admin-pin')?.value || '';
        try {
            const data = await this.multiplayer.adminCreateRoom(pin);
            document.getElementById('panel-join')?.classList.add('hidden');
            document.getElementById('panel-admin')?.classList.add('hidden');
            document.querySelector('.exam-kahoot-tabs')?.classList.add('hidden');
            document.getElementById('exam-lobby')?.classList.remove('hidden');
            document.getElementById('admin-controls')?.classList.remove('hidden');
            this.ui.showToast(`Sala ${data.code} creada. Comparte el enlace.`, 'success', 5000);
            this._renderExamLobby({ code: data.code, players: [], player_count: 0, state: 'lobby' });
        } catch (err) {
            this.ui.showToast(err.message || 'PIN incorrecto', 'error');
        }
    },

    _renderExamLobby(data) {
        const lobby = document.getElementById('exam-lobby');
        if (!lobby || lobby.classList.contains('hidden')) return;

        const code = data?.code || this.multiplayer.roomCode || '';
        const codeEl = document.getElementById('lobby-room-code');
        if (codeEl && code) {
            const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
            codeEl.innerHTML = `Sala: <strong>${code}</strong>
                <button type="button" class="btn btn-ghost btn-sm" id="copy-room-link">📋 Copiar enlace</button>`;
            document.getElementById('copy-room-link')?.addEventListener('click', () => {
                navigator.clipboard?.writeText(shareUrl);
                this.ui.showToast('Enlace copiado', 'success');
            });
        }

        const countEl = document.getElementById('lobby-player-count');
        if (countEl) countEl.textContent = `${data?.player_count || (data?.players?.length ?? 0)} jugador(es)`;

        renderLeaderboard(document.getElementById('lobby-leaderboard'), data?.players || [], this.multiplayer.playerName);

        if (this.multiplayer.isAdmin) {
            document.getElementById('admin-controls')?.classList.remove('hidden');
        }

        const statusEl = document.getElementById('lobby-status');
        if (statusEl) {
            statusEl.textContent = this.multiplayer.isAdmin
                ? 'Inicia el examen cuando todos estén conectados.'
                : 'Esperando al administrador...';
        }
    },

    _startMultiplayerQuestion(data) {
        this.activeMode = 'multiplayer';
        this._mpWinModalShown = false;
        this.currentPuzzleData = data.puzzle;
        this.ui.navigateTo('workspace-screen');
        this._setupSlotWorkspace(data.puzzle, data);
        this._setFreeVarControlsVisible(false);

        const qNum = (data.question_index ?? 0) + 1;
        const total = data.total_questions || 15;
        const nameEl = document.getElementById('puzzle-name');
        if (nameEl) nameEl.textContent = `Pregunta ${qNum} / ${total}`;

        const exprEl = document.getElementById('puzzle-expression');
        if (exprEl) exprEl.innerHTML = this.ui.formatExpression(data.puzzle?.expression || '');

        this._startMpTimer(data.time_limit || 90, data.started_at);

        const verifyBtn = document.getElementById('verify-btn');
        if (verifyBtn) {
            verifyBtn.textContent = '✓ Completar';
            verifyBtn.onclick = () => this._submitSlotAnswer();
        }

        document.getElementById('hint-btn')?.style.setProperty('display', 'none');

        document.getElementById('reset-btn') && (document.getElementById('reset-btn').onclick = () => {
            this._setupSlotWorkspace(this.currentPuzzleData, data);
        });

        document.getElementById('back-btn') && (document.getElementById('back-btn').onclick = () => {
            this._stopMpTimer();
            this._navigateToScreen('exam-screen');
        });
    },

    _setupSlotWorkspace(puzzle, meta = {}) {
        const svgEl = document.getElementById('circuit-svg');
        if (!svgEl || !puzzle) return;

        svgEl.innerHTML = '';
        this.circuit = new CircuitRenderer(svgEl);
        this.circuit.applyDeviceViewport();
        this.slotLoader = new SlotCircuitLoader(this.circuit);
        this.slotLoader.loadPuzzle(puzzle);
        this.simulator = new Simulator(this.circuit);

        const palette = document.getElementById('gate-palette');
        this.dragDrop = new DragDropManager(this.circuit, palette, svgEl);
        this.dragDrop.slotMode = true;
        this.dragDrop.slotLoader = this.slotLoader;

        this.dragDrop.onSlotFilled = () => {
            this.ui.clearSlotHint();
            this.simulator.simulate();
            if (this.slotLoader.allSlotsFilled()) this._autoSubmitIfComplete();
        };
        this.dragDrop.onSlotError = (msg) => this.ui.showSlotHint(msg);
        this.dragDrop.onInputToggled = (gateId) => this._toggleInput(gateId);

        this._populatePalette(puzzle.palette || ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR']);

        const problemTitle = document.querySelector('#workspace-screen .info-section:nth-child(1) .info-section-title');
        const rankTitle = document.querySelector('#workspace-screen .info-section:nth-child(2) .info-section-title');
        if (problemTitle) problemTitle.textContent = '📋 Enunciado';
        if (rankTitle) rankTitle.textContent = '🏆 Ranking';

        document.getElementById('info-theory').innerHTML =
            `<div class="kahoot-prompt">${puzzle.prompt || puzzle.name}</div>`;

        document.getElementById('info-truth-table').innerHTML =
            '<div id="mp-leaderboard-panel"></div>';

        if (meta.leaderboard) {
            renderLeaderboard(document.getElementById('mp-leaderboard-panel'), meta.leaderboard, this.multiplayer.playerName);
        }

        document.getElementById('info-hints').innerHTML =
            '<p class="text-muted">Arrastra la compuerta al espacio <strong>?</strong></p>';
    },

    _updateMultiplayerLeaderboard(players) {
        renderLeaderboard(document.getElementById('mp-leaderboard-panel'), players, this.multiplayer.playerName);
    },

    _autoSubmitIfComplete() {
        if (this.multiplayer.answered || this._mpWinModalShown) return;
        setTimeout(() => this._submitSlotAnswer(), 500);
    },

    _submitSlotAnswer() {
        if (!this.slotLoader || this.multiplayer.answered) return;
        if (!this.slotLoader.allSlotsFilled()) {
            this.ui.showToast('Completa todos los espacios vacíos', 'warning');
            return;
        }
        this.multiplayer.submitAnswer(this.slotLoader.getSlotFills(), this.multiplayer.getElapsedMs());
    },

    _showKahootWinModal(data) {
        if (this._mpWinModalShown) return;
        this._mpWinModalShown = true;
        sounds.success();
        this.ui.showModal('🎉 ¡Ganaste!', `
            <p style="text-align:center">
                Circuito completado correctamente<br>
                <strong>+${data.points_earned || 0}</strong> puntos · Total: <strong>${data.total_score || 0}</strong>
            </p>`, [{ text: 'Continuar', class: 'btn-primary' }]);
    },

    _showMultiplayerFinalResults(data) {
        const container = document.getElementById('exam-content');
        if (!container) return;
        const board = data.leaderboard || [];
        const myRank = board.find(p => p.name === this.multiplayer.playerName);

        container.innerHTML = `
            <div class="exam-results">
                <h2>🏆 Examen Finalizado</h2>
                <p class="text-secondary">15 preguntas · Modo multijugador</p>
                ${myRank ? `<p class="mt-2">Tu posición: <strong>#${myRank.rank}</strong> · ${myRank.score} pts</p>` : ''}
                <div class="exam-lobby-table mt-2" id="final-leaderboard"></div>
                <button class="btn btn-primary mt-3" id="exam-home-btn">Menú Principal</button>
            </div>`;

        renderLeaderboard(document.getElementById('final-leaderboard'), board, this.multiplayer.playerName);
        document.getElementById('exam-home-btn')?.addEventListener('click', () => this._navigateToScreen('main-menu'));
    },

    _startMpTimer(limitSec, startedAt) {
        this._stopMpTimer();
        const timerEl = document.getElementById('puzzle-timer');
        const endTime = (startedAt || Date.now() / 1000) + limitSec;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil(endTime - Date.now() / 1000));
            if (timerEl) timerEl.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
            if (remaining <= 0) this._stopMpTimer();
        };
        tick();
        this.mpTimerInterval = setInterval(tick, 500);
    },

    _stopMpTimer() {
        if (this.mpTimerInterval) {
            clearInterval(this.mpTimerInterval);
            this.mpTimerInterval = null;
        }
    },
};
