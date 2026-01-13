// SVG-based guitar fretboard visualization

class FretboardDiagram {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = null;
        this.indicator = null;

        // Fretboard dimensions
        this.numStrings = 6;
        this.numFrets = 12;
        this.width = 400;
        this.height = 150;
        this.nutWidth = 8;
        this.fretWidth = 3;
        this.padding = { left: 30, right: 10, top: 15, bottom: 15 };

        // Fret marker positions (dots)
        this.singleDotFrets = [3, 5, 7, 9];
        this.doubleDotFret = 12;

        // String thicknesses (high E to low E)
        this.stringThicknesses = [1, 1.2, 1.5, 2, 2.5, 3];

        this.init();
    }

    init() {
        if (!this.container) return;

        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.setAttribute('class', 'fretboard-svg');

        // Create definitions for gradients
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // Wood gradient for fretboard
        const woodGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        woodGradient.setAttribute('id', 'wood-gradient');
        woodGradient.setAttribute('x1', '0%');
        woodGradient.setAttribute('y1', '0%');
        woodGradient.setAttribute('x2', '0%');
        woodGradient.setAttribute('y2', '100%');
        woodGradient.innerHTML = `
            <stop offset="0%" style="stop-color:#4a3728"/>
            <stop offset="50%" style="stop-color:#5c4033"/>
            <stop offset="100%" style="stop-color:#3d2b1f"/>
        `;
        defs.appendChild(woodGradient);

        // Glow filter for indicator
        const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glowFilter.setAttribute('id', 'glow');
        glowFilter.setAttribute('x', '-50%');
        glowFilter.setAttribute('y', '-50%');
        glowFilter.setAttribute('width', '200%');
        glowFilter.setAttribute('height', '200%');
        glowFilter.innerHTML = `
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        `;
        defs.appendChild(glowFilter);

        this.svg.appendChild(defs);

        // Draw fretboard background
        this.drawFretboard();

        // Draw nut
        this.drawNut();

        // Draw frets
        this.drawFrets();

        // Draw fret markers
        this.drawFretMarkers();

        // Draw strings
        this.drawStrings();

        // Create indicator (hidden initially)
        this.createIndicator();

        this.container.appendChild(this.svg);
        this.hide();
    }

    getFretX(fret) {
        if (fret === 0) {
            return this.padding.left + this.nutWidth / 2;
        }
        const playableWidth = this.width - this.padding.left - this.padding.right - this.nutWidth;
        const fretSpacing = playableWidth / this.numFrets;
        return this.padding.left + this.nutWidth + (fret - 0.5) * fretSpacing;
    }

    getStringY(string) {
        // String 1 = high E (top), String 6 = low E (bottom)
        const playableHeight = this.height - this.padding.top - this.padding.bottom;
        const stringSpacing = playableHeight / (this.numStrings - 1);
        return this.padding.top + (string - 1) * stringSpacing;
    }

    drawFretboard() {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', this.padding.left);
        rect.setAttribute('y', this.padding.top - 5);
        rect.setAttribute('width', this.width - this.padding.left - this.padding.right);
        rect.setAttribute('height', this.height - this.padding.top - this.padding.bottom + 10);
        rect.setAttribute('fill', 'url(#wood-gradient)');
        rect.setAttribute('rx', '3');
        this.svg.appendChild(rect);
    }

    drawNut() {
        const nut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        nut.setAttribute('x', this.padding.left);
        nut.setAttribute('y', this.padding.top - 5);
        nut.setAttribute('width', this.nutWidth);
        nut.setAttribute('height', this.height - this.padding.top - this.padding.bottom + 10);
        nut.setAttribute('fill', '#f5f5dc'); // Bone/ivory color
        nut.setAttribute('rx', '1');
        this.svg.appendChild(nut);
    }

    drawFrets() {
        const playableWidth = this.width - this.padding.left - this.padding.right - this.nutWidth;
        const fretSpacing = playableWidth / this.numFrets;

        for (let i = 1; i <= this.numFrets; i++) {
            const x = this.padding.left + this.nutWidth + i * fretSpacing;
            const fret = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            fret.setAttribute('x1', x);
            fret.setAttribute('y1', this.padding.top - 3);
            fret.setAttribute('x2', x);
            fret.setAttribute('y2', this.height - this.padding.bottom + 3);
            fret.setAttribute('stroke', '#c0c0c0');
            fret.setAttribute('stroke-width', this.fretWidth);
            this.svg.appendChild(fret);
        }
    }

    drawFretMarkers() {
        const dotRadius = 5;
        const dotColor = '#d4d4d4';

        // Single dots
        for (const fret of this.singleDotFrets) {
            const x = this.getFretX(fret);
            const y = this.height / 2;

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', dotRadius);
            dot.setAttribute('fill', dotColor);
            this.svg.appendChild(dot);
        }

        // Double dot at fret 12
        const x12 = this.getFretX(this.doubleDotFret);
        const yOffset = 20;

        const dot1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot1.setAttribute('cx', x12);
        dot1.setAttribute('cy', this.height / 2 - yOffset);
        dot1.setAttribute('r', dotRadius);
        dot1.setAttribute('fill', dotColor);
        this.svg.appendChild(dot1);

        const dot2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot2.setAttribute('cx', x12);
        dot2.setAttribute('cy', this.height / 2 + yOffset);
        dot2.setAttribute('r', dotRadius);
        dot2.setAttribute('fill', dotColor);
        this.svg.appendChild(dot2);
    }

    drawStrings() {
        for (let string = 1; string <= this.numStrings; string++) {
            const y = this.getStringY(string);
            const thickness = this.stringThicknesses[string - 1];

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', this.padding.left);
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.width - this.padding.right);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', string <= 3 ? '#e8e8e8' : '#c9a227'); // Plain vs wound
            line.setAttribute('stroke-width', thickness);
            this.svg.appendChild(line);
        }
    }

    createIndicator() {
        this.indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.indicator.setAttribute('r', '10');
        this.indicator.setAttribute('fill', '#e94560');
        this.indicator.setAttribute('filter', 'url(#glow)');
        this.indicator.setAttribute('class', 'position-indicator');
        this.indicator.style.display = 'none';
        this.svg.appendChild(this.indicator);
    }

    show(string, fret) {
        if (!this.container || !this.indicator) return;

        this.container.style.display = 'block';

        const x = this.getFretX(fret);
        const y = this.getStringY(string);

        this.indicator.setAttribute('cx', x);
        this.indicator.setAttribute('cy', y);
        this.indicator.style.display = 'block';
    }

    hide() {
        if (!this.container) return;
        this.container.style.display = 'none';
        if (this.indicator) {
            this.indicator.style.display = 'none';
        }
    }
}

// Export for use in other modules
window.FretboardDiagram = FretboardDiagram;
