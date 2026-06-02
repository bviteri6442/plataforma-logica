"""
LogicPuzzle Lab - Motor de Lógica Booleana
==========================================
Parser, evaluador y generador de tablas de verdad para expresiones booleanas.
Soporta: AND, OR, NOT, NAND, NOR, XOR, XNOR.

Basado en: "Fundamentos de Sistemas Digitales" - Thomas L. Floyd, 9na edición.
"""

from itertools import product
from typing import Any


# ─────────────────────────────────────────────────────────────
# TOKENIZER
# ─────────────────────────────────────────────────────────────

class Token:
    """Representa un token en una expresión booleana."""

    def __init__(self, type_: str, value: str):
        self.type = type_   # 'VAR', 'OP', 'LPAREN', 'RPAREN'
        self.value = value

    def __repr__(self) -> str:
        return f"Token({self.type}, {self.value})"


def tokenize(expression: str) -> list[Token]:
    """
    Convierte una expresión booleana en una lista de tokens.

    Soporta:
        - Variables: letras mayúsculas (A-Z) o palabras que no son operadores
        - Operadores: AND, OR, NOT, NAND, NOR, XOR, XNOR
        - Símbolos: · ∧ (AND), + ∨ (OR), ¬ ! ~ (NOT), ⊕ ^ (XOR), ⊙ (XNOR)
        - Paréntesis: ( )
    """
    tokens: list[Token] = []
    pos = 0
    expr = expression.strip()

    while pos < len(expr):
        char = expr[pos]

        # Espacios
        if char.isspace():
            pos += 1
            continue

        # Paréntesis
        if char == '(':
            tokens.append(Token('LPAREN', '('))
            pos += 1
            continue
        if char == ')':
            tokens.append(Token('RPAREN', ')'))
            pos += 1
            continue

        # Símbolos de operadores
        if char in ('·', '∧', '&'):
            if char == '&' and pos + 1 < len(expr) and expr[pos + 1] == '&':
                pos += 2
            else:
                pos += 1
            tokens.append(Token('OP', 'AND'))
            continue
        if char in ('+', '∨', '|'):
            if char == '|' and pos + 1 < len(expr) and expr[pos + 1] == '|':
                pos += 2
            else:
                pos += 1
            tokens.append(Token('OP', 'OR'))
            continue
        if char in ('¬', '!', '~'):
            tokens.append(Token('OP', 'NOT'))
            pos += 1
            continue
        if char in ('⊕',):
            tokens.append(Token('OP', 'XOR'))
            pos += 1
            continue
        if char == '⊙':
            tokens.append(Token('OP', 'XNOR'))
            pos += 1
            continue
        if char == '^':
            tokens.append(Token('OP', 'XOR'))
            pos += 1
            continue

        # Palabras (variables u operadores)
        if char.isalpha() or char == '_':
            word = ''
            while pos < len(expr) and (expr[pos].isalpha() or expr[pos] == '_'):
                word += expr[pos]
                pos += 1

            upper_word = word.upper()
            if upper_word in ('AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'):
                tokens.append(Token('OP', upper_word))
            else:
                tokens.append(Token('VAR', upper_word))
            continue

        # Dígitos (para constantes 0 y 1)
        if char in ('0', '1'):
            tokens.append(Token('CONST', char))
            pos += 1
            continue

        raise ValueError(
            f"Carácter no reconocido: '{char}' en posición {pos + 1}. "
            "Use AND, OR, NOT, XOR, paréntesis o símbolos · + ¬ ⊕."
        )

    return tokens


# ─────────────────────────────────────────────────────────────
# PARSER (Recursive Descent)
# ─────────────────────────────────────────────────────────────

