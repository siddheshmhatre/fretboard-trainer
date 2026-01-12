// Main application logic for Fretboard Trainer

class FretboardTrainer {
    constructor() {
        this.detector = new AudioPitchDetector();
        this.currentChallenge = null;
        this.isRunning = false;
        this.score = 0;
        this.correctStreak = 0;

        // Timing settings
        this.successDisplayDuration = 800; // ms to show success before next card
        this.detectionHoldTime = 150; // ms the correct note must be held

        // Detection state
        this.correctStartTime = null;

        // DOM elements
        this.noteDisplay = document.getElementById('note-display');
        this.stringDisplay = document.getElementById('string-display');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.startButton = document.getElementById('start-button');
        this.scoreDisplay = document.getElementById('score');
        this.detectedNoteDisplay = document.getElementById('detected-note');

        // Pitch meter elements
        this.pitchMeter = document.getElementById('pitch-meter');
        this.meterIndicator = document.getElementById('meter-indicator');
        this.centsDisplay = document.getElementById('cents-display');

        this.init();
    }

    init() {
        this.startButton.addEventListener('click', () => this.toggleSession());

        this.detector.onPitchDetected = (frequency, probability) => {
            this.handlePitchDetected(frequency, probability);
        };

        this.showWaiting();
    }

    async toggleSession() {
        if (this.isRunning) {
            this.stopSession();
        } else {
            await this.startSession();
        }
    }

    async startSession() {
        const result = await this.detector.start();

        if (!result.success) {
            this.statusText.textContent = result.error;
            this.statusIndicator.className = 'status-indicator error';
            return;
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

        this.noteDisplay.textContent = this.currentChallenge.note;
        this.stringDisplay.textContent = Fretboard.getStringName(this.currentChallenge.string);

        this.showListening();
    }

    handlePitchDetected(frequency, probability = 1) {
        if (!this.isRunning || !this.currentChallenge) return;

        const noteInfo = Fretboard.frequencyToNote(frequency);
        if (!noteInfo) return;

        // Update detected note display with confidence indicator
        const confidencePercent = Math.round(probability * 100);
        this.detectedNoteDisplay.textContent = `Hearing: ${noteInfo.note}${noteInfo.octave} (${confidencePercent}%)`;

        // Calculate cents offset from target
        const centsOffset = this.calculateCentsOffset(frequency, this.currentChallenge.frequency);
        this.updatePitchMeter(centsOffset);

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

    calculateCentsOffset(detectedFreq, targetFreq) {
        return 1200 * Math.log2(detectedFreq / targetFreq);
    }

    updatePitchMeter(centsOffset) {
        if (!this.meterIndicator || !this.centsDisplay) return;

        const clampedOffset = Math.max(-50, Math.min(50, centsOffset));
        const position = ((clampedOffset + 50) / 100) * 100;
        this.meterIndicator.style.left = `${position}%`;

        const roundedCents = Math.round(centsOffset);
        if (Math.abs(roundedCents) < 3) {
            this.centsDisplay.textContent = 'In tune';
        } else if (roundedCents > 0) {
            this.centsDisplay.textContent = `${roundedCents} cents sharp`;
        } else {
            this.centsDisplay.textContent = `${Math.abs(roundedCents)} cents flat`;
        }

        this.meterIndicator.classList.remove('in-tune', 'close', 'far');
        const absOffset = Math.abs(centsOffset);
        if (absOffset <= 10) {
            this.meterIndicator.classList.add('in-tune');
        } else if (absOffset <= 30) {
            this.meterIndicator.classList.add('close');
        } else {
            this.meterIndicator.classList.add('far');
        }
    }

    handleCorrect() {
        if (!this.isRunning) return;

        this.score++;
        this.correctStreak++;
        this.updateScore();

        this.showSuccess();

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
        this.resetPitchMeter();
    }

    resetPitchMeter() {
        if (this.meterIndicator) {
            this.meterIndicator.style.left = '50%';
            this.meterIndicator.classList.remove('in-tune', 'close', 'far');
        }
        if (this.centsDisplay) {
            this.centsDisplay.textContent = '--';
        }
    }

    showListening() {
        this.statusIndicator.className = 'status-indicator listening';
        this.statusText.textContent = 'Listening...';
    }

    showSuccess() {
        this.statusIndicator.className = 'status-indicator success';
        this.statusText.textContent = 'Correct!';
        this.detectedNoteDisplay.textContent = '';
        this.resetPitchMeter();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FretboardTrainer();
});
