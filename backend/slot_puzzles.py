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


def load_slot_puzzles() -> list[dict[str, Any]]:
    global _PUZZLES
    if _PUZZLES is not None:
        return _PUZZLES
    with open(_puzzles_path(), 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Solo puzzles con al menos un slot vacío
    _PUZZLES = [
        p for p in data.get('puzzles', [])
        if p.get('layout', {}).get('slots')
    ]
    return _PUZZLES


def get_slot_puzzle(puzzle_id: str) -> dict[str, Any] | None:
    for p in load_slot_puzzles():
        if p['id'] == puzzle_id:
            return p
    return None


def get_random_slot_puzzles(count: int) -> list[str]:
    pool = load_slot_puzzles()
    if len(pool) <= count:
        shuffled = [p['id'] for p in pool]
        random.shuffle(shuffled)
        # Repeat if needed for infinite pool effect
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
