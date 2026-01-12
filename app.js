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

        // Pitch meter elements
        this.pitchMeter = document.getElementById('pitch-meter');
        this.meterIndicator = document.getElementById('meter-indicator');
        this.centsDisplay = document.getElementById('cents-display');

        // Calibration elements
        this.calibrateButton = document.getElementById('calibrate-button');
        this.calibrationModal = document.getElementById('calibration-modal');
        this.calibrationStringNum = document.getElementById('calibration-string-num');
        this.calibrationStringNote = document.getElementById('calibration-string-note');
        this.calibrationProgressBar = document.getElementById('calibration-progress-bar');
        this.calibrationStatus = document.getElementById('calibration-status');
        this.calibrationSkip = document.getElementById('calibration-skip');
        this.calibrationCancel = document.getElementById('calibration-cancel');

        // Calibration state
        this.isCalibrating = false;
        this.calibrationStep = 0;
        this.calibrationSamples = [];
        this.calibrationStartTime = null;
        this.calibrationDuration = 2000; // 2 seconds per string
        this.calibrationOffsets = this.loadCalibration();

        // Difficulty/tolerance setting
        this.difficultySelect = document.getElementById('difficulty');
        this.tolerance = this.loadTolerance();

        this.init();
    }

    init() {
        this.startButton.addEventListener('click', () => this.toggleSession());

        // Mode toggle button
        if (this.modeToggle) {
            this.modeToggle.addEventListener('click', () => this.toggleMode());
        }

        // Calibration buttons
        if (this.calibrateButton) {
            this.calibrateButton.addEventListener('click', () => this.startCalibration());
        }
        if (this.calibrationSkip) {
            this.calibrationSkip.addEventListener('click', () => this.skipCalibrationString());
        }
        if (this.calibrationCancel) {
            this.calibrationCancel.addEventListener('click', () => this.cancelCalibration());
        }

        // Difficulty selector
        if (this.difficultySelect) {
            this.difficultySelect.value = this.tolerance.toString();
            this.difficultySelect.addEventListener('change', () => {
                this.tolerance = parseInt(this.difficultySelect.value, 10);
                this.saveTolerance();
            });
        }

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        this.detector.onPitchDetected = (frequency, probability) => {
            if (this.isCalibrating) {
                this.handleCalibrationPitch(frequency, probability);
            } else {
                this.handlePitchDetected(frequency, probability);
            }
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

    handlePitchDetected(frequency, probability = 1) {
        if (!this.isRunning || !this.currentChallenge) return;

        const noteInfo = Fretboard.frequencyToNote(frequency);
        if (!noteInfo) return;

        // Update detected note display with confidence indicator
        const confidencePercent = Math.round(probability * 100);
        this.detectedNoteDisplay.textContent = `Hearing: ${noteInfo.note}${noteInfo.octave} (${confidencePercent}%)`;

        // Get calibrated target frequency
        const calibratedTarget = this.getCalibratedTargetFrequency(
            this.currentChallenge.frequency,
            this.currentChallenge.string
        );

        // Calculate cents offset from calibrated target
        const centsOffset = this.calculateCentsOffset(frequency, calibratedTarget);
        this.updatePitchMeter(centsOffset);

        // Check if it matches the target note (using calibrated frequency and tolerance)
        const isMatch = Fretboard.isNoteMatch(
            frequency,
            calibratedTarget,
            this.tolerance
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
        // Convert frequency ratio to cents (1200 cents = 1 octave)
        return 1200 * Math.log2(detectedFreq / targetFreq);
    }

    updatePitchMeter(centsOffset) {
        if (!this.meterIndicator || !this.centsDisplay) return;

        // Clamp offset to display range (-50 to +50 cents)
        const clampedOffset = Math.max(-50, Math.min(50, centsOffset));

        // Convert to percentage position (0% = -50 cents, 100% = +50 cents)
        const position = ((clampedOffset + 50) / 100) * 100;
        this.meterIndicator.style.left = `${position}%`;

        // Update cents display text
        const roundedCents = Math.round(centsOffset);
        if (Math.abs(roundedCents) < 3) {
            this.centsDisplay.textContent = 'In tune';
        } else if (roundedCents > 0) {
            this.centsDisplay.textContent = `${roundedCents} cents sharp`;
        } else {
            this.centsDisplay.textContent = `${Math.abs(roundedCents)} cents flat`;
        }

        // Update indicator styling based on how close to center
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

    // Calibration methods
    async startCalibration() {
        if (this.isRunning) {
            this.stopSession();
        }

        // Start audio detection
        const result = await this.detector.start();
        if (!result.success) {
            alert('Cannot start calibration: ' + result.error);
            return;
        }

        this.isCalibrating = true;
        this.calibrationStep = 0;
        this.calibrationOffsets = {};

        this.showCalibrationModal();
        this.showCalibrationString(6); // Start with string 6 (low E)
    }

    showCalibrationModal() {
        if (this.calibrationModal) {
            this.calibrationModal.classList.remove('hidden');
        }
    }

    hideCalibrationModal() {
        if (this.calibrationModal) {
            this.calibrationModal.classList.add('hidden');
        }
    }

    showCalibrationString(stringNum) {
        const stringNotes = {
            6: 'Low E',
            5: 'A',
            4: 'D',
            3: 'G',
            2: 'B',
            1: 'High E'
        };

        this.currentCalibrationString = stringNum;
        this.calibrationSamples = [];
        this.calibrationStartTime = null;

        if (this.calibrationStringNum) {
            this.calibrationStringNum.textContent = Fretboard.getStringName(stringNum);
        }
        if (this.calibrationStringNote) {
            this.calibrationStringNote.textContent = `(${stringNotes[stringNum]})`;
        }
        if (this.calibrationProgressBar) {
            this.calibrationProgressBar.style.width = '0%';
        }
        if (this.calibrationStatus) {
            this.calibrationStatus.textContent = 'Listening...';
            this.calibrationStatus.className = 'calibration-status';
        }
    }

    handleCalibrationPitch(frequency, probability) {
        if (!this.isCalibrating || probability < 0.8) return;

        const expectedFreq = Fretboard.OPEN_STRINGS[this.currentCalibrationString].frequency;

        // Check if detected frequency is roughly correct (within 1 semitone)
        const centsOff = 1200 * Math.log2(frequency / expectedFreq);
        if (Math.abs(centsOff) > 100) {
            // Wrong note, reset
            this.calibrationStartTime = null;
            this.calibrationSamples = [];
            if (this.calibrationProgressBar) {
                this.calibrationProgressBar.style.width = '0%';
            }
            if (this.calibrationStatus) {
                this.calibrationStatus.textContent = 'Wrong note detected, try again...';
                this.calibrationStatus.className = 'calibration-status error';
            }
            return;
        }

        // Start timing if this is the first valid sample
        if (this.calibrationStartTime === null) {
            this.calibrationStartTime = Date.now();
            if (this.calibrationStatus) {
                this.calibrationStatus.textContent = 'Hold the note...';
                this.calibrationStatus.className = 'calibration-status';
            }
        }

        // Collect sample
        this.calibrationSamples.push(frequency);

        // Update progress bar
        const elapsed = Date.now() - this.calibrationStartTime;
        const progress = Math.min(100, (elapsed / this.calibrationDuration) * 100);
        if (this.calibrationProgressBar) {
            this.calibrationProgressBar.style.width = `${progress}%`;
        }

        // Check if calibration for this string is complete
        if (elapsed >= this.calibrationDuration) {
            this.completeStringCalibration();
        }
    }

    completeStringCalibration() {
        // Calculate median frequency from samples
        const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
        const medianFreq = sorted[Math.floor(sorted.length / 2)];

        // Calculate offset in cents from expected frequency
        const expectedFreq = Fretboard.OPEN_STRINGS[this.currentCalibrationString].frequency;
        const offsetCents = 1200 * Math.log2(medianFreq / expectedFreq);

        this.calibrationOffsets[this.currentCalibrationString] = offsetCents;

        if (this.calibrationStatus) {
            const direction = offsetCents > 0 ? 'sharp' : 'flat';
            const absOffset = Math.abs(Math.round(offsetCents));
            this.calibrationStatus.textContent = `Calibrated! (${absOffset} cents ${direction})`;
            this.calibrationStatus.className = 'calibration-status success';
        }

        // Move to next string after a short delay
        setTimeout(() => {
            this.nextCalibrationString();
        }, 800);
    }

    nextCalibrationString() {
        const nextString = this.currentCalibrationString - 1;

        if (nextString >= 1) {
            this.showCalibrationString(nextString);
        } else {
            this.finishCalibration();
        }
    }

    skipCalibrationString() {
        // Use 0 offset for skipped strings
        this.calibrationOffsets[this.currentCalibrationString] = 0;
        this.nextCalibrationString();
    }

    cancelCalibration() {
        this.isCalibrating = false;
        this.detector.stop();
        this.hideCalibrationModal();
    }

    finishCalibration() {
        this.isCalibrating = false;
        this.detector.stop();
        this.hideCalibrationModal();

        // Save calibration to localStorage
        this.saveCalibration();

        // Show confirmation
        const offsetSummary = Object.entries(this.calibrationOffsets)
            .map(([string, cents]) => `String ${string}: ${Math.round(cents)} cents`)
            .join('\n');
        alert('Calibration complete!\n\n' + offsetSummary);
    }

    saveCalibration() {
        const calibrationData = {
            timestamp: Date.now(),
            offsets: this.calibrationOffsets
        };
        localStorage.setItem('fretboardTrainerCalibration', JSON.stringify(calibrationData));
    }

    loadCalibration() {
        try {
            const saved = localStorage.getItem('fretboardTrainerCalibration');
            if (saved) {
                const data = JSON.parse(saved);
                return data.offsets || {};
            }
        } catch (e) {
            console.error('Error loading calibration:', e);
        }
        return {};
    }

    saveTolerance() {
        localStorage.setItem('fretboardTrainerTolerance', this.tolerance.toString());
    }

    loadTolerance() {
        try {
            const saved = localStorage.getItem('fretboardTrainerTolerance');
            if (saved) {
                return parseInt(saved, 10);
            }
        } catch (e) {
            console.error('Error loading tolerance:', e);
        }
        return 50; // Default to intermediate
    }

    getCalibrationOffset(stringNum) {
        return this.calibrationOffsets[stringNum] || 0;
    }

    // Apply calibration offset to target frequency
    getCalibratedTargetFrequency(targetFreq, stringNum) {
        const offsetCents = this.getCalibrationOffset(stringNum);
        // Adjust target frequency based on calibration offset
        return targetFreq * Math.pow(2, offsetCents / 1200);
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
        this.resetPitchMeter();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FretboardTrainer();
});
