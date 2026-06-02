/**
 * LogicPuzzle Lab - Circuit Renderer
 * =====================================
 * SVG-based circuit workspace with grid, gate rendering, and interaction.
 */

import { GATE_TYPES, GateInstance, InputNode, OutputNode, resetGateIdCounter, resetInputIdCounter, resetOutputIdCounter } from './gates.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRID_SIZE = 20;

export class CircuitRenderer {
    constructor(svgElement) {
        this.svg = svgElement;
        this.gates = new Map();       // id → GateInstance | InputNode | OutputNode
        this.connections = [];         // Connection objects
        this.selectedGate = null;

        // SVG layers
        this.gridLayer = null;
        this.wireLayer = null;
        this.gateLayer = null;
        this.uiLayer = null;

        // Viewport
        this.viewBox = { x: 0, y: 0, w: 1200, h: 700 };

        // Callbacks
        this.onGateSelected = null;
        this.onCircuitChanged = null;
        this.onPinClicked = null;

        this._init();
    }

    _init() {
        // Set SVG attributes
        this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Create layers
        this.gridLayer = this._createGroup('grid-layer');
        this.wireLayer = this._createGroup('wire-layer');
        this.gateLayer = this._createGroup('gate-layer');
        this.uiLayer = this._createGroup('ui-layer');

        this._drawGrid();
    }

