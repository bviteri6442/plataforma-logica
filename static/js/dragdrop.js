/**
 * LogicPuzzle Lab - Drag & Drop System
 * =======================================
 * Handles dragging gates from palette to workspace, moving gates within workspace.
 * Supports both mouse and touch events.
 */

import { sounds } from './sounds.js';

export class DragDropManager {
    /**
     * @param {CircuitRenderer} circuit - The circuit renderer instance
     * @param {HTMLElement} palette - The gate palette container
     * @param {SVGElement} svgWorkspace - The SVG workspace element
     */
    constructor(circuit, palette, svgWorkspace) {
        this.circuit = circuit;
        this.palette = palette;
        this.svgWorkspace = svgWorkspace;

        // Drag state
        this.isDragging = false;
        this.dragSource = null; // 'palette' or 'workspace'
        this.dragGateType = null;
        this.dragGateId = null;
        this.dragGhost = null;
        this.dragOffset = { x: 0, y: 0 };
        this.startPos = { x: 0, y: 0 };

        // Connection state
        this.isConnecting = false;
        this.connectionStart = null; // { gateId, pinType, pinIndex }

        // Callbacks
        this.onGateDropped = null;   // Called when a gate is dropped from palette
        this.onGateMoved = null;     // Called when a gate is moved
        this.onConnectionMade = null; // Called when a connection is completed
        this.onInputToggled = null;
        this.onSlotFilled = null;
        this.onSlotError = null;

        // Slot puzzle mode
        this.slotMode = false;
        this.slotLoader = null;

        this._bindEvents();
    }

