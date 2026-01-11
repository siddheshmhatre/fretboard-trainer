// End-to-end integration tests

describe('Integration - Module Loading', () => {
    it('should have Fretboard module available globally', () => {
        assert.ok(window.Fretboard);
    });

    it('should have AudioPitchDetector class available globally', () => {
        assert.ok(window.AudioPitchDetector);
    });

    it('should have FretboardTrainer class available globally', () => {
        assert.ok(window.FretboardTrainer);
    });
});

describe('Integration - Fretboard and Audio Module Interaction', () => {
    it('should correctly validate frequencies from fretboard data', () => {
        // Get a random challenge
        const challenge = Fretboard.getRandomChallenge();

        // The frequency should match when we use isNoteMatch
        assert.ok(Fretboard.isNoteMatch(challenge.frequency, challenge.frequency));
    });

    it('should correctly identify note from fretboard frequency', () => {
        // Test each open string
        for (let string = 1; string <= 6; string++) {
            const openString = Fretboard.OPEN_STRINGS[string];
            const detected = Fretboard.frequencyToNote(openString.frequency);
            assert.equal(detected.note, openString.note);
        }
    });

    it('should correctly identify all notes on fretboard', () => {
        // Test a sample of fretboard positions
        const testPositions = [
            { string: 6, fret: 0 },  // E
            { string: 6, fret: 5 },  // A
            { string: 5, fret: 2 },  // B
            { string: 4, fret: 2 },  // E
            { string: 3, fret: 0 },  // G
            { string: 2, fret: 0 },  // B
            { string: 1, fret: 0 },  // E
            { string: 1, fret: 5 },  // A
        ];

        testPositions.forEach(pos => {
            const fretPos = Fretboard.FRETBOARD.find(
                p => p.string === pos.string && p.fret === pos.fret
            );
            const detected = Fretboard.frequencyToNote(fretPos.frequency);
            assert.equal(detected.note, fretPos.note,
                `String ${pos.string} Fret ${pos.fret}: expected ${fretPos.note}, got ${detected.note}`);
        });
    });

    it('should handle pitch detection within tolerance for all fretboard notes', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            // Simulate slightly out-of-tune detection (+/- 2%)
            const sharpFreq = pos.frequency * 1.02;
            const flatFreq = pos.frequency * 0.98;

            assert.ok(Fretboard.isNoteMatch(sharpFreq, pos.frequency, 50),
                `Sharp freq ${sharpFreq} should match ${pos.frequency}`);
            assert.ok(Fretboard.isNoteMatch(flatFreq, pos.frequency, 50),
                `Flat freq ${flatFreq} should match ${pos.frequency}`);
        });
    });
});

describe('Integration - Challenge Generation and Validation', () => {
    it('should generate challenges that can be validated', () => {
        for (let i = 0; i < 20; i++) {
            const challenge = Fretboard.getRandomChallenge();

            // Challenge should have all required properties
            assert.hasProperty(challenge, 'note');
            assert.hasProperty(challenge, 'string');
            assert.hasProperty(challenge, 'fret');
            assert.hasProperty(challenge, 'frequency');

            // Should be able to validate correct answer
            assert.ok(Fretboard.isNoteMatch(challenge.frequency, challenge.frequency));

            // Should be able to get string name
            const stringName = Fretboard.getStringName(challenge.string);
            assert.ok(stringName.includes('string'));
        }
    });

    it('should cover all strings when generating many challenges', () => {
        const stringsUsed = new Set();

        for (let i = 0; i < 100; i++) {
            const challenge = Fretboard.getRandomChallenge();
            stringsUsed.add(challenge.string);
        }

        // Should have used all 6 strings
        assert.equal(stringsUsed.size, 6, 'Should use all 6 strings');
    });

    it('should cover all frets when generating many challenges', () => {
        const fretsUsed = new Set();

        for (let i = 0; i < 200; i++) {
            const challenge = Fretboard.getRandomChallenge();
            fretsUsed.add(challenge.fret);
        }

        // Should have used most frets (0-12)
        assert.greaterThan(fretsUsed.size, 10, 'Should use most frets');
    });

    it('should cover all 12 notes when generating many challenges', () => {
        const notesUsed = new Set();

        for (let i = 0; i < 200; i++) {
            const challenge = Fretboard.getRandomChallenge();
            notesUsed.add(challenge.note);
        }

        // Should have used all 12 notes
        assert.equal(notesUsed.size, 12, 'Should use all 12 notes');
    });
});

