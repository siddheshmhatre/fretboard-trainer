# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development
python3 -m http.server 8080   # or: npm start

# Run tests (CLI with jsdom)
npm test

# Run tests (browser)
# Open http://localhost:8080/tests/test-runner.html
```

## Architecture

Vanilla JavaScript web app with no build step. All modules export to `window` object for cross-file access.

**Module structure:**
- `fretboard.js` → `window.Fretboard` - Note/frequency data model (MIDI calculations, string tuning, note matching)
- `audio.js` → `window.AudioPitchDetector` - YIN algorithm pitch detection via Web Audio API
- `app.js` → `window.app` (FretboardTrainer class) - Game loop and UI coordination

**Data flow:**
1. `AudioPitchDetector.detectPitch()` runs on `requestAnimationFrame`
2. Detected frequency passed to `FretboardTrainer.handlePitchDetected()`
3. `Fretboard.isNoteMatch()` compares against current challenge (50 cents tolerance)
4. Correct note held for 150ms triggers `handleCorrect()` → next challenge

**Test framework:**
- Custom test runner in `tests/test-framework.js` (describe/it/assert pattern)
- Tests run both in browser (`test-runner.html`) and CLI (`node tests/run-tests.js` via jsdom)

## Key Constants

- Fret range: 0-12 (covers chromatic scale)
- YIN threshold: 0.15 (lower = stricter pitch detection)
- YIN probability threshold: 0.8 (minimum confidence)
- Detection hold time: 150ms (prevents false positives)
- Success display: 800ms before next card
