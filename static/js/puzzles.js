/**
 * LogicPuzzle Lab - Puzzle Mode
 * ================================
 * Manages puzzle selection, loading, scoring, and validation.
 */

import { sounds } from './sounds.js';

export class PuzzleManager {
    constructor() {
        this.puzzles = [];
        this.currentPuzzle = null;
        this.hintsUsed = 0;
        this.attempts = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;

        // Progress stored in localStorage
        this.progress = this._loadProgress();

        // Callbacks
        this.onTimerUpdate = null;
    }

    /**
     * Fetch puzzles from the API.
     */
    async loadPuzzles() {
        try {
            const res = await fetch('/api/puzzles');
            const data = await res.json();
            this.puzzles = data.puzzles || [];
            return this.puzzles;
        } catch (err) {
            console.error('Error loading puzzles:', err);
            return [];
        }
    }

    /**
     * Fetch a specific puzzle's full data.
     */
    async loadPuzzle(puzzleId) {
        try {
            const res = await fetch(`/api/puzzles/${puzzleId}`);
            const data = await res.json();
            this.currentPuzzle = data.puzzle;
            this.hintsUsed = 0;
            this.attempts = 0;
            this.elapsedSeconds = 0;
            return this.currentPuzzle;
        } catch (err) {
            console.error('Error loading puzzle:', err);
            return null;
        }
    }

    /**
     * Start the timer for the current puzzle.
     */
    startTimer() {
        this.startTime = Date.now();
        this.elapsedSeconds = 0;

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            if (this.onTimerUpdate) {
                this.onTimerUpdate(this.formatTime(this.elapsedSeconds));
            }
        }, 1000);
    }

    /**
     * Stop the timer.
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Format seconds as MM:SS.
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    /**
     * Get a hint for the current puzzle.
     */
    async getHint() {
        if (!this.currentPuzzle) return null;

        const hints = this.currentPuzzle.hints || [];
        if (this.hintsUsed >= hints.length) return null;

        const hint = hints[this.hintsUsed];
        this.hintsUsed++;
        sounds.hint();

        return {
            text: hint,
            index: this.hintsUsed,
            total: hints.length,
            hasMore: this.hintsUsed < hints.length
        };
    }

    /**
     * Calculate stars earned based on performance.
     * 3 stars: No hints, < 60s, first attempt
     * 2 stars: ≤ 1 hint, < 120s, ≤ 2 attempts
     * 1 star: Completed
     */
    calculateStars(isCorrect, elapsedSeconds, hintsUsed, attempts) {
        if (!isCorrect) return 0;

        let stars = 1; // Base star for completing

        if (hintsUsed <= 1 && elapsedSeconds < 120 && attempts <= 2) {
            stars = 2;
        }

        if (hintsUsed === 0 && elapsedSeconds < 60 && attempts <= 1) {
            stars = 3;
        }

        return stars;
    }

    /**
     * Calculate points based on performance.
     */
    calculateScore(difficulty, stars, elapsedSeconds) {
        const basePoints = difficulty * 100;
        const starMultiplier = stars;
        const timeBonus = Math.max(0, 300 - elapsedSeconds);

        return basePoints * starMultiplier + timeBonus;
    }

    /**
     * Record completion of a puzzle.
     */
    recordCompletion(puzzleId, stars, score) {
        const existing = this.progress[puzzleId];

        // Keep best performance
        if (!existing || stars > existing.stars || score > existing.score) {
            this.progress[puzzleId] = {
                completed: true,
                stars: Math.max(stars, existing?.stars || 0),
                score: Math.max(score, existing?.score || 0),
                date: new Date().toISOString(),
                attempts: this.attempts
            };
        }

        this._saveProgress();
    }

    /**
     * Get completion status for a puzzle.
     */
    getCompletion(puzzleId) {
        return this.progress[puzzleId] || null;
    }

    /**
     * Get total score across all puzzles.
     */
    getTotalScore() {
        return Object.values(this.progress).reduce((sum, p) => sum + (p.score || 0), 0);
    }

    /**
     * Get total stars earned.
     */
    getTotalStars() {
        return Object.values(this.progress).reduce((sum, p) => sum + (p.stars || 0), 0);
    }

    /**
     * Get number of completed puzzles.
     */
    getCompletedCount() {
        return Object.values(this.progress).filter(p => p.completed).length;
    }

    /**
     * Get all completion records for history.
     */
    getHistory() {
        const entries = [];
        for (const [puzzleId, data] of Object.entries(this.progress)) {
            const puzzle = this.puzzles.find(p => p.id === puzzleId);
            if (puzzle) {
                entries.push({
                    ...data,
                    puzzleId,
                    name: puzzle.name,
                    difficulty: puzzle.difficulty,
                    category: puzzle.category
                });
            }
        }
        // Sort by date, most recent first
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        return entries;
    }

    /**
     * Clear all progress.
     */
    clearProgress() {
        this.progress = {};
        this._saveProgress();
    }

    /**
     * Get puzzles organized by category.
     */
    getPuzzlesByCategory() {
        const categories = {};
        const categoryNames = {
            'basico': '⭐ Compuertas Básicas',
            'intermedio': '⚡ Compuertas Intermedias',
            'combinaciones': '🔗 Combinaciones',
            'avanzado': '🧩 Avanzado',
            'circuitos': '🔢 Circuitos Aritméticos'
        };

        for (const puzzle of this.puzzles) {
            const cat = puzzle.category || 'other';
            if (!categories[cat]) {
                categories[cat] = {
                    name: categoryNames[cat] || cat,
                    puzzles: []
                };
            }
            categories[cat].puzzles.push(puzzle);
        }

        return categories;
    }

    // ─── Private Methods ───

    _loadProgress() {
        try {
            const saved = localStorage.getItem('logicpuzzle_progress');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    _saveProgress() {
        try {
            localStorage.setItem('logicpuzzle_progress', JSON.stringify(this.progress));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }
}
