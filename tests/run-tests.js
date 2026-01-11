#!/usr/bin/env node

/**
 * Command-line test runner using jsdom
 * Run with: node tests/run-tests.js
 *
 * Requires: npm install jsdom
 */

const fs = require('fs');
const path = require('path');

// Check if jsdom is available
let JSDOM;
try {
    JSDOM = require('jsdom').JSDOM;
} catch (e) {
    console.log('jsdom not found. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install jsdom', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    JSDOM = require('jsdom').JSDOM;
}

// Create a virtual DOM
const html = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
    <div id="note-display">?</div>
    <div id="string-display">Press Start to begin</div>
    <div id="status-indicator" class="status-indicator"></div>
    <span id="status-text">Ready</span>
    <div id="detected-note"></div>
    <button id="start-button">Start</button>
    <span id="score">0</span>
</body>
</html>
`;

const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    resources: 'usable'
});

const { window } = dom;
const { document } = window;

// Set up globals
global.window = window;
global.document = document;
global.navigator = window.navigator;
global.performance = {
    now: () => Date.now()
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);

// Load source files
function loadScript(filepath) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const script = new Function(content);
    script.call(window);
}

console.log('\n🎸 Fretboard Trainer - Test Suite\n');
console.log('Loading source files...');

try {
    loadScript(path.join(__dirname, '..', 'fretboard.js'));
    console.log('  ✓ fretboard.js');
} catch (e) {
    console.error('  ✗ fretboard.js:', e.message);
}

try {
    loadScript(path.join(__dirname, '..', 'audio.js'));
    console.log('  ✓ audio.js');
} catch (e) {
    console.error('  ✗ audio.js:', e.message);
}

try {
    loadScript(path.join(__dirname, '..', 'app.js'));
    console.log('  ✓ app.js');
} catch (e) {
    console.error('  ✗ app.js:', e.message);
}

console.log('\nLoading test framework...');
loadScript(path.join(__dirname, 'test-framework.js'));
console.log('  ✓ test-framework.js');

console.log('\nLoading tests...');
try {
    loadScript(path.join(__dirname, 'fretboard.test.js'));
    console.log('  ✓ fretboard.test.js');
} catch (e) {
    console.error('  ✗ fretboard.test.js:', e.message);
}

try {
    loadScript(path.join(__dirname, 'audio.test.js'));
    console.log('  ✓ audio.test.js');
} catch (e) {
    console.error('  ✗ audio.test.js:', e.message);
}

try {
    loadScript(path.join(__dirname, 'app.test.js'));
    console.log('  ✓ app.test.js');
} catch (e) {
    console.error('  ✗ app.test.js:', e.message);
}

try {
    loadScript(path.join(__dirname, 'integration.test.js'));
    console.log('  ✓ integration.test.js');
} catch (e) {
    console.error('  ✗ integration.test.js:', e.message);
}

// Run tests
console.log('\n' + '='.repeat(50));
window.testRunner.run().then(results => {
    console.log('\n');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
});
