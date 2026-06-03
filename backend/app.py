"""
LogicPuzzle Lab - Flask Application
====================================
API REST y servidor web para el simulador de lógica combinacional.
"""

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO
from backend.config import SECRET_KEY, REDIS_URL, ALLOWED_ORIGINS
from backend.logic_engine import (
    generate_truth_table,
    truth_table_to_expression,
    expression_to_ast,
    ast_to_string,
    evaluate_circuit,
    compare_truth_tables,
    evaluate_ast,
    extract_variables
)
from itertools import product
import json
import os


app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates'),
    static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
)
app.config['SECRET_KEY'] = SECRET_KEY

_message_queue = REDIS_URL if REDIS_URL else None
_async_mode = os.environ.get('SOCKETIO_ASYNC_MODE', 'threading')
socketio = SocketIO(
    app,
    cors_allowed_origins=ALLOWED_ORIGINS,
    async_mode=_async_mode,
    message_queue=_message_queue,
    ping_timeout=60,
    ping_interval=25,
)

from backend.socket_events import register_socket_events
register_socket_events(socketio)


# ─────────────────────────────────────────────────────────────
# CARGA DE PUZZLES
# ─────────────────────────────────────────────────────────────

def load_puzzles() -> list[dict]:
    """Carga los puzzles desde el archivo JSON."""
    puzzles_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'puzzles',
        'exercises.json'
    )
    with open(puzzles_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data.get('puzzles', [])


# ─────────────────────────────────────────────────────────────
# RUTAS DE PÁGINAS
# ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Sirve la página principal de la aplicación."""
    return render_template('index.html')


IMG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'img')


@app.route('/img/<path:filename>')
def serve_img(filename):
    """Sirve imágenes del proyecto (circuitos, QR, etc.)."""
    return send_from_directory(IMG_DIR, filename)


# ─────────────────────────────────────────────────────────────
# API: PUZZLES
# ─────────────────────────────────────────────────────────────

@app.route('/api/puzzles', methods=['GET'])
def get_puzzles():
    """
    Retorna la lista de puzzles disponibles.
    Query params opcionales:
        - category: filtrar por categoría
        - difficulty: filtrar por dificultad (1-5)
    """
    puzzles = load_puzzles()

    # Filtros opcionales
    category = request.args.get('category')
    difficulty = request.args.get('difficulty', type=int)

    if category:
        puzzles = [p for p in puzzles if p.get('category') == category]
    if difficulty:
        puzzles = [p for p in puzzles if p.get('difficulty') == difficulty]

    # Retornar resumen (sin solución detallada)
    summary = []
    for p in puzzles:
        summary.append({
            'id': p['id'],
            'name': p['name'],
            'category': p['category'],
            'difficulty': p['difficulty'],
            'description': p['description'],
            'expression': p['expression'],
            'inputs': p['inputs'],
            'outputs': p.get('outputs', ['F']),
            'available_gates': p.get('available_gates', []),
            'icon': p.get('icon', '🔧')
        })

    return jsonify({'puzzles': summary})


@app.route('/api/puzzles/<puzzle_id>', methods=['GET'])
def get_puzzle(puzzle_id: str):
    """Retorna los detalles completos de un puzzle específico."""
    puzzles = load_puzzles()
    puzzle = next((p for p in puzzles if p['id'] == puzzle_id), None)

    if not puzzle:
        return jsonify({'error': f'Puzzle "{puzzle_id}" no encontrado'}), 404

    return jsonify({'puzzle': puzzle})


# ─────────────────────────────────────────────────────────────
# API: PISTAS
# ─────────────────────────────────────────────────────────────

@app.route('/api/hints/<puzzle_id>/<int:hint_index>', methods=['GET'])
def get_hint(puzzle_id: str, hint_index: int):
    """Retorna una pista específica para un puzzle."""
    puzzles = load_puzzles()
    puzzle = next((p for p in puzzles if p['id'] == puzzle_id), None)

    if not puzzle:
        return jsonify({'error': 'Puzzle no encontrado'}), 404

    hints = puzzle.get('hints', [])
    if hint_index < 0 or hint_index >= len(hints):
        return jsonify({'error': 'Índice de pista fuera de rango'}), 400

    return jsonify({
        'hint': hints[hint_index],
        'hint_index': hint_index,
        'total_hints': len(hints),
        'has_more': hint_index < len(hints) - 1
    })


# ─────────────────────────────────────────────────────────────
# API: TABLA DE VERDAD
# ─────────────────────────────────────────────────────────────

