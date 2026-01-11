// Unit tests for fretboard.js

describe('Fretboard Module - Constants', () => {
    it('should export NOTE_NAMES array with 12 notes', () => {
        assert.isArray(Fretboard.NOTE_NAMES);
        assert.equal(Fretboard.NOTE_NAMES.length, 12);
    });

    it('should have correct note names in chromatic order', () => {
        const expected = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        assert.deepEqual(Fretboard.NOTE_NAMES, expected);
    });

    it('should export OPEN_STRINGS object with 6 strings', () => {
        assert.isObject(Fretboard.OPEN_STRINGS);
        assert.equal(Object.keys(Fretboard.OPEN_STRINGS).length, 6);
    });

    it('should have correct string numbers (1-6)', () => {
        const stringNums = Object.keys(Fretboard.OPEN_STRINGS).map(Number);
        assert.deepEqual(stringNums.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
    });
});

describe('Fretboard Module - Open String Data', () => {
    it('should have correct frequency for string 6 (low E)', () => {
        const string6 = Fretboard.OPEN_STRINGS[6];
        assert.equal(string6.note, 'E');
        assert.equal(string6.octave, 2);
        assert.approximately(string6.frequency, 82.41, 0.01);
        assert.equal(string6.midi, 40);
    });

    it('should have correct frequency for string 5 (A)', () => {
        const string5 = Fretboard.OPEN_STRINGS[5];
        assert.equal(string5.note, 'A');
        assert.equal(string5.octave, 2);
        assert.approximately(string5.frequency, 110.00, 0.01);
        assert.equal(string5.midi, 45);
    });

    it('should have correct frequency for string 4 (D)', () => {
        const string4 = Fretboard.OPEN_STRINGS[4];
        assert.equal(string4.note, 'D');
        assert.equal(string4.octave, 3);
        assert.approximately(string4.frequency, 146.83, 0.01);
        assert.equal(string4.midi, 50);
    });

    it('should have correct frequency for string 3 (G)', () => {
        const string3 = Fretboard.OPEN_STRINGS[3];
        assert.equal(string3.note, 'G');
        assert.equal(string3.octave, 3);
        assert.approximately(string3.frequency, 196.00, 0.01);
        assert.equal(string3.midi, 55);
    });

    it('should have correct frequency for string 2 (B)', () => {
        const string2 = Fretboard.OPEN_STRINGS[2];
        assert.equal(string2.note, 'B');
        assert.equal(string2.octave, 3);
        assert.approximately(string2.frequency, 246.94, 0.01);
        assert.equal(string2.midi, 59);
    });

    it('should have correct frequency for string 1 (high E)', () => {
        const string1 = Fretboard.OPEN_STRINGS[1];
        assert.equal(string1.note, 'E');
        assert.equal(string1.octave, 4);
        assert.approximately(string1.frequency, 329.63, 0.01);
        assert.equal(string1.midi, 64);
    });

    it('should have each open string with required properties', () => {
        for (let i = 1; i <= 6; i++) {
            const string = Fretboard.OPEN_STRINGS[i];
            assert.hasProperty(string, 'note');
            assert.hasProperty(string, 'octave');
            assert.hasProperty(string, 'frequency');
            assert.hasProperty(string, 'midi');
        }
    });
});

describe('Fretboard Module - FRETBOARD Array', () => {
    it('should export FRETBOARD array', () => {
        assert.isArray(Fretboard.FRETBOARD);
    });

    it('should have 78 total positions (6 strings x 13 frets)', () => {
        // 6 strings * 13 frets (0-12) = 78
        assert.equal(Fretboard.FRETBOARD.length, 78);
    });

    it('should have correct structure for each fretboard position', () => {
        const position = Fretboard.FRETBOARD[0];
        assert.hasProperty(position, 'string');
        assert.hasProperty(position, 'fret');
        assert.hasProperty(position, 'note');
        assert.hasProperty(position, 'octave');
        assert.hasProperty(position, 'frequency');
        assert.hasProperty(position, 'midiNote');
    });

    it('should have string numbers between 1 and 6', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            assert.between(pos.string, 1, 6);
        });
    });

    it('should have fret numbers between 0 and 12', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            assert.between(pos.fret, 0, 12);
        });
    });

    it('should have valid note names', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            assert.includes(Fretboard.NOTE_NAMES, pos.note);
        });
    });

    it('should have positive frequencies', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            assert.greaterThan(pos.frequency, 0);
        });
    });

    it('should have frequencies in guitar range (70Hz - 1500Hz)', () => {
        Fretboard.FRETBOARD.forEach(pos => {
            assert.between(pos.frequency, 70, 1500);
        });
    });
});

