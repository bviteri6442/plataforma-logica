/**
 * LogicPuzzle Lab - Exam Mode
 * =============================
 * Timed exam with random puzzle selection, no hints, and final scoring.
 */

import { sounds } from './sounds.js';

export class ExamMode {
    constructor(puzzleManager) {
        this.puzzleManager = puzzleManager;
        this.examPuzzles = [];
        this.currentIndex = 0;
        this.results = [];
        this.totalTime = 0;
        this.examStartTime = null;
        this.examTimerInterval = null;
        this.numQuestions = 5;
        this.isActive = false;
    }

    /**
     * Setup the exam with a given number of questions.
     */
    setup(numQuestions = 5) {
        this.numQuestions = numQuestions;
        this.currentIndex = 0;
        this.results = [];
        this.totalTime = 0;
        this.isActive = false;

        // Select random puzzles
        const allPuzzles = [...this.puzzleManager.puzzles];
        this._shuffle(allPuzzles);
        this.examPuzzles = allPuzzles.slice(0, Math.min(numQuestions, allPuzzles.length));
    }

    /**
     * Start the exam.
     */
    start() {
        this.isActive = true;
        this.examStartTime = Date.now();
        this.currentIndex = 0;
        this.results = [];
    }

    /**
     * Get the current exam puzzle.
     */
    getCurrentPuzzle() {
        if (this.currentIndex >= this.examPuzzles.length) return null;
        return this.examPuzzles[this.currentIndex];
    }

    /**
     * Record result for current puzzle and move to next.
     */
    recordResult(isCorrect, elapsedSeconds) {
        this.results.push({
            puzzle: this.examPuzzles[this.currentIndex],
            correct: isCorrect,
            time: elapsedSeconds
        });

        this.currentIndex++;

        if (this.currentIndex >= this.examPuzzles.length) {
            this.finish();
            return true; // Exam complete
        }

        return false; // More puzzles remain
    }

    /**
     * Finish the exam.
     */
    finish() {
        this.isActive = false;
        this.totalTime = Math.floor((Date.now() - this.examStartTime) / 1000);
    }

    /**
     * Get exam results summary.
     */
    getResults() {
        const correct = this.results.filter(r => r.correct).length;
        const total = this.results.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        let grade;
        if (percentage >= 90) grade = 'Excelente 🏆';
        else if (percentage >= 80) grade = 'Muy Bien 🌟';
        else if (percentage >= 70) grade = 'Bien 👍';
        else if (percentage >= 60) grade = 'Aprobado ✓';
        else grade = 'Necesita Práctica 📖';

        return {
            correct,
            total,
            percentage,
            grade,
            totalTime: this.totalTime,
            formattedTime: this.puzzleManager.formatTime(this.totalTime),
            results: this.results
        };
    }

    /**
     * Check if exam is complete.
     */
    isComplete() {
        return this.currentIndex >= this.examPuzzles.length;
    }

    /**
     * Get progress string.
     */
    getProgress() {
        return `${this.currentIndex + 1} / ${this.examPuzzles.length}`;
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}
