/**
 * LogicPuzzle Lab - Calculator input validation
 * Variables: single letters a-z. Operators: via buttons only.
 * Separators: ( ) [ ] { } .
 */

export const CALC_GATES = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'];
const GATE_SET = new Set(CALC_GATES);

/** Characters allowed when typing on keyboard */
const KEYBOARD_CHAR = /^[a-z()\[\]{}.\s]$/;

/**
 * Remove invalid characters from raw input.
 */
export function sanitizeCalcInput(value) {
    return value
        .replace(/[^a-zA-Z()\[\]{}.\s]/g, '')
        .replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

/**
 * Normalize for backend: brackets → parentheses, dot → AND.
 */
export function normalizeCalcExpression(expr) {
    let out = sanitizeCalcInput(expr)
        .replace(/\s+/g, ' ')
        .replace(/\[/g, '(')
        .replace(/\]/g, ')')
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .trim();

    // A.B.C → A AND B AND C (dot as AND)
    out = out.replace(/\s*\.\s*/g, ' AND ');
    out = out.replace(/\b([a-z])\b/g, (_, ch) => ch.toUpperCase());
    out = out.replace(/\s*([()])\s*/g, ' $1 ');
    out = out.replace(/\s+/g, ' ').trim();

    return out;
}

/**
 * Validate expression before sending to API.
 */
export function validateCalcExpression(expr) {
    const raw = sanitizeCalcInput(expr).trim();
    if (!raw) {
        return { ok: false, message: 'Ingresa una expresión booleana' };
    }

    if (/\d/.test(raw)) {
        return { ok: false, message: 'No se permiten números. Usa solo letras a-z.' };
    }

    if (/[^a-zA-Z()\[\]{}.\s]/.test(raw)) {
        return { ok: false, message: 'Caracteres no permitidos. Solo letras, () [] {} . y compuertas.' };
    }

    const words = raw.match(/[A-Za-z]+/g) || [];
    for (const word of words) {
        const upper = word.toUpperCase();
        if (word.length === 1) continue;
        if (!GATE_SET.has(upper)) {
            return {
                ok: false,
                message: `"${word}" no es válido. Variables: una letra (a-z). Compuertas: use los botones.`,
            };
        }
    }

    return { ok: true, message: '' };
}

/**
 * Filter keyboard input (one character at a time).
 */
export function isAllowedCalcKey(char) {
    if (!char || char.length !== 1) return false;
    return KEYBOARD_CHAR.test(char);
}

/**
 * Insert token from shortcut button (operators or single variable).
 */
export function formatCalcToken(token) {
    if (token.length === 1) return token;
    return ` ${token} `;
}
