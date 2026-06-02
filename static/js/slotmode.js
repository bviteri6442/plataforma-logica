/**
 * LogicPuzzle Lab - Slot Circuit Mode
 * Pre-built circuits with empty slots for puzzle/Kahoot gameplay.
 */

import { GATE_TYPES } from './gates.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class SlotCircuitLoader {
    constructor(circuit) {
        this.circuit = circuit;
        this.slots = new Map();
        this.refToGateId = new Map();
        this.connectionDefs = [];
        this.active = false;
        this.currentPuzzle = null;
    }

    loadPuzzle(puzzle) {
        this.reset();
        this.active = true;
        this.currentPuzzle = puzzle;
        const layout = puzzle.layout || {};

        for (const inp of layout.inputs || []) {
            const node = this.circuit.addInput(inp.ref, inp.x, inp.y);
            this.refToGateId.set(inp.ref, node.id);
        }

        for (const out of layout.outputs || []) {
            const node = this.circuit.addOutput(out.ref, out.x, out.y);
            this.refToGateId.set(out.ref, node.id);
        }

        for (const fg of layout.fixed_gates || []) {
            const gate = this.circuit.addGate(fg.type, fg.x, fg.y);
            gate.locked = true;
            this.refToGateId.set(fg.ref, gate.id);
            if (gate.svgGroup) {
                gate.svgGroup.classList.add('gate-locked');
                gate.svgGroup.style.pointerEvents = 'none';
            }
        }

        for (const slot of layout.slots || []) {
            this.slots.set(slot.ref, {
                ...slot,
                filled: false,
                gateId: null,
                element: this._renderSlotZone(slot),
            });
        }

        this.connectionDefs = layout.connections || [];
        this._drawAllWires();
    }

    reset() {
        this.slots.clear();
        this.refToGateId.clear();
        this.connectionDefs = [];
        this.active = false;
        this.currentPuzzle = null;
        this.circuit.clear();
    }

    _renderSlotZone(slot) {
        const def = GATE_TYPES[slot.accepts[0]] || GATE_TYPES.AND;
        const w = def.width + 20;
        const h = def.height + 20;
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'slot-zone');
        g.setAttribute('data-slot-ref', slot.ref);
        g.setAttribute('transform', `translate(${slot.x - 10}, ${slot.y - 10})`);

        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', 8);
        rect.setAttribute('class', 'slot-zone-rect');
        g.appendChild(rect);

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', w / 2);
        label.setAttribute('y', h / 2);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'central');
        label.setAttribute('class', 'slot-zone-label');
        label.textContent = slot.label || '?';
        g.appendChild(label);

        this.circuit.gateLayer.appendChild(g);
        return g;
    }

    findSlotAt(svgX, svgY) {
        for (const [ref, slot] of this.slots) {
            if (slot.filled) continue;
            const def = GATE_TYPES[slot.accepts[0]] || GATE_TYPES.AND;
            const w = def.width + 20;
            const h = def.height + 20;
            if (
                svgX >= slot.x - 10 && svgX <= slot.x - 10 + w &&
                svgY >= slot.y - 10 && svgY <= slot.y - 10 + h
            ) {
                return ref;
            }
        }
        return null;
    }

    tryDrop(gateType, svgX, svgY) {
        const slotRef = this.findSlotAt(svgX, svgY);
        if (!slotRef) {
            return { success: false, message: 'Suelta la compuerta en un espacio vacío (?)' };
        }
        const slot = this.slots.get(slotRef);
        if (!slot.accepts.includes(gateType)) {
            return { success: false, message: `Esta posición requiere: ${slot.accepts.join(' o ')}` };
        }
        return this.fillSlot(slotRef, gateType);
    }

    fillSlot(slotRef, gateType) {
        const slot = this.slots.get(slotRef);
        if (!slot || slot.filled) {
            return { success: false, message: 'Espacio ya ocupado' };
        }

        const gate = this.circuit.addGate(gateType, slot.x, slot.y);
        gate.locked = true;
        gate.slotRef = slotRef;
        if (gate.svgGroup) {
            gate.svgGroup.classList.add('gate-locked', 'gate-slot-filled');
        }

        slot.filled = true;
        slot.gateId = gate.id;
        this.refToGateId.set(slotRef, gate.id);

        if (slot.element) {
            slot.element.remove();
            slot.element = null;
        }

        this._drawAllWires();

        if (this.circuit.onCircuitChanged) this.circuit.onCircuitChanged();

        return { success: true, slotRef, gateType };
    }

    getSlotFills() {
        const fills = {};
        for (const [ref, slot] of this.slots) {
            if (slot.filled && slot.gateId) {
                const gate = this.circuit.gates.get(slot.gateId);
                if (gate) fills[ref] = gate.type;
            }
        }
        return fills;
    }

    allSlotsFilled() {
        if (this.slots.size === 0) return true;
        return Array.from(this.slots.values()).every(s => s.filled);
    }

    _parseRef(refStr) {
        const [ref, pinStr] = refStr.split(':');
        return { ref, pin: parseInt(pinStr, 10) || 0 };
    }

    _resolveGateId(ref) {
        return this.refToGateId.get(ref) || null;
    }

    _drawAllWires() {
        while (this.circuit.wireLayer.firstChild) {
            this.circuit.wireLayer.firstChild.remove();
        }
        this.circuit.connections = [];

        for (const conn of this.connectionDefs) {
            const from = this._parseRef(conn.from);
            const to = this._parseRef(conn.to);
            const sourceId = this._resolveGateId(from.ref);
            const targetId = this._resolveGateId(to.ref);

            if (!sourceId || !targetId) continue;

            this.circuit.addConnection(sourceId, from.pin, targetId, to.pin);
        }
    }
}
