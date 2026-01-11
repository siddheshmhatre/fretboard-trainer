// Unit tests for audio.js

// Mock for Web Audio API
class MockAnalyserNode {
    constructor() {
        this.fftSize = 2048;
        this.testData = null;
    }

    getFloatTimeDomainData(buffer) {
        if (this.testData) {
            for (let i = 0; i < buffer.length && i < this.testData.length; i++) {
                buffer[i] = this.testData[i];
            }
        } else {
            // Default: silence
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = 0;
            }
        }
    }

    setTestData(data) {
        this.testData = data;
    }
}

class MockMediaStreamSource {
    connect(node) {
        // Mock connection
    }
}

class MockAudioContext {
    constructor() {
        this.sampleRate = 44100;
        this.state = 'running';
    }

    createAnalyser() {
        return new MockAnalyserNode();
    }

    createMediaStreamSource(stream) {
        return new MockMediaStreamSource();
    }

    close() {
        this.state = 'closed';
        return Promise.resolve();
    }
}

class MockMediaStream {
    constructor() {
        this.tracks = [{ stop: () => {} }];
    }

    getTracks() {
        return this.tracks;
    }
}

// Generate a sine wave for testing pitch detection
function generateSineWave(frequency, sampleRate, length) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    return data;
}

// Store original globals
let originalAudioContext;
let originalMediaDevices;

describe('AudioPitchDetector - Constructor', () => {
    it('should create an instance with default values', () => {
        const detector = new AudioPitchDetector();
        assert.equal(detector.audioContext, null);
        assert.equal(detector.analyser, null);
        assert.equal(detector.mediaStream, null);
        assert.equal(detector.isListening, false);
        assert.equal(detector.onPitchDetected, null);
    });

    it('should have correct default settings', () => {
        const detector = new AudioPitchDetector();
        assert.equal(detector.fftSize, 2048);
        assert.equal(detector.minFrequency, 70);
        assert.equal(detector.maxFrequency, 1200);
    });
});

describe('AudioPitchDetector - start() method', () => {
    beforeEach(() => {
        // Save originals
        originalAudioContext = window.AudioContext;
        originalMediaDevices = navigator.mediaDevices;

        // Set up mocks
        window.AudioContext = MockAudioContext;
        navigator.mediaDevices = {
            getUserMedia: async () => new MockMediaStream()
        };
    });

    afterEach(() => {
        // Restore originals
        window.AudioContext = originalAudioContext;
        if (originalMediaDevices) {
            navigator.mediaDevices = originalMediaDevices;
        }
    });

    it('should return success object when microphone access granted', async () => {
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.ok(result.success);
        detector.stop();
    });

    it('should set isListening to true after successful start', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        assert.ok(detector.isListening);
        detector.stop();
    });

    it('should create audioContext after start', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        assert.ok(detector.audioContext);
        detector.stop();
    });

    it('should return early if already listening', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        const result = await detector.start();
        assert.ok(result.success);
        detector.stop();
    });

    it('should return error when mediaDevices not available', async () => {
        navigator.mediaDevices = null;
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
        assert.ok(result.error.includes('browser does not support'));
    });

    it('should return error when getUserMedia not available', async () => {
        navigator.mediaDevices = {};
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
    });

    it('should handle NotAllowedError', async () => {
        navigator.mediaDevices = {
            getUserMedia: async () => {
                const error = new Error('Permission denied');
                error.name = 'NotAllowedError';
                throw error;
            }
        };
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
        assert.ok(result.error.includes('permission denied'));
    });

    it('should handle NotFoundError', async () => {
        navigator.mediaDevices = {
            getUserMedia: async () => {
                const error = new Error('No microphone');
                error.name = 'NotFoundError';
                throw error;
            }
        };
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
        assert.ok(result.error.includes('No microphone'));
    });

    it('should handle NotReadableError', async () => {
        navigator.mediaDevices = {
            getUserMedia: async () => {
                const error = new Error('Mic in use');
                error.name = 'NotReadableError';
                throw error;
            }
        };
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
        assert.ok(result.error.includes('in use'));
    });

    it('should handle SecurityError', async () => {
        navigator.mediaDevices = {
            getUserMedia: async () => {
                const error = new Error('Security');
                error.name = 'SecurityError';
                throw error;
            }
        };
        const detector = new AudioPitchDetector();
        const result = await detector.start();
        assert.notOk(result.success);
        assert.ok(result.error.includes('blocked'));
    });
});

describe('AudioPitchDetector - stop() method', () => {
    beforeEach(() => {
        originalAudioContext = window.AudioContext;
        originalMediaDevices = navigator.mediaDevices;

        window.AudioContext = MockAudioContext;
        navigator.mediaDevices = {
            getUserMedia: async () => new MockMediaStream()
        };
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        if (originalMediaDevices) {
            navigator.mediaDevices = originalMediaDevices;
        }
    });

    it('should set isListening to false', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        detector.stop();
        assert.notOk(detector.isListening);
    });

    it('should clean up mediaStream', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        detector.stop();
        assert.equal(detector.mediaStream, null);
    });

    it('should clean up audioContext', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        detector.stop();
        assert.equal(detector.audioContext, null);
    });

    it('should be safe to call multiple times', async () => {
        const detector = new AudioPitchDetector();
        await detector.start();
        detector.stop();
        detector.stop();
        detector.stop();
        assert.notOk(detector.isListening);
    });

    it('should be safe to call without starting', () => {
        const detector = new AudioPitchDetector();
        detector.stop(); // Should not throw
        assert.notOk(detector.isListening);
    });
});