class Parser:
    """
    Parser de descenso recursivo para expresiones booleanas.

    Precedencia (menor a mayor):
        1. OR, NOR
        2. XOR, XNOR
        3. AND, NAND
        4. NOT (unario)
        5. Átomo (variable, constante, paréntesis)
    """

    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> Token | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def consume(self) -> Token:
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def parse(self) -> dict[str, Any]:
        """Parsea la expresión completa y retorna un AST."""
        result = self.or_expr()
        if self.pos < len(self.tokens):
            raise ValueError(
                f"Token inesperado: {self.tokens[self.pos]} en posición {self.pos}"
            )
        return result

    def or_expr(self) -> dict[str, Any]:
        """Regla: or_expr → xor_expr (('OR' | 'NOR') xor_expr)*"""
        left = self.xor_expr()
        while self.peek() and self.peek().type == 'OP' and self.peek().value in ('OR', 'NOR'):
            op = self.consume().value
            right = self.xor_expr()
            left = {'op': op, 'left': left, 'right': right}
        return left

    def xor_expr(self) -> dict[str, Any]:
        """Regla: xor_expr → and_expr (('XOR' | 'XNOR') and_expr)*"""
        left = self.and_expr()
        while self.peek() and self.peek().type == 'OP' and self.peek().value in ('XOR', 'XNOR'):
            op = self.consume().value
            right = self.and_expr()
            left = {'op': op, 'left': left, 'right': right}
        return left

    def and_expr(self) -> dict[str, Any]:
        """Regla: and_expr → not_expr (('AND' | 'NAND') not_expr)*"""
        left = self.not_expr()
        while self.peek() and self.peek().type == 'OP' and self.peek().value in ('AND', 'NAND'):
            op = self.consume().value
            right = self.not_expr()
            left = {'op': op, 'left': left, 'right': right}
        return left

    def not_expr(self) -> dict[str, Any]:
        """Regla: not_expr → 'NOT' not_expr | atom"""
        if self.peek() and self.peek().type == 'OP' and self.peek().value == 'NOT':
            self.consume()
            operand = self.not_expr()
            return {'op': 'NOT', 'operand': operand}
        return self.atom()

    def atom(self) -> dict[str, Any]:
        """Regla: atom → '(' or_expr ')' | VAR | CONST"""
        token = self.peek()

        if token is None:
            raise ValueError("Se esperaba una expresión, pero se encontró el final")

        if token.type == 'LPAREN':
            self.consume()  # consumir '('
            result = self.or_expr()
            if not self.peek() or self.peek().type != 'RPAREN':
                raise ValueError("Se esperaba ')' de cierre")
            self.consume()  # consumir ')'
            return result

        if token.type == 'VAR':
            self.consume()
            return {'var': token.value}

        if token.type == 'CONST':
            self.consume()
            return {'const': int(token.value)}

        raise ValueError(f"Token inesperado: {token}")


# ─────────────────────────────────────────────────────────────
# EVALUADOR
# ─────────────────────────────────────────────────────────────

def evaluate_ast(ast: dict[str, Any], values: dict[str, int]) -> int:
    """
    Evalúa un AST booleano con los valores dados para las variables.

    Args:
        ast: Árbol de sintaxis abstracta generado por el Parser.
        values: Diccionario con los valores de las variables (ej: {'A': 1, 'B': 0}).

    Returns:
        Resultado de la evaluación (0 o 1).
    """
    # Constante
    if 'const' in ast:
        return ast['const']

    # Variable
    if 'var' in ast:
        var_name = ast['var']
        if var_name not in values:
            raise ValueError(f"Variable no definida: {var_name}")
        return values[var_name]

    op = ast['op']

    # Operador unario: NOT
    if op == 'NOT':
        operand_val = evaluate_ast(ast['operand'], values)
        return 1 if operand_val == 0 else 0

    # Operadores binarios
    left_val = evaluate_ast(ast['left'], values)
    right_val = evaluate_ast(ast['right'], values)

    if op == 'AND':
        return 1 if (left_val == 1 and right_val == 1) else 0
    elif op == 'OR':
        return 1 if (left_val == 1 or right_val == 1) else 0
    elif op == 'NAND':
        return 0 if (left_val == 1 and right_val == 1) else 1
    elif op == 'NOR':
        return 0 if (left_val == 1 or right_val == 1) else 1
    elif op == 'XOR':
        return 1 if (left_val != right_val) else 0
    elif op == 'XNOR':
        return 1 if (left_val == right_val) else 0
    else:
        raise ValueError(f"Operador desconocido: {op}")


# ─────────────────────────────────────────────────────────────
# EXTRACTOR DE VARIABLES
# ─────────────────────────────────────────────────────────────

