"""
LogicPuzzle Lab - Slot Puzzle Templates
Pre-built circuits with missing gates (puzzle / Kahoot mode).
"""
from __future__ import annotations

import json
import os
import random
from typing import Any

_PUZZLES: list[dict[str, Any]] | None = None


def _puzzles_path() -> str:
    return os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'puzzles',
        'slot_puzzles.json'
    )


def _layout_metrics(puzzle: dict[str, Any]) -> tuple[int, int, int]:
    layout = puzzle.get('layout', {})
    slots = layout.get('slots') or []
    connections = layout.get('connections') or []
    fixed = layout.get('fixed_gates') or []
    return len(slots), len(connections), len(fixed)


def is_kahoot_slot_puzzle(puzzle: dict[str, Any]) -> bool:
    """
    Kahoot/examen: circuito poblado, 2–3 piezas por colocar, 5–7 conexiones.
    """
    n_slots, n_conn, n_fixed = _layout_metrics(puzzle)
    if n_slots < 2 or n_slots > 3:
        return False
    if n_conn < 4 or n_conn > 9:
        return False
    return True


def load_slot_puzzles() -> list[dict[str, Any]]:
    global _PUZZLES
    if _PUZZLES is not None:
        return _PUZZLES
    with open(_puzzles_path(), 'r', encoding='utf-8') as f:
        data = json.load(f)
    _PUZZLES = [
        p for p in data.get('puzzles', [])
        if p.get('layout', {}).get('slots')
    ]
    return _PUZZLES


def load_kahoot_slot_puzzles() -> list[dict[str, Any]]:
    """Subconjunto para multijugador: más compuertas fijas y 2–3 huecos."""
    return [p for p in load_slot_puzzles() if is_kahoot_slot_puzzle(p)]


def get_slot_puzzle(puzzle_id: str) -> dict[str, Any] | None:
    for p in load_slot_puzzles():
        if p['id'] == puzzle_id:
            return p
    return None


def get_random_slot_puzzles(count: int) -> list[str]:
    pool = load_kahoot_slot_puzzles()
    if not pool:
        pool = [
            p for p in load_slot_puzzles()
            if len(_layout_metrics(p)[0]) >= 1
            and _layout_metrics(p)[1] >= 5
        ]
    if not pool:
        pool = load_slot_puzzles()

    if len(pool) <= count:
        shuffled = [p['id'] for p in pool]
        random.shuffle(shuffled)
        while len(shuffled) < count:
            extra = [p['id'] for p in pool]
            random.shuffle(extra)
            shuffled.extend(extra)
        return shuffled[:count]
    chosen = random.sample(pool, count)
    return [p['id'] for p in chosen]


def validate_slot_answer(puzzle: dict[str, Any], slot_fills: dict[str, str]) -> dict[str, Any]:
    """
    Validate that all slots are filled with correct gate types.
    slot_fills: { slot_ref: gate_type }
    """
    slots = puzzle.get('layout', {}).get('slots', [])
    if not slots:
        return {'valid': False, 'message': 'Puzzle sin slots'}

    missing = []
    wrong = []
    for slot in slots:
        ref = slot['ref']
        expected = slot['accepts']
        if ref not in slot_fills:
            missing.append(ref)
            continue
        if slot_fills[ref] not in expected:
            wrong.append({'slot': ref, 'expected': expected, 'got': slot_fills[ref]})

    if missing:
        return {'valid': False, 'message': f'Faltan {len(missing)} compuerta(s) por colocar'}
    if wrong:
        return {'valid': False, 'message': 'Compuerta incorrecta en uno o más espacios'}

    return {'valid': True, 'message': '¡Circuito completado correctamente!'}
