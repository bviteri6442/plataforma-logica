"""
LogicPuzzle Lab - Multiplayer Game Room Manager
Kahoot-style exam rooms with admin control.
"""
from __future__ import annotations

import random
import string
import time
from dataclasses import dataclass, field, asdict
from typing import Any

from backend.config import GAME_QUESTIONS, ROOM_CODE_LENGTH
from backend.slot_puzzles import get_random_slot_puzzles


@dataclass
class Player:
    sid: str
    name: str
    score: int = 0
    correct_count: int = 0
    status: str = 'waiting'  # waiting | playing | answered | finished
    last_answer_correct: bool | None = None
    last_answer_ms: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            'sid': self.sid,
            'name': self.name,
            'score': self.score,
            'correct_count': self.correct_count,
            'status': self.status,
            'last_answer_correct': self.last_answer_correct,
        }


@dataclass
class GameRoom:
    code: str
    admin_sid: str | None = None
    state: str = 'lobby'  # lobby | playing | between | finished
    players: dict[str, Player] = field(default_factory=dict)
    question_ids: list[str] = field(default_factory=list)
    current_index: int = 0
    question_started_at: float = 0.0
    created_at: float = field(default_factory=time.time)

    def to_lobby_dict(self) -> dict[str, Any]:
        return {
            'code': self.code,
            'state': self.state,
            'player_count': len(self.players),
            'players': self.get_leaderboard(),
            'current_question': self.current_index + 1 if self.state == 'playing' else 0,
            'total_questions': len(self.question_ids) or GAME_QUESTIONS,
        }

    def get_leaderboard(self) -> list[dict[str, Any]]:
        board = sorted(
            [p.to_dict() for p in self.players.values()],
            key=lambda x: (-x['score'], -x.get('correct_count', 0), x['name'].lower())
        )
        for i, entry in enumerate(board):
            entry['rank'] = i + 1
        return board

    def add_player(self, sid: str, name: str) -> Player:
        clean = name.strip()[:24]
        if not clean:
            raise ValueError('Nombre inválido')
        if any(p.name.lower() == clean.lower() for p in self.players.values() if p.sid != sid):
            raise ValueError('Ese nombre ya está en uso')
        player = Player(sid=sid, name=clean)
        self.players[sid] = player
        return player

    def remove_player(self, sid: str) -> None:
        self.players.pop(sid, None)
        if self.admin_sid == sid:
            self.admin_sid = None

    def start_game(self) -> list[str]:
        if len(self.players) < 1:
            raise ValueError('Se necesita al menos un jugador')
        self.question_ids = get_random_slot_puzzles(GAME_QUESTIONS)
        self.current_index = 0
        self.state = 'playing'
        self.question_started_at = time.time()
        for p in self.players.values():
            p.status = 'playing'
            p.last_answer_correct = None
        return self.question_ids

    def current_puzzle_id(self) -> str | None:
        if self.current_index >= len(self.question_ids):
            return None
        return self.question_ids[self.current_index]

    def record_answer(self, sid: str, correct: bool, elapsed_ms: int) -> dict[str, Any]:
        player = self.players.get(sid)
        if not player:
            raise ValueError('Jugador no encontrado')
        if player.status == 'answered':
            return {'already_answered': True}

        player.status = 'answered'
        player.last_answer_correct = correct
        player.last_answer_ms = elapsed_ms

        if correct:
            # Kahoot-style: base points + speed bonus
            time_bonus = max(0, 500 - elapsed_ms // 100)
            points = 800 + time_bonus
            player.score += points
            player.correct_count += 1
        else:
            points = 0

        return {
            'correct': correct,
            'points_earned': points if correct else 0,
            'total_score': player.score,
        }

    def all_answered(self) -> bool:
        active = [p for p in self.players.values() if p.status != 'finished']
        return len(active) > 0 and all(p.status == 'answered' for p in active)

    def advance_question(self) -> dict[str, Any]:
        self.current_index += 1
        if self.current_index >= len(self.question_ids):
            self.state = 'finished'
            return {'finished': True, 'leaderboard': self.get_leaderboard()}

        self.state = 'playing'
        self.question_started_at = time.time()
        for p in self.players.values():
            if p.status != 'finished':
                p.status = 'playing'
                p.last_answer_correct = None
        return {
            'finished': False,
            'question_index': self.current_index,
            'puzzle_id': self.question_ids[self.current_index],
        }


class GameManager:
    """In-memory room registry (use Redis adapter for multi-worker)."""

    def __init__(self) -> None:
        self.rooms: dict[str, GameRoom] = {}
        self.sid_to_room: dict[str, str] = {}

    def _generate_code(self) -> str:
        chars = string.ascii_uppercase + string.digits
        for _ in range(100):
            code = ''.join(random.choices(chars, k=ROOM_CODE_LENGTH))
            if code not in self.rooms:
                return code
        raise RuntimeError('No se pudo generar código de sala')

    def create_room(self, admin_sid: str) -> GameRoom:
        code = self._generate_code()
        room = GameRoom(code=code, admin_sid=admin_sid)
        self.rooms[code] = room
        self.sid_to_room[admin_sid] = code
        return room

    def get_room(self, code: str) -> GameRoom | None:
        return self.rooms.get(code.upper())

    def get_room_by_sid(self, sid: str) -> GameRoom | None:
        code = self.sid_to_room.get(sid)
        if not code:
            return None
        return self.rooms.get(code)

    def join_room(self, code: str, sid: str, name: str) -> GameRoom:
        room = self.get_room(code)
        if not room:
            raise ValueError('Sala no encontrada')
        if room.state not in ('lobby',):
            raise ValueError('La partida ya comenzó')
        self.sid_to_room[sid] = room.code
        room.add_player(sid, name)
        return room

    def leave(self, sid: str) -> GameRoom | None:
        code = self.sid_to_room.pop(sid, None)
        if not code:
            return None
        room = self.rooms.get(code)
        if room:
            room.remove_player(sid)
            if not room.players:
                del self.rooms[code]
        return room

    def is_admin(self, sid: str) -> bool:
        room = self.get_room_by_sid(sid)
        return room is not None and room.admin_sid == sid


# Singleton
game_manager = GameManager()
