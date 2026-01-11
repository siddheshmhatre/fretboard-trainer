// Fretboard data model for standard 6-string guitar tuning (E-A-D-G-B-E)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning open string frequencies (Hz) and MIDI note numbers
// String numbers: 6 = low E, 1 = high E
const OPEN_STRINGS = {
    6: { note: 'E', octave: 2, frequency: 82.41, midi: 40 },
    5: { note: 'A', octave: 2, frequency: 110.00, midi: 45 },
    4: { note: 'D', octave: 3, frequency: 146.83, midi: 50 },
    3: { note: 'G', octave: 3, frequency: 196.00, midi: 55 },
    2: { note: 'B', octave: 3, frequency: 246.94, midi: 59 },
    1: { note: 'E', octave: 4, frequency: 329.63, midi: 64 }
};

// Generate all notes on fretboard (frets 0-12)
function generateFretboard() {
    const fretboard = [];

    for (let string = 1; string <= 6; string++) {
        for (let fret = 0; fret <= 12; fret++) {
            const openString = OPEN_STRINGS[string];
            const midiNote = openString.midi + fret;
            const noteIndex = midiNote % 12;
            const octave = Math.floor(midiNote / 12) - 1;
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

            fretboard.push({
                string: string,
                fret: fret,
                note: NOTE_NAMES[noteIndex],
                octave: octave,
                frequency: frequency,
                midiNote: midiNote
            });
        }
    }

    return fretboard;
}

const FRETBOARD = generateFretboard();

// Get a random note+string combination
function getRandomChallenge() {
    const index = Math.floor(Math.random() * FRETBOARD.length);
    return FRETBOARD[index];
}

// Convert frequency to note name (for pitch detection comparison)
function frequencyToNote(freq) {
    if (freq < 20 || freq > 5000) return null;

    const midiNote = Math.round(12 * Math.log2(freq / 440) + 69);
    const noteIndex = ((midiNote % 12) + 12) % 12;

    return {
        note: NOTE_NAMES[noteIndex],
        midiNote: midiNote,
        octave: Math.floor(midiNote / 12) - 1
    };
}

// Check if detected frequency matches target note (with tolerance)
// Tolerance in cents (100 cents = 1 semitone)
function isNoteMatch(detectedFreq, targetFreq, toleranceCents = 50) {
    if (!detectedFreq || detectedFreq < 20) return false;

    const centsDifference = 1200 * Math.log2(detectedFreq / targetFreq);
    return Math.abs(centsDifference) <= toleranceCents;
}

// Get string name for display
function getStringName(stringNum) {
    const ordinals = {
        1: '1st',
        2: '2nd',
        3: '3rd',
        4: '4th',
        5: '5th',
        6: '6th'
    };
    return `${ordinals[stringNum]} string`;
}

// Export for use in other modules
window.Fretboard = {
    NOTE_NAMES,
    OPEN_STRINGS,
    FRETBOARD,
    getRandomChallenge,
    frequencyToNote,
    isNoteMatch,
    getStringName
};
