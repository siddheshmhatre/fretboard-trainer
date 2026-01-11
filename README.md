# Fretboard Trainer

A web app to help memorize guitar fretboard notes using flashcards and audio pitch detection.

## Features

- **Flashcard-style learning**: Shows random note + string combinations
- **Audio pitch detection**: Uses your microphone to detect if you play the correct note
- **Keyboard mode**: Practice without a microphone (self-verification)
- **Works offline**: No server required, runs entirely in the browser
- **Cross-platform**: Works on Mac, Windows, and Linux with Chrome

## Quick Start

1. Clone this repo
2. Open `index.html` in Chrome, or serve with a local server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open http://localhost:8080
4. Click **Start** and allow microphone access
5. Play the displayed note on the indicated string

## Usage

### Audio Mode (default)
- The app listens to your guitar through the microphone
- Play the displayed note on the correct string
- When detected correctly, it advances to the next challenge

### Keyboard Mode
- Click "Switch to Keyboard Mode" if you don't have a microphone
- Play the note on your guitar
- Press **Space** or **Enter** when you've played it correctly
- Press **S** to skip to the next challenge

## Running Tests

Open the test runner in your browser:
```
http://localhost:8080/tests/test-runner.html
```

## Technical Details

- **Standard tuning**: E-A-D-G-B-E (6 strings)
- **Fret range**: 0-12 (covers all unique notes)
- **Pitch detection**: Autocorrelation algorithm with 50-cent tolerance
- **No dependencies**: Pure vanilla HTML/CSS/JS

## Files

```
fretboard-trainer/
├── index.html          # Main app
├── style.css           # Styling
├── app.js              # Game logic
├── audio.js            # Microphone & pitch detection
├── fretboard.js        # Note/frequency data
├── package.json        # npm scripts
└── tests/              # Test suite
    ├── test-runner.html
    ├── test-framework.js
    ├── fretboard.test.js
    ├── audio.test.js
    ├── app.test.js
    └── integration.test.js
```

## License

MIT
