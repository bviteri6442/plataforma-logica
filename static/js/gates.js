/**
 * LogicPuzzle Lab - Gate Definitions
 * ====================================
 * Definiciones SVG y lógica de todas las compuertas.
 * Cada compuerta incluye: forma SVG, pines, evaluación lógica y metadata.
 */

// ─── Gate Type Definitions ───

export const GATE_TYPES = {
    AND: {
        name: 'AND',
        label: 'AND',
        description: 'Salida HIGH cuando TODAS las entradas son HIGH',
        numInputs: 2,
        numOutputs: 1,
        width: 80,
        height: 50,
        color: '#00d4ff',
        evaluate: (inputs) => inputs.every(v => v === 1) ? 1 : 0,
        // SVG path for AND gate shape
        svgPath: 'M 5,2 L 38,2 C 68,2 68,48 38,48 L 5,48 Z',
        inputPins: [
            { x: 0, y: 17 },
            { x: 0, y: 33 }
        ],
        outputPins: [
            { x: 80, y: 25 }
        ],
        bubble: null
    },

    OR: {
        name: 'OR',
        label: 'OR',
        description: 'Salida HIGH cuando AL MENOS UNA entrada es HIGH',
        numInputs: 2,
        numOutputs: 1,
        width: 80,
        height: 50,
        color: '#00d4ff',
        evaluate: (inputs) => inputs.some(v => v === 1) ? 1 : 0,
        svgPath: 'M 8,2 C 22,2 50,8 75,25 C 50,42 22,48 8,48 C 18,35 18,15 8,2 Z',
        inputPins: [
            { x: 12, y: 17 },
            { x: 12, y: 33 }
        ],
        outputPins: [
            { x: 80, y: 25 }
        ],
        bubble: null
    },

    NOT: {
        name: 'NOT',
        label: 'NOT',
        description: 'Invierte la señal: HIGH → LOW, LOW → HIGH',
        numInputs: 1,
        numOutputs: 1,
        width: 70,
        height: 50,
        color: '#ff6b35',
        evaluate: (inputs) => inputs[0] === 1 ? 0 : 1,
        svgPath: 'M 5,5 L 50,25 L 5,45 Z',
        inputPins: [
            { x: 0, y: 25 }
        ],
        outputPins: [
            { x: 70, y: 25 }
        ],
        bubble: { cx: 57, cy: 25, r: 6 }
    },

    NAND: {
        name: 'NAND',
        label: 'NAND',
        description: 'NOT AND: LOW solo cuando TODAS las entradas son HIGH',
        numInputs: 2,
        numOutputs: 1,
        width: 88,
        height: 50,
        color: '#a855f7',
        evaluate: (inputs) => inputs.every(v => v === 1) ? 0 : 1,
        svgPath: 'M 5,2 L 38,2 C 65,2 65,48 38,48 L 5,48 Z',
        inputPins: [
            { x: 0, y: 17 },
            { x: 0, y: 33 }
        ],
        outputPins: [
            { x: 88, y: 25 }
        ],
        bubble: { cx: 72, cy: 25, r: 6 }
    },

    NOR: {
        name: 'NOR',
        label: 'NOR',
        description: 'NOT OR: HIGH solo cuando TODAS las entradas son LOW',
        numInputs: 2,
        numOutputs: 1,
        width: 88,
        height: 50,
        color: '#a855f7',
        evaluate: (inputs) => inputs.some(v => v === 1) ? 0 : 1,
        svgPath: 'M 8,2 C 22,2 48,8 70,25 C 48,42 22,48 8,48 C 18,35 18,15 8,2 Z',
        inputPins: [
            { x: 12, y: 17 },
            { x: 12, y: 33 }
        ],
        outputPins: [
            { x: 88, y: 25 }
        ],
        bubble: { cx: 77, cy: 25, r: 6 }
    },

    XOR: {
        name: 'XOR',
        label: 'XOR',
        description: 'OR exclusivo: HIGH cuando las entradas son DIFERENTES',
        numInputs: 2,
        numOutputs: 1,
        width: 85,
        height: 50,
        color: '#ff69b4',
        evaluate: (inputs) => (inputs[0] ^ inputs[1]) ? 1 : 0,
        svgPath: 'M 12,2 C 26,2 52,8 78,25 C 52,42 26,48 12,48 C 22,35 22,15 12,2 Z',
        // Extra curve for XOR
        extraPath: 'M 5,2 C 15,15 15,35 5,48',
        inputPins: [
            { x: 12, y: 17 },
            { x: 12, y: 33 }
        ],
        outputPins: [
            { x: 85, y: 25 }
        ],
        bubble: null
    },

    XNOR: {
        name: 'XNOR',
        label: 'XNOR',
        description: 'Equivalencia: HIGH cuando las entradas son IGUALES',
        numInputs: 2,
        numOutputs: 1,
        width: 92,
        height: 50,
        color: '#ff69b4',
        evaluate: (inputs) => (inputs[0] ^ inputs[1]) ? 0 : 1,
        svgPath: 'M 12,2 C 26,2 50,8 72,25 C 50,42 26,48 12,48 C 22,35 22,15 12,2 Z',
        extraPath: 'M 5,2 C 15,15 15,35 5,48',
        inputPins: [
            { x: 12, y: 17 },
            { x: 12, y: 33 }
        ],
        outputPins: [
            { x: 92, y: 25 }
        ],
        bubble: { cx: 80, cy: 25, r: 6 }
    }
};

