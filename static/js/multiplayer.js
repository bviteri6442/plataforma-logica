/**
 * LogicPuzzle Lab - Multiplayer / Kahoot Mode
 * Real-time exam with lobby, leaderboard, and admin control.
 */

import { sounds } from './sounds.js';

export class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomCode = null;
        this.playerName = null;
        this.isAdmin = false;
        this.totalQuestions = 15;
        this.currentQuestion = null;
        this.questionStartedAt = null;
        this.timeLimit = 90;
        this.answered = false;

        this.onLobbyUpdate = null;
        this.onGameStarted = null;
        this.onNextQuestion = null;
        this.onGameFinished = null;
        this.onAnswerRecorded = null;
        this.onPlayerAnswered = null;
        this.onError = null;
        this.onJoined = null;
    }

    connect() {
        if (this.socket) return Promise.resolve();

        return new Promise((resolve, reject) => {
            if (typeof io === 'undefined') {
                reject(new Error('Socket.IO no cargado'));
                return;
            }

            this.socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
            });

            this.socket.on('connect', () => {
                this.connected = true;
                resolve();
            });

            this.socket.on('connect_error', (err) => {
                reject(err);
            });

            this.socket.on('error', (data) => {
                if (this.onError) this.onError(data.message || 'Error');
            });

            this.socket.on('room_created', (data) => {
                this.roomCode = data.code;
                this.isAdmin = true;
                this.totalQuestions = data.total_questions;
            });

            this.socket.on('joined_room', (data) => {
                this.roomCode = data.code;
                this.playerName = data.name;
                this.isAdmin = data.is_admin;
                this.totalQuestions = data.total_questions;
                if (this.onJoined) this.onJoined(data);
            });

            this.socket.on('lobby_update', (data) => {
                if (this.onLobbyUpdate) this.onLobbyUpdate(data);
            });

            this.socket.on('game_started', (data) => {
                this.answered = false;
                this.currentQuestion = data;
                this.questionStartedAt = data.started_at;
                this.timeLimit = data.time_limit;
                if (this.onGameStarted) this.onGameStarted(data);
            });

            this.socket.on('next_question', (data) => {
                this.answered = false;
                this.currentQuestion = data;
                this.questionStartedAt = data.started_at;
                this.timeLimit = data.time_limit;
                if (this.onNextQuestion) this.onNextQuestion(data);
            });

            this.socket.on('answer_recorded', (data) => {
                this.answered = true;
                if (this.onAnswerRecorded) this.onAnswerRecorded(data);
            });

            this.socket.on('game_finished', (data) => {
                if (this.onGameFinished) this.onGameFinished(data);
            });

            this.socket.on('player_answered', (data) => {
                if (this.onPlayerAnswered) this.onPlayerAnswered(data);
            });
        });
    }

    async adminCreateRoom(pin) {
        await this.connect();
        this.socket.emit('admin_create_room', { pin });
        return new Promise((resolve) => {
            const handler = (data) => {
                this.socket.off('room_created', handler);
                resolve(data);
            };
            this.socket.on('room_created', handler);
        });
    }

    async joinRoom(code, name) {
        await this.connect();
        this.socket.emit('join_room', { code: code.toUpperCase(), name });
        return new Promise((resolve, reject) => {
            const onJoined = (data) => {
                this.socket.off('joined_room', onJoined);
                this.socket.off('error', onErr);
                sounds.success();
                resolve(data);
            };
            const onErr = (data) => {
                this.socket.off('joined_room', onJoined);
                this.socket.off('error', onErr);
                reject(new Error(data.message));
            };
            this.socket.on('joined_room', onJoined);
            this.socket.on('error', onErr);
        });
    }

    startGame() {
        if (!this.isAdmin) return;
        this.socket.emit('admin_start_game');
        sounds.nav();
    }

    nextQuestion() {
        if (!this.isAdmin) return;
        this.socket.emit('admin_next_question');
    }

    submitAnswer(slotFills, elapsedMs) {
        if (this.answered) return;
        this.socket.emit('submit_answer', {
            slot_fills: slotFills,
            elapsed_ms: elapsedMs,
        });
    }

    getElapsedMs() {
        if (!this.questionStartedAt) return 0;
        return Math.max(0, Date.now() - this.questionStartedAt * 1000);
    }

    requestLobby() {
        if (this.socket) this.socket.emit('get_lobby');
    }
}

export function renderLeaderboard(container, players, highlightName = null) {
    if (!container) return;
    if (!players || players.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Esperando jugadores...</p>';
        return;
    }

    let html = '<table class="leaderboard-table"><thead><tr>';
    html += '<th>#</th><th>Jugador</th><th>Puntos</th><th>✓</th></tr></thead><tbody>';

    for (const p of players) {
        const isMe = highlightName && p.name === highlightName;
        const rowClass = isMe ? 'leaderboard-row-me' : '';
        const statusIcon = p.status === 'answered'
            ? (p.last_answer_correct ? '✅' : '❌')
            : (p.status === 'playing' ? '⏳' : '·');
        html += `<tr class="${rowClass}">
            <td>${p.rank || ''}</td>
            <td>${escapeHtml(p.name)}</td>
            <td class="leaderboard-score">${p.score || 0}</td>
            <td>${statusIcon}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