def extract_variables(ast: dict[str, Any]) -> set[str]:
    """Extrae todas las variables únicas de un AST."""
    variables: set[str] = set()

    if 'var' in ast:
        variables.add(ast['var'])
    elif 'const' in ast:
        pass
    elif ast['op'] == 'NOT':
        variables.update(extract_variables(ast['operand']))
    else:
        variables.update(extract_variables(ast['left']))
        variables.update(extract_variables(ast['right']))

    return variables


# ─────────────────────────────────────────────────────────────
# GENERADOR DE TABLAS DE VERDAD
# ─────────────────────────────────────────────────────────────

def generate_truth_table(expression: str) -> dict[str, Any]:
    """
    Genera una tabla de verdad completa para una expresión booleana.

    Args:
        expression: Expresión booleana como string (ej: "A AND B OR NOT C")

    Returns:
        Diccionario con:
            - variables: lista ordenada de variables
            - expression: la expresión original
            - rows: lista de filas, cada una con valores de variables y resultado
    """
    tokens = tokenize(expression)
    parser = Parser(tokens)
    ast = parser.parse()
    variables = sorted(extract_variables(ast))

    rows = []
    for combo in product([0, 1], repeat=len(variables)):
        values = dict(zip(variables, combo))
        result = evaluate_ast(ast, values)
        row = {**values, 'F': result}
        rows.append(row)

    return {
        'variables': variables,
        'expression': expression,
        'rows': rows,
        'ast': ast
    }


# ─────────────────────────────────────────────────────────────
# COMPARADOR DE CIRCUITOS
# ─────────────────────────────────────────────────────────────

def compare_truth_tables(
    table1: list[dict[str, int]],
    table2: list[dict[str, int]],
    output_key: str = 'F'
) -> dict[str, Any]:
    """
    Compara dos tablas de verdad para verificar equivalencia lógica.

    Args:
        table1: Primera tabla de verdad (esperada).
        table2: Segunda tabla de verdad (del usuario).
        output_key: Nombre de la columna de salida.

    Returns:
        Diccionario con resultado de la comparación.
    """
    if len(table1) != len(table2):
        return {
            'equivalent': False,
            'message': 'Las tablas tienen diferente número de filas.',
            'differences': []
        }

    differences = []
    for i, (row1, row2) in enumerate(zip(table1, table2)):
        if row1.get(output_key) != row2.get(output_key):
            differences.append({
                'row': i,
                'expected': row1.get(output_key),
                'got': row2.get(output_key),
                'inputs': {k: v for k, v in row1.items() if k != output_key}
            })

    return {
        'equivalent': len(differences) == 0,
        'message': '¡Circuito correcto!' if len(differences) == 0 else f'{len(differences)} fila(s) incorrecta(s).',
        'differences': differences,
        'correct_rows': len(table1) - len(differences),
        'total_rows': len(table1),
        'score_percentage': round(((len(table1) - len(differences)) / len(table1)) * 100, 1)
    }


# ─────────────────────────────────────────────────────────────
# EVALUADOR DE CIRCUITOS (Grafo)
# ─────────────────────────────────────────────────────────────

