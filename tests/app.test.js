// Unit tests for app.js

// Mock AudioPitchDetector for testing
class MockAudioPitchDetector {
    constructor() {
        this.isListening = false;
        this.onPitchDetected = null;
        this.shouldFail = false;
        this.failMessage = 'Mock failure';
    }

    async start() {
        if (this.shouldFail) {
            return { success: false, error: this.failMessage };
        }
        this.isListening = true;
        return { success: true };
    }

    stop() {
        this.isListening = false;
    }

    // Helper to simulate pitch detection
    simulatePitch(frequency) {
        if (this.onPitchDetected && this.isListening) {
            this.onPitchDetected(frequency);
        }
    }
}

// Create mock DOM elements
function createMockDOM() {
    // Clear any existing test elements
    const existingContainer = document.getElementById('test-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const container = document.createElement('div');
    container.id = 'test-container';
    container.innerHTML = `
        <div id="note-display">?</div>
        <div id="string-display">Press Start to begin</div>
        <div id="status-indicator" class="status-indicator"></div>
        <span id="status-text">Ready</span>
        <div id="detected-note"></div>
        <button id="start-button">Start</button>
        <span id="score">0</span>
    `;
    document.body.appendChild(container);

    return {
        noteDisplay: document.getElementById('note-display'),
        stringDisplay: document.getElementById('string-display'),
        statusIndicator: document.getElementById('status-indicator'),
        statusText: document.getElementById('status-text'),
        startButton: document.getElementById('start-button'),
        scoreDisplay: document.getElementById('score'),
        detectedNoteDisplay: document.getElementById('detected-note')
    };
}

// Helper to create FretboardTrainer with mock detector
function createTestApp() {
    const dom = createMockDOM();

    // Store original AudioPitchDetector
    const OriginalDetector = window.AudioPitchDetector;

    // Replace with mock
    window.AudioPitchDetector = MockAudioPitchDetector;

    // Create app instance
    const app = new FretboardTrainer();

    // Restore original
    window.AudioPitchDetector = OriginalDetector;

    return { app, dom };
}

describe('FretboardTrainer - Constructor', () => {
    it('should create an instance with correct initial values', () => {
        const { app } = createTestApp();
        assert.notOk(app.isRunning);
        assert.equal(app.score, 0);
        assert.equal(app.correctStreak, 0);
        assert.equal(app.currentChallenge, null);
    });

    it('should have correct timing settings', () => {
        const { app } = createTestApp();
        assert.equal(app.successDisplayDuration, 800);
        assert.equal(app.detectionHoldTime, 150);
    });

    it('should initialize detection state', () => {
        const { app } = createTestApp();
        assert.equal(app.correctStartTime, null);
        assert.equal(app.lastDetectedNote, null);
    });

    it('should have reference to all DOM elements', () => {
        const { app } = createTestApp();
        assert.ok(app.noteDisplay);
        assert.ok(app.stringDisplay);
        assert.ok(app.statusIndicator);
        assert.ok(app.statusText);
        assert.ok(app.startButton);
        assert.ok(app.scoreDisplay);
        assert.ok(app.detectedNoteDisplay);
    });
});

describe('FretboardTrainer - Initial Display', () => {
    it('should show "?" in note display initially', () => {
        const { dom } = createTestApp();
        assert.equal(dom.noteDisplay.textContent, '?');
    });

    it('should show "Press Start to begin" in string display initially', () => {
        const { dom } = createTestApp();
        assert.equal(dom.stringDisplay.textContent, 'Press Start to begin');
    });

    it('should show "Ready" in status text initially', () => {
        const { dom } = createTestApp();
        assert.equal(dom.statusText.textContent, 'Ready');
    });

    it('should show "0" in score display initially', () => {
        const { dom } = createTestApp();
        assert.equal(dom.scoreDisplay.textContent, '0');
    });
});

describe('FretboardTrainer - startSession()', () => {
    it('should start the detector', async () => {
        const { app } = createTestApp();
        await app.startSession();
        assert.ok(app.detector.isListening);
        app.stopSession();
    });

    it('should set isRunning to true on successful start', async () => {
        const { app } = createTestApp();
        await app.startSession();
        assert.ok(app.isRunning);
        app.stopSession();
    });

    it('should reset score to 0', async () => {
        const { app } = createTestApp();
        app.score = 10;
        await app.startSession();
        assert.equal(app.score, 0);
        app.stopSession();
    });

    it('should reset correctStreak to 0', async () => {
        const { app } = createTestApp();
        app.correctStreak = 5;
        await app.startSession();
        assert.equal(app.correctStreak, 0);
        app.stopSession();
    });

    it('should change button text to "Stop"', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        assert.equal(dom.startButton.textContent, 'Stop');
        app.stopSession();
    });

    it('should add "active" class to button', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        assert.ok(dom.startButton.classList.contains('active'));
        app.stopSession();
    });

    it('should set a current challenge', async () => {
        const { app } = createTestApp();
        await app.startSession();
        assert.ok(app.currentChallenge);
        assert.hasProperty(app.currentChallenge, 'note');
        assert.hasProperty(app.currentChallenge, 'string');
        app.stopSession();
    });

    it('should display the challenge note', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        assert.ok(Fretboard.NOTE_NAMES.includes(dom.noteDisplay.textContent));
        app.stopSession();
    });

    it('should display the challenge string', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        assert.ok(dom.stringDisplay.textContent.includes('string'));
        app.stopSession();
    });

    it('should show "Listening..." status', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        assert.equal(dom.statusText.textContent, 'Listening...');
        app.stopSession();
    });

    it('should handle microphone failure', async () => {
        const { app, dom } = createTestApp();
        app.detector.shouldFail = true;
        app.detector.failMessage = 'Test failure message';
        await app.startSession();
        assert.notOk(app.isRunning);
        assert.equal(dom.statusText.textContent, 'Test failure message');
    });

    it('should show error indicator on failure', async () => {
        const { app, dom } = createTestApp();
        app.detector.shouldFail = true;
        await app.startSession();
        assert.ok(dom.statusIndicator.classList.contains('error'));
    });
});