describe('Fretboard Module - Specific Fret Positions', () => {
    it('should correctly calculate 5th fret of string 6 (A)', () => {
        const pos = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 5);
        assert.equal(pos.note, 'A');
        assert.approximately(pos.frequency, 110, 1);
    });

    it('should correctly calculate 12th fret of string 6 (E octave higher)', () => {
        const pos = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 12);
        assert.equal(pos.note, 'E');
        // 12th fret should be double the frequency of open string
        const openString = Fretboard.OPEN_STRINGS[6];
        assert.approximately(pos.frequency, openString.frequency * 2, 1);
    });

    it('should correctly calculate 7th fret of string 5 (E)', () => {
        const pos = Fretboard.FRETBOARD.find(p => p.string === 5 && p.fret === 7);
        assert.equal(pos.note, 'E');
    });

    it('should correctly calculate 3rd fret of string 2 (D)', () => {
        const pos = Fretboard.FRETBOARD.find(p => p.string === 2 && p.fret === 3);
        assert.equal(pos.note, 'D');
    });

    it('should have matching notes at 5th fret equals next string open (except B-G)', () => {
        // String 6 fret 5 = String 5 open (A)
        const s6f5 = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 5);
        const s5f0 = Fretboard.FRETBOARD.find(p => p.string === 5 && p.fret === 0);
        assert.equal(s6f5.note, s5f0.note);

        // String 5 fret 5 = String 4 open (D)
        const s5f5 = Fretboard.FRETBOARD.find(p => p.string === 5 && p.fret === 5);
        const s4f0 = Fretboard.FRETBOARD.find(p => p.string === 4 && p.fret === 0);
        assert.equal(s5f5.note, s4f0.note);

        // String 4 fret 5 = String 3 open (G)
        const s4f5 = Fretboard.FRETBOARD.find(p => p.string === 4 && p.fret === 5);
        const s3f0 = Fretboard.FRETBOARD.find(p => p.string === 3 && p.fret === 0);
        assert.equal(s4f5.note, s3f0.note);

        // String 3 fret 4 = String 2 open (B) - note: G to B is only 4 frets!
        const s3f4 = Fretboard.FRETBOARD.find(p => p.string === 3 && p.fret === 4);
        const s2f0 = Fretboard.FRETBOARD.find(p => p.string === 2 && p.fret === 0);
        assert.equal(s3f4.note, s2f0.note);

        // String 2 fret 5 = String 1 open (E)
        const s2f5 = Fretboard.FRETBOARD.find(p => p.string === 2 && p.fret === 5);
        const s1f0 = Fretboard.FRETBOARD.find(p => p.string === 1 && p.fret === 0);
        assert.equal(s2f5.note, s1f0.note);
    });
});

describe('Fretboard Module - getRandomChallenge()', () => {
    it('should be a function', () => {
        assert.isFunction(Fretboard.getRandomChallenge);
    });

    it('should return a valid fretboard position', () => {
        const challenge = Fretboard.getRandomChallenge();
        assert.hasProperty(challenge, 'string');
        assert.hasProperty(challenge, 'fret');
        assert.hasProperty(challenge, 'note');
        assert.hasProperty(challenge, 'frequency');
    });

    it('should return different challenges over multiple calls (randomness test)', () => {
        const challenges = new Set();
        for (let i = 0; i < 50; i++) {
            const c = Fretboard.getRandomChallenge();
            challenges.add(`${c.string}-${c.fret}`);
        }
        // Should have gotten at least 10 different positions in 50 tries
        assert.greaterThan(challenges.size, 10);
    });

    it('should only return positions from the fretboard', () => {
        for (let i = 0; i < 20; i++) {
            const challenge = Fretboard.getRandomChallenge();
            const found = Fretboard.FRETBOARD.find(
                p => p.string === challenge.string && p.fret === challenge.fret
            );
            assert.ok(found, `Position string ${challenge.string} fret ${challenge.fret} not in fretboard`);
        }
    });
});

describe('Fretboard Module - frequencyToNote()', () => {
    it('should be a function', () => {
        assert.isFunction(Fretboard.frequencyToNote);
    });

    it('should return null for frequency below 20Hz', () => {
        assert.equal(Fretboard.frequencyToNote(10), null);
    });

    it('should return null for frequency above 5000Hz', () => {
        assert.equal(Fretboard.frequencyToNote(6000), null);
    });

    it('should correctly identify A4 (440Hz)', () => {
        const result = Fretboard.frequencyToNote(440);
        assert.equal(result.note, 'A');
        assert.equal(result.octave, 4);
        assert.equal(result.midiNote, 69);
    });

    it('should correctly identify C4 (261.63Hz)', () => {
        const result = Fretboard.frequencyToNote(261.63);
        assert.equal(result.note, 'C');
        assert.equal(result.octave, 4);
    });

    it('should correctly identify E2 (low E string open - ~82Hz)', () => {
        const result = Fretboard.frequencyToNote(82.41);
        assert.equal(result.note, 'E');
        assert.equal(result.octave, 2);
    });

    it('should correctly identify E4 (high E string open - ~330Hz)', () => {
        const result = Fretboard.frequencyToNote(329.63);
        assert.equal(result.note, 'E');
        assert.equal(result.octave, 4);
    });

    it('should correctly identify G3 (~196Hz)', () => {
        const result = Fretboard.frequencyToNote(196);
        assert.equal(result.note, 'G');
        assert.equal(result.octave, 3);
    });

    it('should handle slightly sharp frequencies', () => {
        // A4 slightly sharp (450Hz instead of 440Hz)
        const result = Fretboard.frequencyToNote(450);
        assert.equal(result.note, 'A');
    });

    it('should handle slightly flat frequencies', () => {
        // A4 slightly flat (430Hz instead of 440Hz)
        const result = Fretboard.frequencyToNote(430);
        assert.equal(result.note, 'A');
    });

    it('should return object with note, midiNote, and octave properties', () => {
        const result = Fretboard.frequencyToNote(440);
        assert.hasProperty(result, 'note');
        assert.hasProperty(result, 'midiNote');
        assert.hasProperty(result, 'octave');
    });
});