@app.route('/api/truth-table', methods=['POST'])
def generate_table():
    """
    Genera una tabla de verdad para una expresión booleana.

    Body JSON:
        { "expression": "A AND B OR NOT C" }
    """
    data = request.get_json()
    if not data or 'expression' not in data:
        return jsonify({'error': 'Se requiere una expresión booleana'}), 400

    expression = data['expression']

    try:
        result = generate_truth_table(expression)
        # Remover el AST del resultado (no serializable para JSON de forma estándar)
        result_clean = {
            'variables': result['variables'],
            'expression': result['expression'],
            'rows': result['rows']
        }
        return jsonify(result_clean)
    except ValueError as e:
        return jsonify({'error': f'Error al parsear la expresión: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/truth-table-to-expression', methods=['POST'])
def table_to_expression():
    """
    Obtiene una expresión booleana (SOP) a partir de una tabla de verdad.

    Body JSON:
        {
            "variables": ["A", "B"],
            "rows": [{"A": 0, "B": 0, "F": 0}, ...]
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se requiere la tabla de verdad'}), 400

    variables = data.get('variables')
    rows = data.get('rows')
    if not variables or not rows:
        return jsonify({'error': 'Indica variables y filas de la tabla'}), 400

    try:
        result = truth_table_to_expression(variables, rows)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────────
# API: PARSEAR EXPRESIÓN
# ─────────────────────────────────────────────────────────────

@app.route('/api/parse-expression', methods=['POST'])
def parse_expression():
    """
    Parsea una expresión booleana y retorna su AST.

    Body JSON:
        { "expression": "(A AND B) OR NOT C" }
    """
    data = request.get_json()
    if not data or 'expression' not in data:
        return jsonify({'error': 'Se requiere una expresión booleana'}), 400

    expression = data['expression']

    try:
        ast = expression_to_ast(expression)
        readable = ast_to_string(ast)
        variables = sorted(extract_variables(ast))

        return jsonify({
            'ast': ast,
            'readable': readable,
            'variables': variables,
            'original': expression
        })
    except ValueError as e:
        return jsonify({'error': f'Error de sintaxis: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Error interno: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────────
# API: EVALUAR CIRCUITO
# ─────────────────────────────────────────────────────────────

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    Evalúa un circuito construido por el usuario y lo compara con la solución.

    Body JSON:
        {
            "puzzle_id": "and_basic",
            "gates": [...],
            "connections": [...],
            "input_names": {"gate_id_1": "A", "gate_id_2": "B"}
            "output_gate_id": "gate_id_5"
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Se requieren datos del circuito'}), 400

    puzzle_id = data.get('puzzle_id')
    gates = data.get('gates', [])
    connections = data.get('connections', [])
    input_names = data.get('input_names', {})
    output_gate_id = data.get('output_gate_id')

    # Cargar puzzle para comparar
    puzzles = load_puzzles()
    puzzle = next((p for p in puzzles if p['id'] == puzzle_id), None)

    if not puzzle:
        return jsonify({'error': 'Puzzle no encontrado'}), 404

    try:
        # Obtener tabla de verdad esperada
        expected_table = puzzle.get('expected_truth_table', [])

        # Generar tabla de verdad del circuito del usuario
        variables = sorted(input_names.values())
        # Mapeo inverso: nombre de variable → gate_id
        name_to_gate = {v: k for k, v in input_names.items()}

        user_table = []
        for combo in product([0, 1], repeat=len(variables)):
            input_values = {}
            row = {}
            for var_name, val in zip(variables, combo):
                gate_id = name_to_gate[var_name]
                input_values[gate_id] = val
                row[var_name] = val

            # Evaluar el circuito
            results = evaluate_circuit(gates, connections, input_values)

            # Obtener la salida
            if output_gate_id and output_gate_id in results:
                output_val = results[output_gate_id]['output']
                row['F'] = output_val if output_val is not None else 0
            else:
                row['F'] = 0

            user_table.append(row)

        # Comparar tablas
        comparison = compare_truth_tables(expected_table, user_table)

        return jsonify({
            'result': comparison,
            'user_table': user_table,
            'expected_table': expected_table
        })

    except Exception as e:
        return jsonify({'error': f'Error al evaluar: {str(e)}'}), 500


# ─────────────────────────────────────────────────────────────
# API: CATEGORÍAS Y ESTADÍSTICAS
# ─────────────────────────────────────────────────────────────

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Retorna las categorías de puzzles disponibles."""
    puzzles = load_puzzles()
    categories = {}

    for p in puzzles:
        cat = p.get('category', 'other')
        if cat not in categories:
            categories[cat] = {
                'name': cat,
                'count': 0,
                'difficulties': set()
            }
        categories[cat]['count'] += 1
        categories[cat]['difficulties'].add(p.get('difficulty', 1))

    # Convertir sets a listas para JSON
    result = []
    for key, val in categories.items():
        result.append({
            'id': key,
            'name': val['name'],
            'count': val['count'],
            'difficulties': sorted(list(val['difficulties']))
        })

    return jsonify({'categories': result})


# ─────────────────────────────────────────────────────────────
# API: SLOT PUZZLES (Kahoot / multiplayer mode)
# ─────────────────────────────────────────────────────────────

@app.route('/api/slot-puzzles/<puzzle_id>', methods=['GET'])
def get_slot_puzzle_route(puzzle_id: str):
    from backend.slot_puzzles import get_slot_puzzle
    puzzle = get_slot_puzzle(puzzle_id)
    if not puzzle:
        return jsonify({'error': 'Puzzle no encontrado'}), 404
    return jsonify({'puzzle': puzzle})


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check for Railway / load balancers."""
    return jsonify({'status': 'ok', 'service': 'logicpuzzle-lab'})