    _createGroup(id) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('id', id);
        this.svg.appendChild(g);
        return g;
    }

    _drawGrid() {
        // Minor grid lines
        for (let x = 0; x <= this.viewBox.w; x += GRID_SIZE) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', this.viewBox.h);
            line.setAttribute('class', x % (GRID_SIZE * 5) === 0 ? 'grid-pattern-major' : 'grid-pattern');
            this.gridLayer.appendChild(line);
        }
        for (let y = 0; y <= this.viewBox.h; y += GRID_SIZE) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.viewBox.w);
            line.setAttribute('y2', y);
            line.setAttribute('class', y % (GRID_SIZE * 5) === 0 ? 'grid-pattern-major' : 'grid-pattern');
            this.gridLayer.appendChild(line);
        }
    }

    /**
     * Snap a value to the nearest grid point.
     */
    snapToGrid(value) {
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }

    /**
     * Add a gate to the workspace.
     */
    addGate(type, x, y) {
        const snappedX = this.snapToGrid(x);
        const snappedY = this.snapToGrid(y);
        const gate = new GateInstance(type, snappedX, snappedY);
        this.gates.set(gate.id, gate);
        this._renderGate(gate);

        if (this.onCircuitChanged) this.onCircuitChanged();
        return gate;
    }

    /**
     * Add an input node.
     */
    addInput(name, x, y) {
        const input = new InputNode(name, this.snapToGrid(x), this.snapToGrid(y));
        this.gates.set(input.id, input);
        this._renderInput(input);

        if (this.onCircuitChanged) this.onCircuitChanged();
        return input;
    }

    /**
     * Add an output node (LED).
     */
    addOutput(name, x, y) {
        const output = new OutputNode(name, this.snapToGrid(x), this.snapToGrid(y));
        this.gates.set(output.id, output);
        this._renderOutput(output);

        if (this.onCircuitChanged) this.onCircuitChanged();
        return output;
    }

    /**
     * Remove a gate and its connections.
     */
    removeGate(gateId) {
        const gate = this.gates.get(gateId);
        if (!gate) return;

        // Remove associated connections
        this.connections = this.connections.filter(conn => {
            if (conn.sourceId === gateId || conn.targetId === gateId) {
                if (conn.svgPath) conn.svgPath.remove();
                // Clear connection references
                if (conn.sourceId !== gateId) {
                    const srcGate = this.gates.get(conn.sourceId);
                    if (srcGate && srcGate.outputConnections) {
                        srcGate.outputConnections = srcGate.outputConnections.filter(c => c !== conn);
                    }
                }
                if (conn.targetId !== gateId) {
                    const tgtGate = this.gates.get(conn.targetId);
                    if (tgtGate && tgtGate.inputConnections) {
                        tgtGate.inputConnections[conn.targetPin] = null;
                        tgtGate.inputValues[conn.targetPin] = null;
                    }
                }
                return false;
            }
            return true;
        });

        // Remove SVG element
        if (gate.svgGroup) gate.svgGroup.remove();
        this.gates.delete(gateId);

        if (this.selectedGate === gate) {
            this.selectedGate = null;
        }

        if (this.onCircuitChanged) this.onCircuitChanged();
    }

    /**
     * Move a gate to a new position.
     */
    moveGate(gateId, x, y) {
        const gate = this.gates.get(gateId);
        if (!gate) return;

        gate.x = this.snapToGrid(x);
        gate.y = this.snapToGrid(y);

        // Update SVG position
        if (gate.svgGroup) {
            gate.svgGroup.setAttribute('transform', `translate(${gate.x}, ${gate.y})`);
        }

        // Update connected wires
        this._updateConnectionPaths();
    }

    /**
     * Select a gate.
     */
    selectGate(gateId) {
        // Deselect previous
        if (this.selectedGate && this.selectedGate.svgGroup) {
            this.selectedGate.svgGroup.classList.remove('selected');
        }

        const gate = this.gates.get(gateId);
        if (gate) {
            gate.svgGroup.classList.add('selected');
            this.selectedGate = gate;
        } else {
            this.selectedGate = null;
        }

        if (this.onGateSelected) this.onGateSelected(gate);
    }

    /**
     * Deselect all.
     */
    deselectAll() {
        if (this.selectedGate && this.selectedGate.svgGroup) {
            this.selectedGate.svgGroup.classList.remove('selected');
        }
        this.selectedGate = null;
        if (this.onGateSelected) this.onGateSelected(null);
    }

    /**
     * Clear the entire workspace.
     */
    clear() {
        this.gates.clear();
        this.connections = [];
        this.selectedGate = null;

        // Clear SVG layers
        while (this.wireLayer.firstChild) this.wireLayer.firstChild.remove();
        while (this.gateLayer.firstChild) this.gateLayer.firstChild.remove();
        while (this.uiLayer.firstChild) this.uiLayer.firstChild.remove();

        // Reset ID counters
        resetGateIdCounter();
        resetInputIdCounter();
        resetOutputIdCounter();

        if (this.onCircuitChanged) this.onCircuitChanged();
    }

    // ─── SVG Rendering ───

    _renderGate(gate) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'gate-group');
        g.setAttribute('transform', `translate(${gate.x}, ${gate.y})`);
        g.setAttribute('data-gate-id', gate.id);

        const def = gate.definition;

        // Gate body
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', def.svgPath);
        path.setAttribute('class', def.name === 'NOT' ? 'gate-body-not' : 'gate-body');
        path.style.stroke = def.color;
        g.appendChild(path);

        // Extra path for XOR/XNOR
        if (def.extraPath) {
            const extra = document.createElementNS(SVG_NS, 'path');
            extra.setAttribute('d', def.extraPath);
            extra.setAttribute('fill', 'none');
            extra.setAttribute('stroke', def.color);
            extra.setAttribute('stroke-width', '2');
            g.appendChild(extra);
        }

        // NOT bubble
        if (def.bubble) {
            const bubble = document.createElementNS(SVG_NS, 'circle');
            bubble.setAttribute('cx', def.bubble.cx);
            bubble.setAttribute('cy', def.bubble.cy);
            bubble.setAttribute('r', def.bubble.r);
            bubble.setAttribute('class', 'gate-bubble');
            bubble.style.stroke = def.color;
            g.appendChild(bubble);
        }

        // Label
        const label = document.createElementNS(SVG_NS, 'text');
        const labelX = def.bubble ? (def.width - 20) / 2 : def.width / 2;
        label.setAttribute('x', def.name === 'NOT' ? 22 : labelX);
        label.setAttribute('y', def.height / 2);
        label.setAttribute('class', 'gate-label');
        label.textContent = def.label;
        g.appendChild(label);

        // Input pins
        def.inputPins.forEach((pin, i) => {
            // Pin line
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', pin.x - 12);
            line.setAttribute('y1', pin.y);
            line.setAttribute('x2', pin.x);
            line.setAttribute('y2', pin.y);
            line.setAttribute('stroke', '#334');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('class', 'pin-line');
            g.appendChild(line);

            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', pin.x - 12);
            circle.setAttribute('cy', pin.y);
            circle.setAttribute('r', 5);
            circle.setAttribute('class', 'gate-pin');
            circle.setAttribute('data-pin-type', 'input');
            circle.setAttribute('data-pin-index', i);
            circle.setAttribute('data-gate-id', gate.id);
            g.appendChild(circle);
        });

        // Output pins
        def.outputPins.forEach((pin, i) => {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', pin.x);
            line.setAttribute('y1', pin.y);
            line.setAttribute('x2', pin.x + 12);
            line.setAttribute('y2', pin.y);
            line.setAttribute('stroke', '#334');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('class', 'pin-line');
            g.appendChild(line);

            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', pin.x + 12);
            circle.setAttribute('cy', pin.y);
            circle.setAttribute('r', 5);
            circle.setAttribute('class', 'gate-pin');
            circle.setAttribute('data-pin-type', 'output');
            circle.setAttribute('data-pin-index', i);
            circle.setAttribute('data-gate-id', gate.id);
            g.appendChild(circle);
        });

        gate.svgGroup = g;
        this.gateLayer.appendChild(g);
    }

    _renderInput(input) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'input-toggle gate-group');
        g.setAttribute('transform', `translate(${input.x}, ${input.y})`);
        g.setAttribute('data-gate-id', input.id);

        // Background box
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', 0);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', 60);
        rect.setAttribute('height', 40);
        rect.setAttribute('class', 'input-toggle-bg');
        g.appendChild(rect);

        // Name label
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', 20);
        label.setAttribute('y', 14);
        label.setAttribute('class', 'input-toggle-label');
        label.textContent = input.name;
        g.appendChild(label);

        // Value display
        const val = document.createElementNS(SVG_NS, 'text');
        val.setAttribute('x', 20);
        val.setAttribute('y', 30);
        val.setAttribute('class', 'input-toggle-value low');
        val.setAttribute('data-value-display', 'true');
        val.textContent = '0';
        g.appendChild(val);

        // Output pin
        const pin = document.createElementNS(SVG_NS, 'circle');
        pin.setAttribute('cx', 65);
        pin.setAttribute('cy', 20);
        pin.setAttribute('r', 5);
        pin.setAttribute('class', 'gate-pin');
        pin.setAttribute('data-pin-type', 'output');
        pin.setAttribute('data-pin-index', '0');
        pin.setAttribute('data-gate-id', input.id);
        g.appendChild(pin);

        // Pin line
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', 60);
        line.setAttribute('y1', 20);
        line.setAttribute('x2', 65);
        line.setAttribute('y2', 20);
        line.setAttribute('stroke', '#334');
        line.setAttribute('stroke-width', '2');
        g.appendChild(line);

        input.svgGroup = g;
        this.gateLayer.appendChild(g);
    }

    _renderOutput(output) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'led-output gate-group');
        g.setAttribute('transform', `translate(${output.x}, ${output.y})`);
        g.setAttribute('data-gate-id', output.id);

        // Input pin
        const pin = document.createElementNS(SVG_NS, 'circle');
        pin.setAttribute('cx', -5);
        pin.setAttribute('cy', 20);
        pin.setAttribute('r', 5);
        pin.setAttribute('class', 'gate-pin');
        pin.setAttribute('data-pin-type', 'input');
        pin.setAttribute('data-pin-index', '0');
        pin.setAttribute('data-gate-id', output.id);
        g.appendChild(pin);

        // Pin line
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', -5);
        line.setAttribute('y1', 20);
        line.setAttribute('x2', 5);
        line.setAttribute('y2', 20);
        line.setAttribute('stroke', '#334');
        line.setAttribute('stroke-width', '2');
        g.appendChild(line);

        // LED glow
        const glow = document.createElementNS(SVG_NS, 'circle');
        glow.setAttribute('cx', 25);
        glow.setAttribute('cy', 20);
        glow.setAttribute('r', 22);
        glow.setAttribute('class', 'led-glow');
        glow.setAttribute('fill', 'rgba(0, 255, 136, 0.3)');
        g.appendChild(glow);

        // LED body
        const led = document.createElementNS(SVG_NS, 'circle');
        led.setAttribute('cx', 25);
        led.setAttribute('cy', 20);
        led.setAttribute('r', 14);
        led.setAttribute('class', 'led-body off');
        g.appendChild(led);

        // LED label
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', 25);
        label.setAttribute('y', 22);
        label.setAttribute('class', 'gate-label');
        label.setAttribute('fill', '#fff');
        label.textContent = output.name;
        g.appendChild(label);

        output.svgGroup = g;
        this.gateLayer.appendChild(g);
    }

    /**
     * Update the visual state of an input toggle.
     */
    updateInputVisual(inputId) {
        const input = this.gates.get(inputId);
        if (!input || input.type !== 'INPUT') return;

        const valEl = input.svgGroup.querySelector('[data-value-display]');
        if (valEl) {
            valEl.textContent = input.value.toString();
            valEl.setAttribute('class', `input-toggle-value ${input.value ? 'high' : 'low'}`);
        }

        // Update input box border
        const rect = input.svgGroup.querySelector('rect');
        if (rect) {
            rect.style.stroke = input.value ? '#00ff88' : '#00d4ff';
        }
    }

    /**
     * Update LED visual state.
     */
    updateOutputVisual(outputId) {
        const output = this.gates.get(outputId);
        if (!output || output.type !== 'OUTPUT') return;

        const led = output.svgGroup.querySelector('.led-body');
        const glow = output.svgGroup.querySelector('.led-glow');

        if (led) {
            led.setAttribute('class', `led-body ${output.value ? 'on' : 'off'}`);
        }
        if (glow) {
            glow.setAttribute('class', `led-glow ${output.value ? 'active' : ''}`);
        }
    }

    /**
     * Update all wire visuals based on signal values.
     */
    updateWireVisuals() {
        for (const conn of this.connections) {
            if (conn.svgPath) {
                const sourceGate = this.gates.get(conn.sourceId);
                const val = sourceGate ? sourceGate.outputValues[conn.sourcePin] : 0;
                conn.svgPath.setAttribute('class', `wire ${val ? 'high' : 'low'}`);
            }
        }
    }

    // ─── Connection Path Rendering ───

    /**
     * Add a connection and render the wire.
     */
    addConnection(sourceId, sourcePin, targetId, targetPin) {
        const conn = {
            sourceId,
            sourcePin,
            targetId,
            targetPin,
            svgPath: null
        };

        // Create SVG path
        conn.svgPath = this._createWirePath(conn);
        this.wireLayer.appendChild(conn.svgPath);

        // Store connection
        this.connections.push(conn);

        // Update gate references
        const targetGate = this.gates.get(targetId);
        if (targetGate && targetGate.inputConnections) {
            targetGate.inputConnections[targetPin] = conn;
        }

        const sourceGate = this.gates.get(sourceId);
        if (sourceGate && sourceGate.outputConnections) {
            sourceGate.outputConnections.push(conn);
        }

        if (this.onCircuitChanged) this.onCircuitChanged();
        return conn;
    }

    /**
     * Remove a specific connection.
     */
    removeConnection(conn) {
        const idx = this.connections.indexOf(conn);
        if (idx === -1) return;

        if (conn.svgPath) conn.svgPath.remove();

        // Clear references
        const targetGate = this.gates.get(conn.targetId);
        if (targetGate && targetGate.inputConnections) {
            targetGate.inputConnections[conn.targetPin] = null;
            targetGate.inputValues[conn.targetPin] = null;
        }

        const sourceGate = this.gates.get(conn.sourceId);
        if (sourceGate && sourceGate.outputConnections) {
            sourceGate.outputConnections = sourceGate.outputConnections.filter(c => c !== conn);
        }

        this.connections.splice(idx, 1);
        if (this.onCircuitChanged) this.onCircuitChanged();
    }

    _createWirePath(conn) {
        const path = document.createElementNS(SVG_NS, 'path');
        const d = this._calcWirePath(conn);
        path.setAttribute('d', d);
        path.setAttribute('class', 'wire low');
        path.setAttribute('data-source', conn.sourceId);
        path.setAttribute('data-target', conn.targetId);

        // Click to delete wire
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeConnection(conn);
        });

        return path;
    }

    _calcWirePath(conn) {
        const sourceGate = this.gates.get(conn.sourceId);
        const targetGate = this.gates.get(conn.targetId);
        if (!sourceGate || !targetGate) return 'M 0,0';

        const from = sourceGate.getOutputPinPosition(conn.sourcePin);
        const to = targetGate.getInputPinPosition(conn.targetPin);

        // Offset for pin circles
        from.x += 12;
        to.x -= 12;

        // Bézier curve
        const dx = Math.abs(to.x - from.x);
        const cpOffset = Math.max(40, dx * 0.4);

        return `M ${from.x},${from.y} C ${from.x + cpOffset},${from.y} ${to.x - cpOffset},${to.y} ${to.x},${to.y}`;
    }

    _updateConnectionPaths() {
        for (const conn of this.connections) {
            if (conn.svgPath) {
                conn.svgPath.setAttribute('d', this._calcWirePath(conn));
            }
        }
    }

    // ─── Wire Preview ───

    /**
     * Show a preview wire from a point to the cursor.
     */
    showWirePreview(fromX, fromY, toX, toY) {
        let preview = this.uiLayer.querySelector('.wire-preview');
        if (!preview) {
            preview = document.createElementNS(SVG_NS, 'path');
            preview.setAttribute('class', 'wire-preview');
            this.uiLayer.appendChild(preview);
        }

        const dx = Math.abs(toX - fromX);
        const cpOffset = Math.max(30, dx * 0.4);
        const d = `M ${fromX},${fromY} C ${fromX + cpOffset},${fromY} ${toX - cpOffset},${toY} ${toX},${toY}`;
        preview.setAttribute('d', d);
    }

    /**
     * Hide the wire preview.
     */
    hideWirePreview() {
        const preview = this.uiLayer.querySelector('.wire-preview');
        if (preview) preview.remove();
    }

    // ─── Coordinate Helpers ───

    /**
     * Convert screen coordinates to SVG coordinates.
     */
    screenToSVG(clientX, clientY) {
        const pt = this.svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgPt = pt.matrixTransform(this.svg.getScreenCTM().inverse());
        return { x: svgPt.x, y: svgPt.y };
    }

    /**
     * Find a gate at given SVG coordinates.
     */
    findGateAt(svgX, svgY) {
        for (const [id, gate] of this.gates) {
            const w = gate.definition ? gate.definition.width : 60;
            const h = gate.definition ? gate.definition.height : 40;
            if (
                svgX >= gate.x - 15 && svgX <= gate.x + w + 15 &&
                svgY >= gate.y - 10 && svgY <= gate.y + h + 10
            ) {
                return gate;
            }
        }
        return null;
    }

    /**
     * Get all gates (excluding inputs and outputs).
     */
    getLogicGates() {
        return Array.from(this.gates.values()).filter(
            g => g.type !== 'INPUT' && g.type !== 'OUTPUT'
        );
    }

    /**
     * Get all input nodes.
     */
    getInputNodes() {
        return Array.from(this.gates.values()).filter(g => g.type === 'INPUT');
    }

    /**
     * Get all output nodes.
     */
    getOutputNodes() {
        return Array.from(this.gates.values()).filter(g => g.type === 'OUTPUT');
    }

    /**
     * Get serializable circuit data for API evaluation.
     */
    getCircuitData() {
        const gates = [];
        const inputNames = {};
        let outputGateId = null;

        for (const [id, gate] of this.gates) {
            gates.push(gate.toJSON());
            if (gate.type === 'INPUT') {
                inputNames[gate.id] = gate.name;
            }
            if (gate.type === 'OUTPUT') {
                outputGateId = gate.id;
            }
        }

        const connections = this.connections.map(c => ({
            sourceGateId: c.sourceId,
            sourcePin: c.sourcePin,
            targetGateId: c.targetId,
            targetPin: c.targetPin
        }));

        return { gates, connections, inputNames, outputGateId };
    }
}