describe('FretboardTrainer - stopSession()', () => {
    it('should set isRunning to false', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.stopSession();
        assert.notOk(app.isRunning);
    });

    it('should stop the detector', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.stopSession();
        assert.notOk(app.detector.isListening);
    });

    it('should change button text back to "Start"', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.stopSession();
        assert.equal(dom.startButton.textContent, 'Start');
    });

    it('should remove "active" class from button', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.stopSession();
        assert.notOk(dom.startButton.classList.contains('active'));
    });

    it('should show waiting state', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.stopSession();
        assert.equal(dom.noteDisplay.textContent, '?');
        assert.equal(dom.statusText.textContent, 'Ready');
    });
});

describe('FretboardTrainer - toggleSession()', () => {
    it('should start session when not running', async () => {
        const { app } = createTestApp();
        await app.toggleSession();
        assert.ok(app.isRunning);
        app.stopSession();
    });

    it('should stop session when running', async () => {
        const { app } = createTestApp();
        await app.startSession();
        await app.toggleSession();
        assert.notOk(app.isRunning);
    });
});

describe('FretboardTrainer - nextChallenge()', () => {
    it('should set a new challenge', async () => {
        const { app } = createTestApp();
        await app.startSession();
        const firstChallenge = app.currentChallenge;
        app.nextChallenge();
        assert.ok(app.currentChallenge);
        // Note: May randomly get same challenge, so just check it's set
        app.stopSession();
    });

    it('should reset correctStartTime', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.correctStartTime = Date.now();
        app.nextChallenge();
        assert.equal(app.correctStartTime, null);
        app.stopSession();
    });

    it('should reset lastDetectedNote', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.lastDetectedNote = 'A';
        app.nextChallenge();
        assert.equal(app.lastDetectedNote, null);
        app.stopSession();
    });

    it('should update note display', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.nextChallenge();
        assert.ok(Fretboard.NOTE_NAMES.includes(dom.noteDisplay.textContent));
        app.stopSession();
    });

    it('should update string display', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.nextChallenge();
        assert.ok(dom.stringDisplay.textContent.includes('string'));
        app.stopSession();
    });

    it('should show listening status', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.nextChallenge();
        assert.ok(dom.statusIndicator.classList.contains('listening'));
        app.stopSession();
    });
});

describe('FretboardTrainer - handlePitchDetected()', () => {
    it('should ignore if not running', async () => {
        const { app, dom } = createTestApp();
        app.handlePitchDetected(440);
        assert.equal(dom.detectedNoteDisplay.textContent, '');
    });

    it('should ignore if no current challenge', async () => {
        const { app } = createTestApp();
        app.isRunning = true;
        app.currentChallenge = null;
        app.handlePitchDetected(440);
        // Should not throw
    });

    it('should update detected note display', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.handlePitchDetected(440);
        assert.ok(dom.detectedNoteDisplay.textContent.includes('A'));
        app.stopSession();
    });

    it('should start timing when correct note detected', async () => {
        const { app } = createTestApp();
        await app.startSession();
        // Force a known challenge
        app.currentChallenge = { note: 'A', frequency: 440, string: 1, fret: 5 };
        app.handlePitchDetected(440);
        assert.ok(app.correctStartTime !== null);
        app.stopSession();
    });

    it('should reset timing when wrong note detected', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.currentChallenge = { note: 'A', frequency: 440, string: 1, fret: 5 };
        app.correctStartTime = Date.now();
        // Play wrong note (C = ~262Hz)
        app.handlePitchDetected(262);
        assert.equal(app.correctStartTime, null);
        app.stopSession();
    });
});

