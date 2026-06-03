/**
 * LogicPuzzle Lab - Calculator input validation
 * Variables: A-Z (always uppercase). Gates: via buttons.
 * Algebra: + = OR, x/X/·/. = AND, A(B) = A AND (B)
 */

export const CALC_GATES = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'XNOR'];
const GATE_SET = new Set(CALC_GATES);

/** Characters allowed when typing on keyboard */
const KEYBOARD_CHAR = /^[a-zA-Z()\[\]{}.+xX\s]$/;

/**
 * Remove invalid characters; force uppercase letters.
 */
export function sanitizeCalcInput(value) {
    return value
        .replace(/[^a-zA-Z()\[\]{}.+xX\s]/g, '')
        .replace(/[a-z]/g, (ch) => ch.toUpperCase());
}

/**
 * Insert implicit AND (algebraic product): A(B) → A AND (B)
 */
function insertImplicitAnd(expr) {
    let s = expr;
    // A(B) → A AND (B) — solo variables de una letra, no la D de "AND ("
    s = s.replace(/(?<![A-Z])([A-Z])\s*(?=\()/g, '$1 AND ');
    // )( → ) AND (
    s = s.replace(/(\))\s*(?=\()/g, '$1 AND ');
    // )B → ) AND B (solo variable de una letra, no inicio de OR/AND/NOT…)
    s = s.replace(/(\))\s*([A-Z])(?=\s|\)|$)/g, '$1 AND $2');
    return s.replace(/\s+/g, ' ').trim();
}

/**
 * Class notation: + → OR, x/X between operands → AND
 */
function applyAlgebraSyntax(expr) {
    let s = expr;
    s = s.replace(/\+/g, ' OR ');
    // x or X as AND when between variables/parens (not inside words like XOR)
    s = s.replace(/([A-Z)\]])\s*[xX]\s*(?=[(A-Z])/g, '$1 AND ');
    return s.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize for backend: brackets → parentheses, dot → AND, algebra, implicit AND.
 */
export function normalizeCalcExpression(expr) {
    let out = sanitizeCalcInput(expr)
        .replace(/\s+/g, ' ')
        .replace(/\[/g, '(')
        .replace(/\]/g, ')')
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .trim();

    out = out.replace(/\s*\.\s*/g, ' AND ');
    out = applyAlgebraSyntax(out);
    out = insertImplicitAnd(out);
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
        return { ok: false, message: 'No se permiten números. Usa solo letras A-Z.' };
    }

    if (/[^a-zA-Z()\[\]{}.+xX\s]/.test(raw)) {
        return { ok: false, message: 'Caracteres no permitidos. Use letras, +, x, () [] {} . y botones de compuertas.' };
    }

    const words = raw.match(/[A-Za-z]+/g) || [];
    for (const word of words) {
        const upper = word.toUpperCase();
        if (word.length === 1) continue;
        if (!GATE_SET.has(upper)) {
            return {
                ok: false,
                message: `"${word}" no es válido. Variables: una letra (A-Z). Compuertas: use los botones.`,
            };
        }
    }

    return { ok: true, message: '' };
}

/**
 * Turn backend/parser errors into student-friendly Spanish.
 */
export function friendlyCalcError(serverMessage) {
    const msg = String(serverMessage || '');
    if (/Token inesperado.*LPAREN/i.test(msg) || /posición\s*1/i.test(msg)) {
        return (
            'Falta un operador entre variable y paréntesis. ' +
            'Ejemplo: A(B) en clase significa A·B → escribe A AND (B), A.(B) o A x (B). ' +
            'También puedes usar + para OR y x para AND: A x (A + B).'
        );
    }
    if (/Token inesperado/i.test(msg)) {
        return 'Revisa la sintaxis: use AND, OR, NOT (botones), + para OR, x para AND, y paréntesis balanceados.';
    }
    if (/Carácter no reconocido/i.test(msg)) {
        return 'Hay un símbolo no permitido. Use letras A-Z, +, x, . y los botones de compuertas.';
    }
    return msg.replace(/^Error al parsear la expresión:\s*/i, '');
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
    const t = token.length === 1 ? token.toUpperCase() : token;
    if (t.length === 1) return t;
    return ` ${t} `;
}