// ─── Gate Instance Class ───

let _nextGateId = 0;

export function resetGateIdCounter() {
    _nextGateId = 0;
}

export class GateInstance {
    /**
     * Represents a placed gate on the workspace.
     * @param {string} type - Gate type (AND, OR, NOT, etc.)
     * @param {number} x - X position on workspace
     * @param {number} y - Y position on workspace
     */
    constructor(type, x, y) {
        this.id = `gate_${_nextGateId++}`;
        this.type = type;
        this.x = x;
        this.y = y;
        this.definition = GATE_TYPES[type];

        // Pin states
        this.inputValues = new Array(this.definition.numInputs).fill(null);
        this.outputValues = new Array(this.definition.numOutputs).fill(0);

        // Connection tracking
        this.inputConnections = new Array(this.definition.numInputs).fill(null);
        this.outputConnections = [];

        // SVG element reference
        this.svgGroup = null;

        // State
        this.selected = false;
    }

    /**
     * Get absolute position of an input pin.
     */
    getInputPinPosition(index) {
        const pin = this.definition.inputPins[index];
        return {
            x: this.x + pin.x,
            y: this.y + pin.y
        };
    }

    /**
     * Get absolute position of an output pin.
     */
    getOutputPinPosition(index = 0) {
        const pin = this.definition.outputPins[index];
        return {
            x: this.x + pin.x,
            y: this.y + pin.y
        };
    }

    /**
     * Evaluate this gate's output based on input values.
     */
    evaluate() {
        // If any input is null (not connected), treat as 0
        const inputs = this.inputValues.map(v => v === null ? 0 : v);
        this.outputValues[0] = this.definition.evaluate(inputs);
        return this.outputValues[0];
    }

    /**
     * Check if all inputs are connected.
     */
    isFullyConnected() {
        return this.inputConnections.every(c => c !== null);
    }

    /**
     * Serializable representation.
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y
        };
    }
}

// ─── Input Node ───

let _nextInputId = 0;

export function resetInputIdCounter() {
    _nextInputId = 0;
}

export class InputNode {
    constructor(name, x, y) {
        this.id = `input_${_nextInputId++}`;
        this.type = 'INPUT';
        this.name = name;
        this.x = x;
        this.y = y;
        this.value = 0;
        this.outputConnections = [];
        this.svgGroup = null;

        // For compatibility with gate interface
        this.definition = {
            width: 60,
            height: 40,
            numOutputs: 1,
            outputPins: [{ x: 60, y: 20 }]
        };
        this.outputValues = [0];
    }

    toggle() {
        this.value = this.value === 0 ? 1 : 0;
        this.outputValues[0] = this.value;
        return this.value;
    }

    getOutputPinPosition(index = 0) {
        return {
            x: this.x + this.definition.outputPins[index].x,
            y: this.y + this.definition.outputPins[index].y
        };
    }

    evaluate() {
        this.outputValues[0] = this.value;
        return this.value;
    }

    toJSON() {
        return {
            id: this.id,
            type: 'INPUT',
            name: this.name,
            x: this.x,
            y: this.y
        };
    }
}

// ─── Output Node (LED) ───

let _nextOutputId = 0;

export function resetOutputIdCounter() {
    _nextOutputId = 0;
}

export class OutputNode {
    constructor(name, x, y) {
        this.id = `output_${_nextOutputId++}`;
        this.type = 'OUTPUT';
        this.name = name;
        this.x = x;
        this.y = y;
        this.value = 0;
        this.inputConnections = [null];
        this.inputValues = [null];
        this.svgGroup = null;

        this.definition = {
            width: 50,
            height: 40,
            numInputs: 1,
            inputPins: [{ x: 0, y: 20 }]
        };
    }

    getInputPinPosition(index = 0) {
        return {
            x: this.x + this.definition.inputPins[index].x,
            y: this.y + this.definition.inputPins[index].y
        };
    }

    evaluate() {
        this.value = this.inputValues[0] === null ? 0 : this.inputValues[0];
        return this.value;
    }

    toJSON() {
        return {
            id: this.id,
            type: 'OUTPUT',
            name: this.name,
            x: this.x,
            y: this.y
        };
    }
}

// ─── Utility Functions ───

/**
 * Get all available gate types for a puzzle.
 */
export function getAvailableGates(allowedTypes = null) {
    if (!allowedTypes) {
        return Object.keys(GATE_TYPES);
    }
    return allowedTypes.filter(t => GATE_TYPES[t]);
}

/**
 * Get educational info for a gate type.
 */
export function getGateInfo(type) {
    const gate = GATE_TYPES[type];
    if (!gate) return null;

    const truthTable = generateGateTruthTable(type);

    return {
        name: gate.name,
        description: gate.description,
        numInputs: gate.numInputs,
        truthTable: truthTable
    };
}

/**
 * Generate truth table for a single gate.
 */
export function generateGateTruthTable(type) {
    const gate = GATE_TYPES[type];
    if (!gate) return [];

    const rows = [];
    const n = gate.numInputs;

    for (let i = 0; i < (1 << n); i++) {
        const inputs = [];
        for (let j = n - 1; j >= 0; j--) {
            inputs.push((i >> j) & 1);
        }
        const output = gate.evaluate(inputs);
        rows.push({ inputs, output });
    }

    return rows;
}
