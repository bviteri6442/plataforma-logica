"""
LogicPuzzle Lab - Application Configuration
"""
import os
import secrets

# Railway / production
PORT = int(os.environ.get('PORT', os.environ.get('FLASK_PORT', 5000)))
DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Multiplayer / admin
ADMIN_PIN = os.environ.get('ADMIN_PIN', 'admin123')
GAME_QUESTIONS = int(os.environ.get('GAME_QUESTIONS', '15'))
QUESTION_TIME_SEC = int(os.environ.get('QUESTION_TIME_SEC', '90'))
ROOM_CODE_LENGTH = 6

# Redis (optional — enables multi-worker on Railway)
REDIS_URL = os.environ.get('REDIS_URL', '')

# CORS / SocketIO
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')
