// Audio capture and pitch detection using Web Audio API

class AudioPitchDetector {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isListening = false;
        this.onPitchDetected = null;

        // Audio analysis settings
        this.fftSize = 2048;
        this.minFrequency = 70;   // Below low E (82 Hz)
        this.maxFrequency = 1200; // Well above highest fret on high E
    }

    async start() {
        if (this.isListening) return { success: true };

        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return {
                success: false,
                error: 'Your browser does not support microphone access. Please use Chrome, Firefox, or Edge.'
            };
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;

            source.connect(this.analyser);
            this.isListening = true;

            this.detectPitch();
            return { success: true };
        } catch (error) {
            console.error('Error starting audio:', error);
            let errorMsg = 'Microphone access denied';

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMsg = 'Microphone permission denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMsg = 'No microphone found. Please connect a microphone.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMsg = 'Microphone is in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMsg = 'Microphone constraints cannot be satisfied.';
            } else if (error.name === 'SecurityError') {
                errorMsg = 'Microphone access blocked. Try using HTTPS or localhost.';
            } else {
                errorMsg = `Microphone error: ${error.message || error.name || 'Unknown error'}`;
            }

            return { success: false, error: errorMsg };
        }
    }

    stop() {
        this.isListening = false;

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    detectPitch() {
        if (!this.isListening) return;

        const buffer = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(buffer);

        const frequency = this.autoCorrelate(buffer, this.audioContext.sampleRate);

        if (this.onPitchDetected && frequency > 0) {
            this.onPitchDetected(frequency);
        }

        requestAnimationFrame(() => this.detectPitch());
    }

    // Autocorrelation-based pitch detection algorithm
    autoCorrelate(buffer, sampleRate) {
        // Check if there's enough signal
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);

        // Not enough signal
        if (rms < 0.01) return -1;

        // Find the first point where the signal crosses zero (going up)
        let start = 0;
        for (let i = 0; i < buffer.length / 2; i++) {
            if (buffer[i] < 0 && buffer[i + 1] >= 0) {
                start = i;
                break;
            }
        }

        // Find the end point
        let end = buffer.length - 1;
        for (let i = buffer.length - 1; i >= buffer.length / 2; i--) {
            if (buffer[i] < 0 && buffer[i - 1] >= 0) {
                end = i;
                break;
            }
        }

        // Trim the buffer
        const trimmedBuffer = buffer.slice(start, end);
        const size = trimmedBuffer.length;

        // Autocorrelation
        const correlations = new Array(size).fill(0);
        for (let lag = 0; lag < size; lag++) {
            let sum = 0;
            for (let i = 0; i < size - lag; i++) {
                sum += trimmedBuffer[i] * trimmedBuffer[i + lag];
            }
            correlations[lag] = sum;
        }

        // Find the first peak after the initial decline
        let foundPeak = false;
        let peakLag = 0;

        // Skip the initial correlation at lag 0 (always highest)
        // Look for where correlation starts declining, then find next peak
        let prevCorr = correlations[0];
        for (let lag = 1; lag < size; lag++) {
            const corr = correlations[lag];

            if (!foundPeak) {
                // Looking for the correlation to start going back up
                if (corr > prevCorr && prevCorr < correlations[0] * 0.5) {
                    foundPeak = true;
                    peakLag = lag;
                }
            } else {
                // Found start of peak, now find the actual maximum
                if (corr > correlations[peakLag]) {
                    peakLag = lag;
                } else if (corr < correlations[peakLag] * 0.9) {
                    // We've passed the peak
                    break;
                }
            }
            prevCorr = corr;
        }

        if (peakLag === 0) return -1;

        // Parabolic interpolation for better precision
        const y1 = correlations[peakLag - 1] || 0;
        const y2 = correlations[peakLag];
        const y3 = correlations[peakLag + 1] || 0;

        const refinedLag = peakLag + (y3 - y1) / (2 * (2 * y2 - y1 - y3));

        const frequency = sampleRate / refinedLag;

        // Filter out frequencies outside guitar range
        if (frequency < this.minFrequency || frequency > this.maxFrequency) {
            return -1;
        }

        return frequency;
    }
}

// Export for use in other modules
window.AudioPitchDetector = AudioPitchDetector;