describe('Fretboard Module - isNoteMatch()', () => {
    it('should be a function', () => {
        assert.isFunction(Fretboard.isNoteMatch);
    });

    it('should return true for exact frequency match', () => {
        assert.ok(Fretboard.isNoteMatch(440, 440));
    });

    it('should return true for frequency within default tolerance', () => {
        // Default tolerance is 50 cents
        // 50 cents = ~2.93% frequency difference
        assert.ok(Fretboard.isNoteMatch(440, 445)); // ~20 cents sharp
        assert.ok(Fretboard.isNoteMatch(440, 435)); // ~20 cents flat
    });

    it('should return false for frequency outside tolerance', () => {
        // 100 cents = 1 semitone = ~5.95% frequency difference
        // A4 (440) to A#4 is about 466Hz
        assert.notOk(Fretboard.isNoteMatch(440, 466, 50));
    });

    it('should return false for null/undefined frequency', () => {
        assert.notOk(Fretboard.isNoteMatch(null, 440));
        assert.notOk(Fretboard.isNoteMatch(undefined, 440));
    });

    it('should return false for frequency below 20Hz', () => {
        assert.notOk(Fretboard.isNoteMatch(10, 440));
    });

    it('should handle custom tolerance', () => {
        // With 100 cents tolerance, should accept up to 1 semitone
        assert.ok(Fretboard.isNoteMatch(440, 460, 100));
        // With 10 cents tolerance, should be stricter
        assert.notOk(Fretboard.isNoteMatch(440, 450, 10));
    });

    it('should work with guitar frequencies', () => {
        const lowE = 82.41;
        assert.ok(Fretboard.isNoteMatch(82, lowE, 50));
        assert.ok(Fretboard.isNoteMatch(83, lowE, 50));
        assert.notOk(Fretboard.isNoteMatch(78, lowE, 50)); // Too flat
    });
});

describe('Fretboard Module - getStringName()', () => {
    it('should be a function', () => {
        assert.isFunction(Fretboard.getStringName);
    });

    it('should return "1st string" for string 1', () => {
        assert.equal(Fretboard.getStringName(1), '1st string');
    });

    it('should return "2nd string" for string 2', () => {
        assert.equal(Fretboard.getStringName(2), '2nd string');
    });

    it('should return "3rd string" for string 3', () => {
        assert.equal(Fretboard.getStringName(3), '3rd string');
    });

    it('should return "4th string" for string 4', () => {
        assert.equal(Fretboard.getStringName(4), '4th string');
    });

    it('should return "5th string" for string 5', () => {
        assert.equal(Fretboard.getStringName(5), '5th string');
    });

    it('should return "6th string" for string 6', () => {
        assert.equal(Fretboard.getStringName(6), '6th string');
    });
});

describe('Fretboard Module - Frequency Calculations', () => {
    it('should double frequency at 12th fret (octave)', () => {
        for (let string = 1; string <= 6; string++) {
            const openPos = Fretboard.FRETBOARD.find(p => p.string === string && p.fret === 0);
            const fret12 = Fretboard.FRETBOARD.find(p => p.string === string && p.fret === 12);
            assert.approximately(fret12.frequency, openPos.frequency * 2, 0.5);
        }
    });

    it('should increase frequency by semitone ratio per fret', () => {
        const semitoneRatio = Math.pow(2, 1 / 12); // ~1.0595
        const openE = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 0);
        const fret1 = Fretboard.FRETBOARD.find(p => p.string === 6 && p.fret === 1);
        assert.approximately(fret1.frequency / openE.frequency, semitoneRatio, 0.001);
    });

    it('should have higher frequencies for higher strings', () => {
        for (let string = 1; string <= 5; string++) {
            const currentOpen = Fretboard.FRETBOARD.find(p => p.string === string && p.fret === 0);
            const lowerOpen = Fretboard.FRETBOARD.find(p => p.string === string + 1 && p.fret === 0);
            assert.greaterThan(currentOpen.frequency, lowerOpen.frequency);
        }
    });

    it('should have higher frequencies for higher frets on same string', () => {
        for (let string = 1; string <= 6; string++) {
            for (let fret = 0; fret < 12; fret++) {
                const currentPos = Fretboard.FRETBOARD.find(p => p.string === string && p.fret === fret);
                const nextPos = Fretboard.FRETBOARD.find(p => p.string === string && p.fret === fret + 1);
                assert.greaterThan(nextPos.frequency, currentPos.frequency);
            }
        }
    });
});
