// Main application logic for Fretboard Trainer

class FretboardTrainer {
    constructor() {
        this.pitchDetector = new AudioPitchDetector();
        this.speechDetector = new SpeechNoteDetector();
        this.fretboardDiagram = new FretboardDiagram('fretboard-diagram');

        this.currentChallenge = null;
        this.isRunning = false;
        this.score = 0;
        this.correctStreak = 0;
        this.level = parseInt(localStorage.getItem('fretboardLevel')) || 1;

        // Timing settings
        this.successDisplayDuration = 800; // ms to show success before next card
        this.detectionHoldTime = 150; // ms the correct note must be held

        // Detection state
        this.correctStartTime = null;

        // DOM elements
        this.noteDisplay = document.getElementById('note-display');
        this.fretDisplay = document.getElementById('fret-display');
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
        this.initLevelSelector();

        // Set up pitch detector callback (for levels 1 and 3)
        this.pitchDetector.onPitchDetected = (frequency, probability) => {
            this.handlePitchDetected(frequency, probability);
        };

        // Set up speech detector callbacks (for level 2)
        this.speechDetector.onNoteDetected = (noteName) => {
            this.handleSpeechDetected(noteName);
        };

        this.speechDetector.onRawTranscript = (transcript) => {
            // Show raw transcript for debugging
            if (this.level === 2) {
                this.detectedNoteDisplay.textContent = `Raw: "${transcript}"`;
            }
        };

        this.speechDetector.onSpeechStart = () => {
            if (this.level === 2 && this.isRunning) {
                this.statusText.textContent = 'Hearing you...';
            }
        };

        this.speechDetector.onSpeechEnd = () => {
            if (this.level === 2 && this.isRunning) {
                this.statusText.textContent = 'Processing...';
            }
        };

        this.speechDetector.onError = (error) => {
            if (this.level === 2 && this.isRunning) {
                this.detectedNoteDisplay.textContent = `Speech error: ${error}`;
            }
        };

        this.showWaiting();
    }

    initLevelSelector() {
        const buttons = document.querySelectorAll('.level-btn');
        buttons.forEach(btn => {
            const level = parseInt(btn.dataset.level);
            if (level === this.level) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            btn.addEventListener('click', () => this.setLevel(level));
        });
    }

    setLevel(level) {
        const oldLevel = this.level;
        this.level = level;
        localStorage.setItem('fretboardLevel', level);

        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
        });

        if (this.isRunning) {
            // Switch detectors if needed
            const wasUsingPitch = oldLevel !== 2;
            const needsPitch = level !== 2;

            if (wasUsingPitch && !needsPitch) {
                // Switching from pitch to speech
                this.pitchDetector.stop();
                this.speechDetector.start();
            } else if (!wasUsingPitch && needsPitch) {
                // Switching from speech to pitch
                this.speechDetector.stop();
                this.pitchDetector.start();
            }

            this.nextChallenge();
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
        // Start appropriate detector based on level
        let result;
        if (this.level === 2) {
            result = await this.speechDetector.start();
        } else {
            result = await this.pitchDetector.start();
        }

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
        this.pitchDetector.stop();
        this.speechDetector.stop();

        this.startButton.textContent = 'Start';
        this.startButton.classList.remove('active');

        this.showWaiting();
    }

    nextChallenge() {
        this.currentChallenge = Fretboard.getRandomChallenge();
        this.correctStartTime = null;

        this.updateDisplay();
        this.showListening();
    }

    updateDisplay() {
        const challenge = this.currentChallenge;
        const fretText = Fretboard.getFretDisplay(challenge.fret);
        const stringText = Fretboard.getStringName(challenge.string);

        switch (this.level) {
            case 1:
                // Visual learning: show note + fret/string + fretboard diagram
                this.noteDisplay.textContent = challenge.note;
                this.fretDisplay.textContent = `${fretText}, ${stringText}`;
                this.stringDisplay.textContent = 'Play the note shown above';
                this.fretboardDiagram.show(challenge.string, challenge.fret);
                break;
            case 2:
                // Position recognition: show fret + string, user speaks the note
                this.noteDisplay.textContent = fretText;
                this.fretDisplay.textContent = '';
                this.stringDisplay.textContent = stringText;
                this.fretboardDiagram.hide();
                break;
            case 3:
            default:
                // Note location: show note + string only (current behavior)
                this.noteDisplay.textContent = challenge.note;
                this.fretDisplay.textContent = '';
                this.stringDisplay.textContent = stringText;
                this.fretboardDiagram.hide();
                break;
        }
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

    handleSpeechDetected(spokenNote) {
        if (!this.isRunning || !this.currentChallenge) return;
        if (this.level !== 2) return;

        // Check if spoken note matches target
        if (spokenNote === this.currentChallenge.note) {
            this.detectedNoteDisplay.textContent = `Heard: "${spokenNote}"`;
            this.handleCorrect();
        } else {
            // Show incorrect feedback
            this.detectedNoteDisplay.textContent = `Heard: "${spokenNote}" - Try again!`;
            this.statusIndicator.className = 'status-indicator error';
            this.statusText.textContent = `Not quite - say the note for this position`;

            // Reset back to listening state after brief delay
            setTimeout(() => {
                if (this.isRunning && this.level === 2) {
                    this.showListening();
                }
            }, 1500);
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
        this.fretDisplay.textContent = '';
        this.stringDisplay.textContent = 'Press Start to begin';
        this.statusIndicator.className = 'status-indicator';
        this.statusText.textContent = 'Ready';
        this.detectedNoteDisplay.textContent = '';
        this.resetPitchMeter();
        this.fretboardDiagram.hide();
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
        if (this.level === 2) {
            this.statusText.textContent = 'Say the note name...';
        } else {
            this.statusText.textContent = 'Listening...';
        }
    }

    showSuccess() {
        this.statusIndicator.className = 'status-indicator success';
        this.statusText.textContent = 'Correct!';
        this.detectedNoteDisplay.textContent = '';
        this.resetPitchMeter();
        this.fretboardDiagram.hide();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FretboardTrainer();
});