    _bindEvents() {
        // Palette drag start (mouse)
        this.palette.addEventListener('mousedown', (e) => this._onPaletteMouseDown(e));

        // SVG workspace events (mouse)
        this.svgWorkspace.addEventListener('mousedown', (e) => this._onWorkspaceMouseDown(e));

        // Global mouse move/up
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));

        // Touch events for palette
        this.palette.addEventListener('touchstart', (e) => this._onPaletteTouchStart(e), { passive: false });

        // Touch events for workspace
        this.svgWorkspace.addEventListener('touchstart', (e) => this._onWorkspaceTouchStart(e), { passive: false });

        // Global touch move/end
        document.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this._onTouchEnd(e));

        // Keyboard
        document.addEventListener('keydown', (e) => this._onKeyDown(e));
    }

    // ─── Palette Drag (Mouse) ───

    _onPaletteMouseDown(e) {
        const gateItem = e.target.closest('.gate-item');
        if (!gateItem) return;

        e.preventDefault();
        const gateType = gateItem.dataset.gateType;
        if (!gateType) return;

        this._startPaletteDrag(gateType, e.clientX, e.clientY);
    }

    _startPaletteDrag(gateType, clientX, clientY) {
        this.isDragging = true;
        this.dragSource = 'palette';
        this.dragGateType = gateType;
        this.startPos = { x: clientX, y: clientY };

        // Create ghost element
        this._createDragGhost(gateType, clientX, clientY);

        // Visual feedback on workspace
        this.svgWorkspace.parentElement.classList.add('workspace-drop-active');

        sounds.click();
    }

    // ─── Workspace Drag (Mouse) ───

    _onWorkspaceMouseDown(e) {
        if (this.isDragging) return;

        const target = e.target;

        // Check for pin click (connection mode)
        if (target.classList.contains('gate-pin')) {
            e.preventDefault();
            e.stopPropagation();
            this._handlePinClick(target);
            return;
        }

        // Check for input toggle
        const inputGroup = target.closest('.input-toggle');
        if (inputGroup && !target.classList.contains('gate-pin')) {
            e.preventDefault();
            const gateId = inputGroup.dataset.gateId;
            if (this.onInputToggled) this.onInputToggled(gateId);
            return;
        }

        // Check for gate group (move)
        const gateGroup = target.closest('.gate-group');
        if (gateGroup) {
            e.preventDefault();
            const gateId = gateGroup.dataset.gateId;
            const gate = this.circuit.gates.get(gateId);

            // Don't allow moving locked / input / output gates
            if (!gate || gate.locked || gate.type === 'INPUT' || gate.type === 'OUTPUT') return;
            if (this.slotMode) return;

            this.isDragging = true;
            this.dragSource = 'workspace';
            this.dragGateId = gateId;

            const svgPt = this.circuit.screenToSVG(e.clientX, e.clientY);
            this.dragOffset = {
                x: svgPt.x - gate.x,
                y: svgPt.y - gate.y
            };

            this.circuit.selectGate(gateId);
            return;
        }

        // Click on empty space - deselect & cancel connection
        if (this.isConnecting) {
            this._cancelConnection();
        }
        this.circuit.deselectAll();
    }

    _onMouseMove(e) {
        if (!this.isDragging && !this.isConnecting) return;

        if (this.isDragging) {
            if (this.dragSource === 'palette' && this.dragGhost) {
                this._updateGhostPosition(e.clientX, e.clientY);
            } else if (this.dragSource === 'workspace') {
                const svgPt = this.circuit.screenToSVG(e.clientX, e.clientY);
                this.circuit.moveGate(
                    this.dragGateId,
                    svgPt.x - this.dragOffset.x,
                    svgPt.y - this.dragOffset.y
                );
            }
        }

        if (this.isConnecting && this.connectionStart) {
            const svgPt = this.circuit.screenToSVG(e.clientX, e.clientY);
            const gate = this.circuit.gates.get(this.connectionStart.gateId);
            if (gate) {
                let from;
                if (this.connectionStart.pinType === 'output') {
                    from = gate.getOutputPinPosition(this.connectionStart.pinIndex);
                    from.x += 12;
                } else {
                    from = gate.getInputPinPosition(this.connectionStart.pinIndex);
                    from.x -= 12;
                }
                this.circuit.showWirePreview(from.x, from.y, svgPt.x, svgPt.y);
            }
        }
    }

    _onMouseUp(e) {
        if (!this.isDragging) return;

        if (this.dragSource === 'palette') {
            this._finishPaletteDrop(e.clientX, e.clientY);
        } else if (this.dragSource === 'workspace') {
            if (this.onGateMoved) this.onGateMoved(this.dragGateId);
        }

        this._cleanupDrag();
    }

    // ─── Touch Events ───

    _onPaletteTouchStart(e) {
        const gateItem = e.target.closest('.gate-item');
        if (!gateItem) return;

        e.preventDefault();
        const touch = e.touches[0];
        const gateType = gateItem.dataset.gateType;
        if (!gateType) return;

        this._startPaletteDrag(gateType, touch.clientX, touch.clientY);
    }

    _onWorkspaceTouchStart(e) {
        if (this.isDragging) return;

        const target = e.target;

        // Pin click
        if (target.classList.contains('gate-pin')) {
            e.preventDefault();
            this._handlePinClick(target);
            return;
        }

        // Input toggle
        const inputGroup = target.closest('.input-toggle');
        if (inputGroup && !target.classList.contains('gate-pin')) {
            e.preventDefault();
            const gateId = inputGroup.dataset.gateId;
            if (this.onInputToggled) this.onInputToggled(gateId);
            return;
        }

        // Gate move
        const gateGroup = target.closest('.gate-group');
        if (gateGroup) {
            e.preventDefault();
            const touch = e.touches[0];
            const gateId = gateGroup.dataset.gateId;
            const gate = this.circuit.gates.get(gateId);
            if (!gate) return;

            this.isDragging = true;
            this.dragSource = 'workspace';
            this.dragGateId = gateId;

            const svgPt = this.circuit.screenToSVG(touch.clientX, touch.clientY);
            this.dragOffset = {
                x: svgPt.x - gate.x,
                y: svgPt.y - gate.y
            };

            this.circuit.selectGate(gateId);
        }
    }

    _onTouchMove(e) {
        if (!this.isDragging && !this.isConnecting) return;

        e.preventDefault();
        const touch = e.touches[0];

        if (this.isDragging) {
            if (this.dragSource === 'palette' && this.dragGhost) {
                this._updateGhostPosition(touch.clientX, touch.clientY);
            } else if (this.dragSource === 'workspace') {
                const svgPt = this.circuit.screenToSVG(touch.clientX, touch.clientY);
                this.circuit.moveGate(
                    this.dragGateId,
                    svgPt.x - this.dragOffset.x,
                    svgPt.y - this.dragOffset.y
                );
            }
        }

        if (this.isConnecting && this.connectionStart) {
            const svgPt = this.circuit.screenToSVG(touch.clientX, touch.clientY);
            const gate = this.circuit.gates.get(this.connectionStart.gateId);
            if (gate) {
                let from;
                if (this.connectionStart.pinType === 'output') {
                    from = gate.getOutputPinPosition(this.connectionStart.pinIndex);
                    from.x += 12;
                } else {
                    from = gate.getInputPinPosition(this.connectionStart.pinIndex);
                    from.x -= 12;
                }
                this.circuit.showWirePreview(from.x, from.y, svgPt.x, svgPt.y);
            }
        }
    }

    _onTouchEnd(e) {
        if (!this.isDragging) return;

        const touch = e.changedTouches[0];

        if (this.dragSource === 'palette') {
            this._finishPaletteDrop(touch.clientX, touch.clientY);
        } else if (this.dragSource === 'workspace') {
            if (this.onGateMoved) this.onGateMoved(this.dragGateId);
        }

        this._cleanupDrag();
    }

    // ─── Connection Handling ───

    _handlePinClick(pinElement) {
        if (this.slotMode) return;
        const gateId = pinElement.dataset.gateId;
        const pinType = pinElement.dataset.pinType;
        const pinIndex = parseInt(pinElement.dataset.pinIndex);

        if (!this.isConnecting) {
            // Start connection
            this.isConnecting = true;
            this.connectionStart = { gateId, pinType, pinIndex };
            pinElement.classList.add('connected');
            sounds.click();
        } else {
            // Complete connection
            const start = this.connectionStart;

            // Validate: must connect output → input (or input → output)
            if (start.pinType === pinType) {
                // Same type - invalid
                this._cancelConnection();
                return;
            }

            // Don't connect to self
            if (start.gateId === gateId) {
                this._cancelConnection();
                return;
            }

            let sourceId, sourcePin, targetId, targetPin;

            if (start.pinType === 'output') {
                sourceId = start.gateId;
                sourcePin = start.pinIndex;
                targetId = gateId;
                targetPin = pinIndex;
            } else {
                sourceId = gateId;
                sourcePin = pinIndex;
                targetId = start.gateId;
                targetPin = start.pinIndex;
            }

            // Check if target pin already has a connection
            const targetGate = this.circuit.gates.get(targetId);
            if (targetGate && targetGate.inputConnections && targetGate.inputConnections[targetPin]) {
                // Remove existing connection
                this.circuit.removeConnection(targetGate.inputConnections[targetPin]);
            }

            // Make connection
            this.circuit.addConnection(sourceId, sourcePin, targetId, targetPin);

            if (this.onConnectionMade) {
                this.onConnectionMade(sourceId, sourcePin, targetId, targetPin);
            }

            sounds.connect();
            this._cancelConnection();
        }
    }

    _cancelConnection() {
        this.isConnecting = false;
        this.connectionStart = null;
        this.circuit.hideWirePreview();
    }

    // ─── Ghost Element ───

    _createDragGhost(gateType, x, y) {
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost';
        this.dragGhost.innerHTML = `
            <svg width="80" height="50" viewBox="0 0 80 50">
                <rect x="5" y="5" width="70" height="40" rx="6" fill="rgba(20,20,50,0.9)" stroke="#00d4ff" stroke-width="2"/>
                <text x="40" y="27" text-anchor="middle" dominant-baseline="central" fill="#e8e8ff" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="600">${gateType}</text>
            </svg>
        `;
        this.dragGhost.style.left = `${x - 40}px`;
        this.dragGhost.style.top = `${y - 25}px`;
        document.body.appendChild(this.dragGhost);
    }

    _updateGhostPosition(x, y) {
        if (!this.dragGhost) return;
        this.dragGhost.style.left = `${x - 40}px`;
        this.dragGhost.style.top = `${y - 25}px`;
    }

    _finishPaletteDrop(clientX, clientY) {
        // Check if drop is within workspace
        const workspaceRect = this.svgWorkspace.getBoundingClientRect();
        const isOverWorkspace =
            clientX >= workspaceRect.left && clientX <= workspaceRect.right &&
            clientY >= workspaceRect.top && clientY <= workspaceRect.bottom;

        if (isOverWorkspace && this.dragGateType) {
            const svgPt = this.circuit.screenToSVG(clientX, clientY);

            if (this.slotMode && this.slotLoader) {
                const result = this.slotLoader.tryDrop(this.dragGateType, svgPt.x, svgPt.y);
                if (result.success) {
                    sounds.success();
                    if (this.onSlotFilled) this.onSlotFilled(result);
                } else {
                    sounds.error();
                    if (this.onSlotError) this.onSlotError(result.message);
                }
                return;
            }

            const gate = this.circuit.addGate(this.dragGateType, svgPt.x - 40, svgPt.y - 25);

            if (this.onGateDropped) {
                this.onGateDropped(gate);
            }

            sounds.click();
        }
    }

    _cleanupDrag() {
        this.isDragging = false;
        this.dragSource = null;
        this.dragGateType = null;
        this.dragGateId = null;

        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        this.svgWorkspace.parentElement?.classList.remove('workspace-drop-active');
    }

    // ─── Keyboard ───

    _onKeyDown(e) {
        // Delete/Backspace - remove selected gate
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.circuit.selectedGate) {
            // Don't delete if focus is on an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            const gate = this.circuit.selectedGate;
            // Don't allow deleting fixed inputs/outputs in puzzle mode
            if (gate.type !== 'INPUT' && gate.type !== 'OUTPUT') {
                this.circuit.removeGate(gate.id);
                sounds.remove();
            }
        }

        // Escape - cancel connection
        if (e.key === 'Escape') {
            if (this.isConnecting) {
                this._cancelConnection();
            }
        }
    }
}