describe('Integration - Frequency-to-Note Accuracy', () => {
    it('should accurately identify standard tuning frequencies', () => {
        const standardTuning = [
            { freq: 82.41, note: 'E', string: '6th' },
            { freq: 110.00, note: 'A', string: '5th' },
            { freq: 146.83, note: 'D', string: '4th' },
            { freq: 196.00, note: 'G', string: '3rd' },
            { freq: 246.94, note: 'B', string: '2nd' },
            { freq: 329.63, note: 'E', string: '1st' }
        ];

        standardTuning.forEach(tuning => {
            const result = Fretboard.frequencyToNote(tuning.freq);
            assert.equal(result.note, tuning.note,
                `${tuning.string} string: expected ${tuning.note}, got ${result.note}`);
        });
    });

    it('should handle common alternate tuning frequencies', () => {
        // Drop D tuning - 6th string is D (73.42 Hz)
        const dropD = Fretboard.frequencyToNote(73.42);
        assert.equal(dropD.note, 'D');

        // DADGAD tuning - 1st string is D (293.66 Hz)
        const dadgadHigh = Fretboard.frequencyToNote(293.66);
        assert.equal(dadgadHigh.note, 'D');
    });

    it('should handle frequencies at octave boundaries', () => {
        // E2 (82 Hz) and E4 (330 Hz) - two octaves apart
        const lowE = Fretboard.frequencyToNote(82.41);
        const highE = Fretboard.frequencyToNote(329.63);

        assert.equal(lowE.note, 'E');
        assert.equal(highE.note, 'E');
        assert.equal(highE.octave - lowE.octave, 2);
    });
});

describe('Integration - Musical Intervals', () => {
    it('should correctly identify perfect fifth intervals', () => {
        // E to B is a perfect fifth (7 semitones)
        const E = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 0);
        const B = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 7);

        assert.equal(E.note, 'E');
        assert.equal(B.note, 'B');
        assert.equal(B.midiNote - E.midiNote, 7);
    });

    it('should correctly identify octave intervals', () => {
        // Open E to 12th fret E
        const openE = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 0);
        const fret12E = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 12);

        assert.equal(openE.note, fret12E.note);
        assert.equal(fret12E.midiNote - openE.midiNote, 12);
        assert.approximately(fret12E.frequency / openE.frequency, 2, 0.01);
    });

    it('should correctly identify whole step intervals', () => {
        // E to F# is a whole step (2 semitones)
        const E = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 0);
        const Fs = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 2);

        assert.equal(E.note, 'E');
        assert.equal(Fs.note, 'F#');
        assert.equal(Fs.midiNote - E.midiNote, 2);
    });

    it('should correctly identify half step intervals', () => {
        // E to F is a half step (1 semitone)
        const E = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 0);
        const F = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 1);

        assert.equal(E.note, 'E');
        assert.equal(F.note, 'F');
        assert.equal(F.midiNote - E.midiNote, 1);
    });
});

describe('Integration - Cross-Module Data Consistency', () => {
    it('should have consistent MIDI note calculations', () => {
        // A4 should be MIDI note 69
        const A440 = Fretboard.frequencyToNote(440);
        assert.equal(A440.midiNote, 69);

        // Check that fretboard MIDI notes match frequencyToNote
        Fretboard.FRETBOARD.forEach(pos => {
            const detected = Fretboard.frequencyToNote(pos.frequency);
            assert.equal(detected.midiNote, pos.midiNote,
                `MIDI mismatch at string ${pos.string} fret ${pos.fret}`);
        });
    });

    it('should have consistent octave calculations', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            const detected = Fretboard.frequencyToNote(pos.frequency);
            assert.equal(detected.octave, pos.octave,
                `Octave mismatch at string ${pos.string} fret ${pos.fret}: expected ${pos.octave}, got ${detected.octave}`);
        });
    });
});

