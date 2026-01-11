// Main application logic for Fretboard Trainer

class FretboardTrainer {
    constructor() {
        this.detector = new AudioPitchDetector();
        this.currentChallenge = null;
        this.isRunning = false;
        this.score = 0;
        this.correctStreak = 0;

        // Mode: 'audio' or 'keyboard'
        this.mode = 'audio';

        // Timing settings
        this.successDisplayDuration = 800; // ms to show success before next card
        this.detectionHoldTime = 150; // ms the correct note must be held

        // Detection state
        this.correctStartTime = null;
        this.lastDetectedNote = null;

        // DOM elements
        this.noteDisplay = document.getElementById('note-display');
        this.stringDisplay = document.getElementById('string-display');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.startButton = document.getElementById('start-button');
        this.scoreDisplay = document.getElementById('score');
        this.detectedNoteDisplay = document.getElementById('detected-note');
        this.modeToggle = document.getElementById('mode-toggle');

        this.init();
    }

    init() {
        this.startButton.addEventListener('click', () => this.toggleSession());

        // Mode toggle button
        if (this.modeToggle) {
            this.modeToggle.addEventListener('click', () => this.toggleMode());
        }

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        this.detector.onPitchDetected = (frequency) => {
            this.handlePitchDetected(frequency);
        };

        this.showWaiting();
    }

    toggleMode() {
        if (this.isRunning) {
            this.stopSession();
        }
        this.mode = this.mode === 'audio' ? 'keyboard' : 'audio';
        this.updateModeDisplay();
    }

    updateModeDisplay() {
        if (this.modeToggle) {
            this.modeToggle.textContent = this.mode === 'audio' ? 'Switch to Keyboard Mode' : 'Switch to Audio Mode';
            this.modeToggle.classList.toggle('keyboard-mode', this.mode === 'keyboard');
        }
    }

    handleKeyPress(e) {
        if (!this.isRunning || !this.currentChallenge) return;

        // In keyboard mode: Space/Enter = correct, any other key = skip
        if (this.mode === 'keyboard') {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.handleCorrect();
            } else if (e.code === 'KeyS' || e.code === 'Escape') {
                // Skip to next challenge
                e.preventDefault();
                this.nextChallenge();
            }
        }
    }

    async toggleSession() {
        if (this.isRunning) {
            this.stopSession();
        } else {
            await this.startSession();
        }
    }

    async startSession() {
        // In keyboard mode, skip audio initialization
        if (this.mode === 'audio') {
            const result = await this.detector.start();

            if (!result.success) {
                this.statusText.textContent = result.error;
                this.statusIndicator.className = 'status-indicator error';
                this.detectedNoteDisplay.textContent = 'Try Keyboard Mode instead (button below)';
                return;
            }
        }

        this.isRunning = true;
        this.score = 0;
        this.correctStreak = 0;
        this.updateScore();

        this.startButton.textContent = 'Stop';
        this.startButton.classList.add('active');

        this.nextChallenge();
    }

    stopSession() {
        this.isRunning = false;
        this.detector.stop();

        this.startButton.textContent = 'Start';
        this.startButton.classList.remove('active');

        this.showWaiting();
    }

    nextChallenge() {
        this.currentChallenge = Fretboard.getRandomChallenge();
        this.correctStartTime = null;
        this.lastDetectedNote = null;

        this.noteDisplay.textContent = this.currentChallenge.note;
        this.stringDisplay.textContent = Fretboard.getStringName(this.currentChallenge.string);

        this.showListening();
    }

    handlePitchDetected(frequency) {
        if (!this.isRunning || !this.currentChallenge) return;

        const noteInfo = Fretboard.frequencyToNote(frequency);
        if (!noteInfo) return;

        // Update detected note display
        this.detectedNoteDisplay.textContent = `Hearing: ${noteInfo.note}${noteInfo.octave}`;

        // Check if it matches the target note
        const isMatch = Fretboard.isNoteMatch(
            frequency,
            this.currentChallenge.frequency,
            50 // 50 cents tolerance
        );

        if (isMatch) {
            if (this.correctStartTime === null) {
                this.correctStartTime = Date.now();
            } else if (Date.now() - this.correctStartTime >= this.detectionHoldTime) {
                this.handleCorrect();
            }
        } else {
            this.correctStartTime = null;
        }
    }

    handleCorrect() {
        if (!this.isRunning) return;

        this.score++;
        this.correctStreak++;
        this.updateScore();

        this.showSuccess();

        // Pause detection while showing success
        const tempChallenge = this.currentChallenge;
        this.currentChallenge = null;

        setTimeout(() => {
            if (this.isRunning) {
                this.nextChallenge();
            }
        }, this.successDisplayDuration);
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    showWaiting() {
        this.noteDisplay.textContent = '?';
        this.stringDisplay.textContent = 'Press Start to begin';
        this.statusIndicator.className = 'status-indicator';
        this.statusText.textContent = 'Ready';
        this.detectedNoteDisplay.textContent = '';
    }

    showListening() {
        this.statusIndicator.className = 'status-indicator listening';
        if (this.mode === 'keyboard') {
            this.statusText.textContent = 'Play the note, then press Space';
            this.detectedNoteDisplay.textContent = 'Space = Correct | S = Skip';
        } else {
            this.statusText.textContent = 'Listening...';
        }
    }

    showSuccess() {
        this.statusIndicator.className = 'status-indicator success';
        this.statusText.textContent = 'Correct!';
        this.detectedNoteDisplay.textContent = '';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FretboardTrainer();
});
