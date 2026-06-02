/**
 * LogicPuzzle Lab - Signal Simulator
 * =====================================
 * Real-time signal propagation through the circuit graph.
 * Topological evaluation of gates from inputs to outputs.
 */

export class Simulator {
    /**
     * @param {CircuitRenderer} circuit - The circuit renderer instance
     */
    constructor(circuit) {
        this.circuit = circuit;
    }

    /**
     * Run a full simulation step.
     * Propagates signals from all inputs through all gates to all outputs.
     */
    simulate() {
        const gates = this.circuit.gates;
        const connections = this.circuit.connections;

        // Step 1: Reset all non-input gate outputs
        for (const [id, gate] of gates) {
            if (gate.type === 'INPUT') {
                gate.evaluate(); // Sets outputValues from current value
                this.circuit.updateInputVisual(id);
            }
        }

        // Step 2: Build dependency graph and propagate
        const evaluated = new Set();
        const inputIds = [];

        for (const [id, gate] of gates) {
            if (gate.type === 'INPUT') {
                evaluated.add(id);
                inputIds.push(id);
            }
        }

        // Step 3: Iterative propagation (handles arbitrary depth)
        let changed = true;
        let iterations = 0;
        const maxIterations = gates.size * 2;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const [id, gate] of gates) {
                if (evaluated.has(id)) continue;

                // Find connections targeting this gate's inputs
                const inputConns = connections.filter(c => c.targetId === id);

                if (gate.type === 'OUTPUT') {
                    // Output needs 1 input connection
                    if (inputConns.length > 0) {
                        const conn = inputConns[0];
                        const sourceGate = gates.get(conn.sourceId);
                        if (sourceGate && evaluated.has(conn.sourceId)) {
                            gate.inputValues[0] = sourceGate.outputValues[conn.sourcePin];
                            gate.evaluate();
                            evaluated.add(id);
                            changed = true;
                            this.circuit.updateOutputVisual(id);
                        }
                    }
                } else {
                    // Logic gate - check if all input connections are from evaluated gates
                    const numInputs = gate.definition.numInputs;
                    let allReady = true;

                    // Set input values from connections
                    for (let i = 0; i < numInputs; i++) {
                        const conn = inputConns.find(c => c.targetPin === i);
                        if (conn) {
                            const sourceGate = gates.get(conn.sourceId);
                            if (sourceGate && evaluated.has(conn.sourceId)) {
                                gate.inputValues[i] = sourceGate.outputValues[conn.sourcePin];
                            } else {
                                allReady = false;
                            }
                        } else {
                            // No connection to this pin - use 0
                            gate.inputValues[i] = 0;
                        }
                    }

                    if (allReady) {
                        gate.evaluate();
                        evaluated.add(id);
                        changed = true;
                    }
                }
            }
        }

        // Step 4: Update wire visuals
        this.circuit.updateWireVisuals();
    }

    /**
     * Generate a truth table for the current circuit.
     * Tests all combinations of input values.
     */
    generateTruthTable() {
        const inputs = this.circuit.getInputNodes();
        const outputs = this.circuit.getOutputNodes();

        if (inputs.length === 0 || outputs.length === 0) {
            return { variables: [], rows: [] };
        }

        const variables = inputs.map(i => i.name).sort();
        const rows = [];
        const numCombinations = 1 << inputs.length;

        // Save current input values
        const savedValues = inputs.map(i => i.value);

        // Sort inputs by name for consistent ordering
        const sortedInputs = [...inputs].sort((a, b) => a.name.localeCompare(b.name));

        for (let combo = 0; combo < numCombinations; combo++) {
            // Set input values for this combination
            for (let i = 0; i < sortedInputs.length; i++) {
                const bitVal = (combo >> (sortedInputs.length - 1 - i)) & 1;
                sortedInputs[i].value = bitVal;
                sortedInputs[i].outputValues[0] = bitVal;
            }

            // Run simulation
            this.simulate();

            // Collect output values
            const row = {};
            for (const inp of sortedInputs) {
                row[inp.name] = inp.value;
            }
            for (const out of outputs) {
                row[out.name] = out.value;
            }

            rows.push(row);
        }

        // Restore original input values
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].value = savedValues[i];
            inputs[i].outputValues[0] = savedValues[i];
        }

        // Re-simulate with original values
        this.simulate();

        return { variables, rows };
    }

    /**
     * Check if the circuit output matches an expected truth table.
     */
    validateCircuit(expectedTable) {
        const userTable = this.generateTruthTable();

        if (userTable.rows.length === 0) {
            return {
                valid: false,
                message: 'El circuito no tiene entradas o salidas conectadas.',
                score: 0,
                differences: []
            };
        }

        // Compare
        const differences = [];
        let correctRows = 0;

        for (let i = 0; i < expectedTable.length; i++) {
            const expected = expectedTable[i];
            const actual = userTable.rows[i];

            if (!actual) {
                differences.push({ row: i, expected, actual: null });
                continue;
            }

            // Compare output column (F)
            if (expected.F === actual.F) {
                correctRows++;
            } else {
                differences.push({ row: i, expected, actual });
            }
        }

        const totalRows = expectedTable.length;
        const score = Math.round((correctRows / totalRows) * 100);
        const valid = differences.length === 0;

        let message;
        if (valid) {
            message = '¡Circuito correcto! La tabla de verdad coincide perfectamente.';
        } else if (score >= 75) {
            message = `Casi perfecto. ${differences.length} fila(s) no coinciden.`;
        } else if (score >= 50) {
            message = `Buen intento. ${correctRows}/${totalRows} filas correctas.`;
        } else {
            message = `Revisa tu circuito. Solo ${correctRows}/${totalRows} filas son correctas.`;
        }

        return {
            valid,
            message,
            score,
            correctRows,
            totalRows,
            differences,
            userTable: userTable.rows
        };
    }

    /**
     * Check if the circuit is complete (all pins connected).
     */
    isCircuitComplete() {
        const logicGates = this.circuit.getLogicGates();
        const outputs = this.circuit.getOutputNodes();

        // Check all logic gates have inputs
        for (const gate of logicGates) {
            for (let i = 0; i < gate.definition.numInputs; i++) {
                if (!gate.inputConnections[i]) {
                    return { complete: false, message: `La compuerta ${gate.type} tiene entradas sin conectar.` };
                }
            }
        }

        // Check outputs are connected
        for (const out of outputs) {
            if (!out.inputConnections[0]) {
                return { complete: false, message: `La salida ${out.name} no está conectada.` };
            }
        }

        return { complete: true, message: 'Circuito completo.' };
    }
}
