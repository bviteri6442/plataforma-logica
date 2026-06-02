/**
 * LogicPuzzle Lab - Sound Effects
 * =================================
 * Procedural sound effects using Web Audio API.
 * No external audio files needed.
 */

class SoundEngine {
    constructor() {
        this.enabled = true;
        this.ctx = null;
        this.volume = 0.3;
    }

    /** Lazy-init AudioContext (must happen after user gesture). */
    _ensureContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /** Play a short tone. */
    _playTone(freq, duration, type = 'sine', volumeMult = 1) {
        if (!this.enabled) return;
        try {
            this._ensureContext();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = this.volume * volumeMult;

            // Envelope: quick attack, smooth release
            gain.gain.setValueAtTime(this.volume * volumeMult, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Silently fail if audio not supported
        }
    }

    /** Click sound - when placing a gate. */
    click() {
        this._playTone(800, 0.08, 'square', 0.4);
    }

    /** Connect sound - when connecting a wire. */
    connect() {
        this._playTone(1200, 0.1, 'sine', 0.5);
        setTimeout(() => this._playTone(1600, 0.1, 'sine', 0.3), 60);
    }

    /** Disconnect sound. */
    disconnect() {
        this._playTone(400, 0.15, 'sawtooth', 0.3);
    }

    /** Toggle input sound. */
    toggle(value) {
        if (value) {
            this._playTone(660, 0.1, 'sine', 0.5);
        } else {
            this._playTone(440, 0.1, 'sine', 0.5);
        }
    }

    /** Success sound - puzzle completed correctly. */
    success() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.5), i * 100);
        });
    }

    /** Error sound - wrong answer. */
    error() {
        this._playTone(200, 0.3, 'sawtooth', 0.3);
        setTimeout(() => this._playTone(180, 0.3, 'sawtooth', 0.2), 150);
    }

    /** Star earned sound. */
    star() {
        this._playTone(880, 0.15, 'sine', 0.4);
        setTimeout(() => this._playTone(1100, 0.2, 'sine', 0.3), 80);
    }

    /** Hint reveal sound. */
    hint() {
        this._playTone(600, 0.12, 'triangle', 0.4);
        setTimeout(() => this._playTone(750, 0.15, 'triangle', 0.3), 100);
    }

    /** Navigation / UI sound. */
    nav() {
        this._playTone(500, 0.05, 'sine', 0.3);
    }

    /** Delete / remove sound. */
    remove() {
        this._playTone(300, 0.12, 'square', 0.3);
    }

    /** Toggle sound on/off. */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /** Set volume (0 to 1). */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

// Singleton instance
export const sounds = new SoundEngine();
