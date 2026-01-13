// Speech recognition for note detection using Web Speech API

class SpeechNoteDetector {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.onNoteDetected = null;
        this.onStatusChange = null;

        // Note name mappings (what user might say -> normalized note)
        this.noteMap = {
            'a': 'A',
            'b': 'B',
            'c': 'C',
            'd': 'D',
            'e': 'E',
            'f': 'F',
            'g': 'G',
            'a sharp': 'A#',
            'a-sharp': 'A#',
            'b sharp': 'C', // B# = C
            'c sharp': 'C#',
            'c-sharp': 'C#',
            'd sharp': 'D#',
            'd-sharp': 'D#',
            'e sharp': 'F', // E# = F
            'f sharp': 'F#',
            'f-sharp': 'F#',
            'g sharp': 'G#',
            'g-sharp': 'G#'
        };

        this.init();
    }

    init() {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            this.handleResult(event);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onError) {
                this.onError(event.error);
            }
            if (event.error === 'no-speech') {
                // Restart if no speech detected
                if (this.isListening) {
                    this.restartRecognition();
                }
            }
        };

        this.recognition.onend = () => {
            // Restart if still supposed to be listening
            if (this.isListening) {
                this.restartRecognition();
            }
        };

        this.recognition.onspeechstart = () => {
            if (this.onSpeechStart) {
                this.onSpeechStart();
            }
        };

        this.recognition.onspeechend = () => {
            if (this.onSpeechEnd) {
                this.onSpeechEnd();
            }
        };
    }

    async start() {
        if (!this.recognition) {
            return {
                success: false,
                error: 'Speech recognition not supported. Please use Chrome or Edge.'
            };
        }

        if (this.isListening) return { success: true };

        try {
            this.recognition.start();
            this.isListening = true;

            if (this.onStatusChange) {
                this.onStatusChange('listening');
            }

            return { success: true };
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            return {
                success: false,
                error: 'Failed to start speech recognition. Please check microphone permissions.'
            };
        }
    }

    stop() {
        this.isListening = false;

        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore errors when stopping
            }
        }

        if (this.onStatusChange) {
            this.onStatusChange('stopped');
        }
    }

    restartRecognition() {
        if (!this.isListening || !this.recognition) return;

        try {
            this.recognition.start();
        } catch (e) {
            // May already be running, ignore
        }
    }

    handleResult(event) {
        const lastResult = event.results[event.results.length - 1];

        if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            console.log('Heard:', transcript);

            // Report raw transcript for debugging
            if (this.onRawTranscript) {
                this.onRawTranscript(transcript);
            }

            const note = this.parseNote(transcript);
            if (note && this.onNoteDetected) {
                this.onNoteDetected(note);
            }
        }
    }

    parseNote(transcript) {
        // Clean up the transcript
        const cleaned = transcript
            .replace(/[.,!?]/g, '')
            .trim()
            .toLowerCase();

        console.log('Parsing transcript:', cleaned);

        // Try direct match first
        if (this.noteMap[cleaned]) {
            return this.noteMap[cleaned];
        }

        // Check for sharp patterns FIRST (before single note match)
        // Handle various ways "sharp" might be heard
        const sharpVariants = ['sharp', 'shop', 'shark', 'shap', 'chart', 'shart', 'chop'];
        for (const variant of sharpVariants) {
            const pattern = new RegExp(`([a-g])\\s*${variant}`, 'i');
            const match = cleaned.match(pattern);
            if (match) {
                const key = match[1].toLowerCase() + ' sharp';
                if (this.noteMap[key]) {
                    console.log('Matched sharp variant:', variant, '-> ', this.noteMap[key]);
                    return this.noteMap[key];
                }
            }
        }

        // Check if transcript contains "sharp" anywhere after a note letter
        const sharpPattern = /([a-g]).*?(sharp|#)/i;
        const sharpMatch = cleaned.match(sharpPattern);
        if (sharpMatch) {
            const key = sharpMatch[1].toLowerCase() + ' sharp';
            if (this.noteMap[key]) {
                return this.noteMap[key];
            }
        }

        // Only now try single letter match (if no sharp was found)
        // Must be just the letter or letter with filler words
        const singleNotePattern = /^([a-g])$/i;
        const singleMatch = cleaned.match(singleNotePattern);
        if (singleMatch) {
            return this.noteMap[singleMatch[1].toLowerCase()];
        }

        // If short phrase without sharp-like words, extract the note
        const hasSharpLikeWord = /sh|#/i.test(cleaned);
        if (!hasSharpLikeWord && cleaned.length <= 5) {
            const anyNotePattern = /\b([a-g])\b/i;
            const anyMatch = cleaned.match(anyNotePattern);
            if (anyMatch) {
                return this.noteMap[anyMatch[1].toLowerCase()];
            }
        }

        return null;
    }

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}

// Export for use in other modules
window.SpeechNoteDetector = SpeechNoteDetector;