def evaluate_circuit(
    gates: list[dict[str, Any]],
    connections: list[dict[str, Any]],
    input_values: dict[str, int]
) -> dict[str, Any]:
    """
    Evalúa un circuito representado como grafo de compuertas y conexiones.

    Args:
        gates: Lista de compuertas con id, type, etc.
        connections: Lista de conexiones {sourceGateId, sourcePin, targetGateId, targetPin}
        input_values: Valores de las entradas {gateId: valor}

    Returns:
        Diccionario con valores de salida de cada compuerta.
    """
    # Construir mapa de compuertas
    gate_map: dict[str, dict[str, Any]] = {}
    for gate in gates:
        gate_map[gate['id']] = {
            'type': gate['type'],
            'inputs': [],
            'output': None,
            'evaluated': False
        }

    # Construir grafo de dependencias
    incoming: dict[str, list[tuple[str, int]]] = {g['id']: [] for g in gates}
    for conn in connections:
        target_id = conn['targetGateId']
        source_id = conn['sourceGateId']
        target_pin = conn.get('targetPin', 0)
        incoming[target_id].append((source_id, target_pin))

    # Establecer valores de entrada
    for gate_id, value in input_values.items():
        if gate_id in gate_map:
            gate_map[gate_id]['output'] = value
            gate_map[gate_id]['evaluated'] = True

    # Ordenamiento topológico y evaluación
    max_iterations = len(gates) * 2  # Prevenir loops infinitos
    iteration = 0
    changed = True

    while changed and iteration < max_iterations:
        changed = False
        iteration += 1

        for gate_id, gate_info in gate_map.items():
            if gate_info['evaluated']:
                continue

            # Verificar si todas las entradas están disponibles
            input_conns = incoming.get(gate_id, [])
            if not input_conns:
                continue

            all_ready = all(
                gate_map[src_id]['evaluated']
                for src_id, _ in input_conns
            )

            if not all_ready:
                continue

            # Obtener valores de entrada
            input_vals = []
            # Ordenar por pin de destino para mantener orden correcto
            sorted_conns = sorted(input_conns, key=lambda x: x[1])
            for src_id, _ in sorted_conns:
                input_vals.append(gate_map[src_id]['output'])

            # Evaluar la compuerta
            gate_type = gate_info['type']
            result = evaluate_gate(gate_type, input_vals)

            gate_map[gate_id]['output'] = result
            gate_map[gate_id]['inputs'] = input_vals
            gate_map[gate_id]['evaluated'] = True
            changed = True

    # Recopilar resultados
    results = {}
    for gate_id, gate_info in gate_map.items():
        results[gate_id] = {
            'type': gate_info['type'],
            'output': gate_info['output'],
            'inputs': gate_info['inputs'],
            'evaluated': gate_info['evaluated']
        }

    return results


def evaluate_gate(gate_type: str, inputs: list[int]) -> int:
    """
    Evalúa una compuerta lógica individual.

    Args:
        gate_type: Tipo de compuerta (AND, OR, NOT, etc.)
        inputs: Lista de valores de entrada (0 o 1)

    Returns:
        Valor de salida (0 o 1)
    """
    if gate_type == 'AND':
        return 1 if all(i == 1 for i in inputs) else 0
    elif gate_type == 'OR':
        return 1 if any(i == 1 for i in inputs) else 0
    elif gate_type == 'NOT':
        return 0 if inputs[0] == 1 else 1
    elif gate_type == 'NAND':
        return 0 if all(i == 1 for i in inputs) else 1
    elif gate_type == 'NOR':
        return 0 if any(i == 1 for i in inputs) else 1
    elif gate_type == 'XOR':
        result = 0
        for i in inputs:
            result ^= i
        return result
    elif gate_type == 'XNOR':
        result = 0
        for i in inputs:
            result ^= i
        return 0 if result == 1 else 1
    elif gate_type == 'BUFFER':
        return inputs[0] if inputs else 0
    elif gate_type == 'INPUT':
        return inputs[0] if inputs else 0
    elif gate_type == 'LED':
        return inputs[0] if inputs else 0
    else:
        raise ValueError(f"Tipo de compuerta desconocido: {gate_type}")


# ─────────────────────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────────────────────

def expression_to_ast(expression: str) -> dict[str, Any]:
    """Convierte una expresión booleana a su AST."""
    tokens = tokenize(expression)
    parser = Parser(tokens)
    return parser.parse()


def ast_to_string(ast: dict[str, Any]) -> str:
    """Convierte un AST de vuelta a una expresión legible."""
    if 'var' in ast:
        return ast['var']
    if 'const' in ast:
        return str(ast['const'])
    if ast['op'] == 'NOT':
        operand = ast_to_string(ast['operand'])
        if 'op' in ast['operand'] and ast['operand']['op'] != 'NOT':
            return f"NOT({operand})"
        return f"NOT {operand}"

    left = ast_to_string(ast['left'])
    right = ast_to_string(ast['right'])
    op = ast['op']

    # Agregar paréntesis para claridad
    if 'op' in ast['left'] and ast['left']['op'] in ('OR', 'NOR') and op in ('AND', 'NAND', 'XOR', 'XNOR'):
        left = f"({left})"
    if 'op' in ast['right'] and ast['right']['op'] in ('OR', 'NOR') and op in ('AND', 'NAND', 'XOR', 'XNOR'):
        right = f"({right})"

    return f"{left} {op} {right}"
