"""
LogicPuzzle Lab - Entry Point
==============================
Production-ready server with WebSocket support for Railway.
"""

import os
import socket
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def print_banner(port: int, local_ip: str):
    print()
    print("=" * 62)
    print("  LogicPuzzle Lab")
    print("  Simulador y Rompecabezas de Logica Combinacional")
    print("  Universidad Tecnica de Ambato")
    print("=" * 62)
    print()
    print(f"  Acceso Local:    http://localhost:{port}")
    print(f"  Acceso en Red:   http://{local_ip}:{port}")
    print(f"  Health:          http://localhost:{port}/api/health")
    print()
    print("  Modo Kahoot:     Examen -> Unirse / Administrador")
    print("  Ctrl + C para detener")
    print("=" * 62)
    print()


def main():
    from backend.config import PORT, DEBUG
    from backend.app import app, socketio

    local_ip = get_local_ip()
    print_banner(PORT, local_ip)

    socketio.run(
        app,
        host='0.0.0.0',
        port=PORT,
        debug=DEBUG,
        use_reloader=False,
        allow_unsafe_werkzeug=True,
    )


if __name__ == '__main__':
    main()