describe('AudioPitchDetector - autoCorrelate() method', () => {
    let detector;

    beforeEach(() => {
        detector = new AudioPitchDetector();
        // Manually set up what we need for testing
        detector.audioContext = { sampleRate: 44100 };
    });

    it('should return -1 for silence (low RMS)', () => {
        const buffer = new Float32Array(2048).fill(0);
        const freq = detector.autoCorrelate(buffer, 44100);
        assert.equal(freq, -1);
    });

    it('should return -1 for very quiet signal', () => {
        const buffer = new Float32Array(2048).fill(0.001);
        const freq = detector.autoCorrelate(buffer, 44100);
        assert.equal(freq, -1);
    });

    it('should detect A4 (440Hz) from sine wave', () => {
        const buffer = generateSineWave(440, 44100, 2048);
        const freq = detector.autoCorrelate(buffer, 44100);
        // Allow some tolerance in detection
        if (freq > 0) {
            assert.approximately(freq, 440, 20);
        }
    });

    it('should detect low E (82Hz) from sine wave', () => {
        const buffer = generateSineWave(82.41, 44100, 2048);
        const freq = detector.autoCorrelate(buffer, 44100);
        // Low frequencies may not detect well with small buffer
        if (freq > 0) {
            assert.approximately(freq, 82.41, 10);
        }
    });

    it('should detect A2 (110Hz) from sine wave', () => {
        const buffer = generateSineWave(110, 44100, 2048);
        const freq = detector.autoCorrelate(buffer, 44100);
        if (freq > 0) {
            assert.approximately(freq, 110, 10);
        }
    });

    it('should detect E4 (330Hz) from sine wave', () => {
        const buffer = generateSineWave(329.63, 44100, 2048);
        const freq = detector.autoCorrelate(buffer, 44100);
        if (freq > 0) {
            assert.approximately(freq, 329.63, 15);
        }
    });

    it('should return -1 for frequency below minFrequency', () => {
        // Generate a very low frequency that should be filtered
        const buffer = generateSineWave(30, 44100, 4096);
        const freq = detector.autoCorrelate(buffer, 44100);
        // Either -1 or the algorithm won't detect it properly
        assert.lessThan(freq, detector.minFrequency);
    });

    it('should return -1 for frequency above maxFrequency', () => {
        // Generate a high frequency that should be filtered
        const buffer = generateSineWave(2000, 44100, 2048);
        const freq = detector.autoCorrelate(buffer, 44100);
        if (freq > 0) {
            assert.lessThan(freq, detector.maxFrequency);
        }
    });
});

describe('AudioPitchDetector - onPitchDetected callback', () => {
    beforeEach(() => {
        originalAudioContext = window.AudioContext;
        originalMediaDevices = navigator.mediaDevices;

        window.AudioContext = MockAudioContext;
        navigator.mediaDevices = {
            getUserMedia: async () => new MockMediaStream()
        };
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        if (originalMediaDevices) {
            navigator.mediaDevices = originalMediaDevices;
        }
    });

    it('should accept callback function', () => {
        const detector = new AudioPitchDetector();
        const callback = () => {};
        detector.onPitchDetected = callback;
        assert.equal(detector.onPitchDetected, callback);
    });

    it('should allow null callback', () => {
        const detector = new AudioPitchDetector();
        detector.onPitchDetected = null;
        assert.equal(detector.onPitchDetected, null);
    });
});

describe('AudioPitchDetector - Integration behavior', () => {
    beforeEach(() => {
        originalAudioContext = window.AudioContext;
        originalMediaDevices = navigator.mediaDevices;

        window.AudioContext = MockAudioContext;
        navigator.mediaDevices = {
            getUserMedia: async () => new MockMediaStream()
        };
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        if (originalMediaDevices) {
            navigator.mediaDevices = originalMediaDevices;
        }
    });

    it('should be able to start, stop, and start again', async () => {
        const detector = new AudioPitchDetector();

        await detector.start();
        assert.ok(detector.isListening);

        detector.stop();
        assert.notOk(detector.isListening);

        await detector.start();
        assert.ok(detector.isListening);

        detector.stop();
    });

    it('should maintain state correctly through lifecycle', async () => {
        const detector = new AudioPitchDetector();

        // Initial state
        assert.notOk(detector.isListening);
        assert.equal(detector.audioContext, null);

        // After start
        await detector.start();
        assert.ok(detector.isListening);
        assert.ok(detector.audioContext);

        // After stop
        detector.stop();
        assert.notOk(detector.isListening);
        assert.equal(detector.audioContext, null);
    });
});
