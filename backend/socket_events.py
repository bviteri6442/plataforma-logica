"""
LogicPuzzle Lab - WebSocket Event Handlers (Flask-SocketIO)
"""
from __future__ import annotations

import time
import threading
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room

from backend.config import ADMIN_PIN, GAME_QUESTIONS, QUESTION_TIME_SEC
from backend.game_manager import game_manager
from backend.slot_puzzles import get_slot_puzzle, validate_slot_answer


def register_socket_events(socketio: SocketIO) -> None:
    """Register all multiplayer game events."""

    @socketio.on('connect')
    def on_connect():
        emit('connected', {'status': 'ok'})

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid
        room = game_manager.leave(sid)
        if room:
            emit('lobby_update', room.to_lobby_dict(), room=room.code)

    @socketio.on('admin_create_room')
    def admin_create_room(data):
        sid = request.sid
        pin = (data or {}).get('pin', '')
        if pin != ADMIN_PIN:
            emit('error', {'message': 'PIN de administrador incorrecto'})
            return

        room = game_manager.create_room(sid)
        join_room(room.code)
        emit('room_created', {
            'code': room.code,
            'is_admin': True,
            'total_questions': GAME_QUESTIONS,
            'join_url': f'/?room={room.code}',
        })
        emit('lobby_update', room.to_lobby_dict())

    @socketio.on('join_room')
    def on_join_room(data):
        sid = request.sid
        data = data or {}
        code = (data.get('code') or '').upper().strip()
        name = (data.get('name') or '').strip()

        if not code or not name:
            emit('error', {'message': 'Código de sala y nombre son obligatorios'})
            return

        try:
            room = game_manager.join_room(code, sid, name)
        except ValueError as e:
            emit('error', {'message': str(e)})
            return

        join_room(room.code)
        is_admin = room.admin_sid == sid
        emit('joined_room', {
            'code': room.code,
            'name': name,
            'is_admin': is_admin,
            'total_questions': GAME_QUESTIONS,
        })
        emit('lobby_update', room.to_lobby_dict(), room=room.code)

    @socketio.on('admin_start_game')
    def admin_start_game():
        sid = request.sid
        if not game_manager.is_admin(sid):
            emit('error', {'message': 'Solo el administrador puede iniciar el examen'})
            return

        room = game_manager.get_room_by_sid(sid)
        if not room:
            emit('error', {'message': 'No estás en una sala'})
            return

        try:
            question_ids = room.start_game()
        except ValueError as e:
            emit('error', {'message': str(e)})
            return

        first_id = question_ids[0]
        puzzle = get_slot_puzzle(first_id)
        emit('game_started', {
            'total_questions': len(question_ids),
            'question_index': 0,
            'puzzle_id': first_id,
            'puzzle': _public_puzzle(puzzle),
            'time_limit': QUESTION_TIME_SEC,
            'started_at': room.question_started_at,
        }, room=room.code)

    @socketio.on('submit_answer')
    def submit_answer(data):
        sid = request.sid
        data = data or {}
        room = game_manager.get_room_by_sid(sid)
        if not room or room.state != 'playing':
            emit('error', {'message': 'No hay partida activa'})
            return

        puzzle_id = room.current_puzzle_id()
        puzzle = get_slot_puzzle(puzzle_id) if puzzle_id else None
        if not puzzle:
            emit('error', {'message': 'Puzzle no encontrado'})
            return

        slot_fills = data.get('slot_fills', {})
        validation = validate_slot_answer(puzzle, slot_fills)
        elapsed_ms = int(data.get('elapsed_ms', 0))

        result = room.record_answer(sid, validation['valid'], elapsed_ms)
        if result.get('already_answered'):
            return

        player = room.players[sid]
        emit('answer_recorded', {
            'correct': validation['valid'],
            'message': validation['message'],
            'points_earned': result.get('points_earned', 0),
            'total_score': player.score,
            'leaderboard': room.get_leaderboard(),
        })

        emit('player_answered', {
            'name': player.name,
            'correct': validation['valid'],
            'leaderboard': room.get_leaderboard(),
        }, room=room.code, include_self=False)

        # Auto-advance when all answered or admin can force next
        if room.all_answered():
            _advance_after_delay(socketio, room.code, delay=2.0)

    @socketio.on('admin_next_question')
    def admin_next_question():
        sid = request.sid
        if not game_manager.is_admin(sid):
            emit('error', {'message': 'Solo el administrador puede avanzar'})
            return
        room = game_manager.get_room_by_sid(sid)
        if room:
            _do_advance(socketio, room)

    @socketio.on('get_lobby')
    def get_lobby():
        sid = request.sid
        room = game_manager.get_room_by_sid(sid)
        if room:
            emit('lobby_update', room.to_lobby_dict())


def _public_puzzle(puzzle: dict | None) -> dict | None:
    """Strip sensitive data if needed — layout is required client-side."""
    if not puzzle:
        return None
    return {
        'id': puzzle['id'],
        'name': puzzle['name'],
        'prompt': puzzle['prompt'],
        'expression': puzzle.get('expression', ''),
        'palette': puzzle.get('palette', []),
        'layout': puzzle.get('layout', {}),
        'expected_truth_table': puzzle.get('expected_truth_table', []),
    }


def _advance_after_delay(socketio: SocketIO, room_code: str, delay: float = 2.0) -> None:
    def _run():
        time.sleep(delay)
        room = game_manager.get_room(room_code)
        if room and room.all_answered():
            _do_advance(socketio, room)

    threading.Thread(target=_run, daemon=True).start()


def _do_advance(socketio: SocketIO, room) -> None:
    advance = room.advance_question()
    if advance.get('finished'):
        socketio.emit('game_finished', {
            'leaderboard': advance['leaderboard'],
            'total_questions': len(room.question_ids),
        }, room=room.code)
        return

    puzzle = get_slot_puzzle(advance['puzzle_id'])
    socketio.emit('next_question', {
        'question_index': advance['question_index'],
        'puzzle_id': advance['puzzle_id'],
        'puzzle': _public_puzzle(puzzle),
        'time_limit': QUESTION_TIME_SEC,
        'started_at': room.question_started_at,
        'leaderboard': room.get_leaderboard(),
    }, room=room.code)
