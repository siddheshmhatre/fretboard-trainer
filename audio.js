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

        // YIN algorithm settings
        this.yinThreshold = 0.15;  // Lower = stricter detection
        this.yinProbabilityThreshold = 0.8; // Reject detections below this confidence
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

        const result = this.yinDetect(buffer, this.audioContext.sampleRate);

        if (this.onPitchDetected && result.frequency > 0 && result.probability >= this.yinProbabilityThreshold) {
            this.onPitchDetected(result.frequency, result.probability);
        }

        requestAnimationFrame(() => this.detectPitch());
    }

    // YIN pitch detection algorithm
    // Based on "YIN, a fundamental frequency estimator for speech and music"
    // by Alain de Cheveigné and Hideki Kawahara
    yinDetect(buffer, sampleRate) {
        const bufferSize = buffer.length;
        const halfBuffer = Math.floor(bufferSize / 2);

        // Check if there's enough signal (RMS check)
        let rms = 0;
        for (let i = 0; i < bufferSize; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / bufferSize);

        // Not enough signal
        if (rms < 0.01) {
            return { frequency: -1, probability: 0 };
        }

        // Step 1 & 2: Compute the difference function d(tau) and
        // cumulative mean normalized difference d'(tau)
        const yinBuffer = new Float32Array(halfBuffer);

        // d(0) is always 0, d'(0) = 1 by definition
        yinBuffer[0] = 1;

        let runningSum = 0;

        for (let tau = 1; tau < halfBuffer; tau++) {
            // Compute difference function d(tau)
            let delta = 0;
            for (let i = 0; i < halfBuffer; i++) {
                const diff = buffer[i] - buffer[i + tau];
                delta += diff * diff;
            }

            // Cumulative mean normalized difference d'(tau)
            runningSum += delta;
            yinBuffer[tau] = delta * tau / runningSum;
        }

        // Step 3: Absolute threshold
        // Find the first tau where d'(tau) < threshold
        let tauEstimate = -1;
        for (let tau = 2; tau < halfBuffer; tau++) {
            if (yinBuffer[tau] < this.yinThreshold) {
                // Find the local minimum in this dip
                while (tau + 1 < halfBuffer && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++;
                }
                tauEstimate = tau;
                break;
            }
        }

        // No pitch found
        if (tauEstimate === -1) {
            return { frequency: -1, probability: 0 };
        }

        // Step 4: Parabolic interpolation for sub-sample precision
        let betterTau;
        if (tauEstimate > 0 && tauEstimate < halfBuffer - 1) {
            const s0 = yinBuffer[tauEstimate - 1];
            const s1 = yinBuffer[tauEstimate];
            const s2 = yinBuffer[tauEstimate + 1];

            // Parabolic interpolation
            const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
            if (isFinite(adjustment)) {
                betterTau = tauEstimate + adjustment;
            } else {
                betterTau = tauEstimate;
            }
        } else {
            betterTau = tauEstimate;
        }

        // Calculate frequency
        const frequency = sampleRate / betterTau;

        // Calculate probability/confidence (1 - d'(tau))
        const probability = 1 - yinBuffer[tauEstimate];

        // Filter out frequencies outside guitar range
        if (frequency < this.minFrequency || frequency > this.maxFrequency) {
            return { frequency: -1, probability: 0 };
        }

        return { frequency, probability };
    }
}

// Export for use in other modules
window.AudioPitchDetector = AudioPitchDetector;