describe('FretboardTrainer - handleCorrect()', () => {
    it('should increment score', async () => {
        const { app } = createTestApp();
        await app.startSession();
        const initialScore = app.score;
        app.handleCorrect();
        assert.equal(app.score, initialScore + 1);
        app.stopSession();
    });

    it('should increment correctStreak', async () => {
        const { app } = createTestApp();
        await app.startSession();
        const initialStreak = app.correctStreak;
        app.handleCorrect();
        assert.equal(app.correctStreak, initialStreak + 1);
        app.stopSession();
    });

    it('should update score display', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.handleCorrect();
        assert.equal(dom.scoreDisplay.textContent, '1');
        app.stopSession();
    });

    it('should show success status', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();
        app.handleCorrect();
        assert.ok(dom.statusIndicator.classList.contains('success'));
        assert.equal(dom.statusText.textContent, 'Correct!');
        app.stopSession();
    });

    it('should clear current challenge temporarily', async () => {
        const { app } = createTestApp();
        await app.startSession();
        app.handleCorrect();
        assert.equal(app.currentChallenge, null);
        app.stopSession();
    });

    it('should not increment score if not running', async () => {
        const { app } = createTestApp();
        app.score = 0;
        app.isRunning = false;
        app.handleCorrect();
        assert.equal(app.score, 0);
    });
});

describe('FretboardTrainer - updateScore()', () => {
    it('should update score display to current score', () => {
        const { app, dom } = createTestApp();
        app.score = 42;
        app.updateScore();
        assert.equal(dom.scoreDisplay.textContent, '42');
    });

    it('should handle zero score', () => {
        const { app, dom } = createTestApp();
        app.score = 0;
        app.updateScore();
        assert.equal(dom.scoreDisplay.textContent, '0');
    });

    it('should handle large scores', () => {
        const { app, dom } = createTestApp();
        app.score = 9999;
        app.updateScore();
        assert.equal(dom.scoreDisplay.textContent, '9999');
    });
});

describe('FretboardTrainer - Display State Methods', () => {
    it('showWaiting should set correct display state', () => {
        const { app, dom } = createTestApp();
        app.showWaiting();
        assert.equal(dom.noteDisplay.textContent, '?');
        assert.equal(dom.stringDisplay.textContent, 'Press Start to begin');
        assert.equal(dom.statusText.textContent, 'Ready');
        assert.equal(dom.detectedNoteDisplay.textContent, '');
    });

    it('showListening should set correct display state', () => {
        const { app, dom } = createTestApp();
        app.showListening();
        assert.ok(dom.statusIndicator.classList.contains('listening'));
        assert.equal(dom.statusText.textContent, 'Listening...');
    });

    it('showSuccess should set correct display state', () => {
        const { app, dom } = createTestApp();
        app.showSuccess();
        assert.ok(dom.statusIndicator.classList.contains('success'));
        assert.equal(dom.statusText.textContent, 'Correct!');
        assert.equal(dom.detectedNoteDisplay.textContent, '');
    });
});

describe('FretboardTrainer - Button Click Handler', () => {
    it('should toggle session when button clicked', async () => {
        const { app, dom } = createTestApp();

        // Simulate click - start
        dom.startButton.click();
        // Wait for async
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.ok(app.isRunning);

        // Simulate click - stop
        dom.startButton.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        assert.notOk(app.isRunning);
    });
});

describe('FretboardTrainer - Full Session Flow', () => {
    it('should complete a full correct answer cycle', async () => {
        const { app, dom } = createTestApp();
        await app.startSession();

        // Get the current challenge
        const challenge = app.currentChallenge;
        const targetFreq = challenge.frequency;

        // Simulate playing correct note
        app.handlePitchDetected(targetFreq);
        assert.ok(app.correctStartTime !== null);

        // Wait for hold time
        await new Promise(resolve => setTimeout(resolve, 200));

        // Play correct note again to trigger handleCorrect
        app.handlePitchDetected(targetFreq);

        // Score should have incremented
        assert.equal(app.score, 1);

        app.stopSession();
    });

    it('should maintain score across multiple correct answers', async () => {
        const { app } = createTestApp();
        await app.startSession();

        // Manually trigger 5 correct answers
        for (let i = 0; i < 5; i++) {
            app.currentChallenge = { note: 'A', frequency: 440, string: 1, fret: 5 };
            app.handleCorrect();
            // Wait for next challenge
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        assert.equal(app.score, 5);
        app.stopSession();
    });
});