describe('Integration - Edge Cases and Boundary Conditions', () => {
    it('should handle minimum guitar frequency', () => {
        // Lowest note: Low E (82 Hz)
        const result = Fretboard.frequencyToNote(82);
        assert.ok(result);
        assert.equal(result.note, 'E');
    });

    it('should handle maximum guitar frequency (12th fret high E)', () => {
        // Highest note in our fretboard: E at ~660 Hz
        const highE12 = Fretboard.FRETBOARD.find(p => p.string === 1 && p.fret === 12);
        const result = Fretboard.frequencyToNote(highE12.frequency);
        assert.ok(result);
        assert.equal(result.note, 'E');
    });

    it('should reject frequencies outside valid range', () => {
        assert.equal(Fretboard.frequencyToNote(10), null);  // Too low
        assert.equal(Fretboard.frequencyToNote(6000), null);  // Too high
    });

    it('should handle NaN and invalid inputs gracefully', () => {
        assert.notOk(Fretboard.isNoteMatch(NaN, 440));
        assert.notOk(Fretboard.isNoteMatch(440, NaN));
        assert.notOk(Fretboard.isNoteMatch(undefined, 440));
        assert.notOk(Fretboard.isNoteMatch(null, 440));
    });
});

describe('Integration - Performance', () => {
    it('should generate challenges quickly', () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            Fretboard.getRandomChallenge();
        }
        const elapsed = performance.now() - start;
        assert.lessThan(elapsed, 100, 'Should generate 1000 challenges in under 100ms');
    });

    it('should validate notes quickly', () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            Fretboard.isNoteMatch(440, 442);
        }
        const elapsed = performance.now() - start;
        assert.lessThan(elapsed, 50, 'Should validate 1000 notes in under 50ms');
    });

    it('should convert frequencies quickly', () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            Fretboard.frequencyToNote(440);
        }
        const elapsed = performance.now() - start;
        assert.lessThan(elapsed, 50, 'Should convert 1000 frequencies in under 50ms');
    });
});

describe('Integration - Real-world Scenarios', () => {
    it('should handle typical practice session flow', async () => {
        // Simulate a practice session
        const challenges = [];
        const scores = [];

        for (let i = 0; i < 10; i++) {
            // Get challenge
            const challenge = Fretboard.getRandomChallenge();
            challenges.push(challenge);

            // Simulate playing slightly out of tune
            const playedFreq = challenge.frequency * (1 + (Math.random() - 0.5) * 0.04);

            // Check if it would be accepted
            const isCorrect = Fretboard.isNoteMatch(playedFreq, challenge.frequency, 50);
            scores.push(isCorrect);
        }

        // Most should be correct with 4% deviation and 50 cent tolerance
        const correctCount = scores.filter(s => s).length;
        assert.greaterThan(correctCount, 5, 'Most slightly out-of-tune notes should be accepted');
    });

    it('should correctly identify notes across all positions', () => {
        // Test every position on the fretboard
        let allCorrect = true;
        const errors = [];

        Fretboard.FRETBOARD.forEach(pos => {
            const detected = Fretboard.frequencyToNote(pos.frequency);
            if (detected.note !== pos.note) {
                allCorrect = false;
                errors.push(`String ${pos.string}, Fret ${pos.fret}: expected ${pos.note}, got ${detected.note}`);
            }
        });

        assert.ok(allCorrect, `Note detection errors: ${errors.join('; ')}`);
    });

    it('should handle rapid sequential challenges', () => {
        // Simulate rapid-fire practice
        let previousChallenge = null;

        for (let i = 0; i < 50; i++) {
            const challenge = Fretboard.getRandomChallenge();

            // Validate challenge
            assert.ok(challenge.note);
            assert.ok(challenge.frequency > 0);
            assert.between(challenge.string, 1, 6);
            assert.between(challenge.fret, 0, 12);

            previousChallenge = challenge;
        }
    });
});
