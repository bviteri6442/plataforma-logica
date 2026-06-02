# Despliegue en Railway

## 1. Subir el proyecto

Conecta el repositorio en [Railway](https://railway.app) apuntando a la carpeta `Programa/` (root del servicio).

## 2. Variables de entorno

| Variable | Valor recomendado |
|----------|-------------------|
| `PORT` | *(Railway lo asigna automáticamente)* |
| `SECRET_KEY` | Cadena aleatoria larga |
| `ADMIN_PIN` | PIN que usarás como profesor |
| `FLASK_DEBUG` | `false` |
| `GAME_QUESTIONS` | `15` |
| `QUESTION_TIME_SEC` | `90` |
| `ALLOWED_ORIGINS` | `*` o tu dominio Railway |

Opcional para varios workers:
| `REDIS_URL` | URL de Redis add-on en Railway |

## 3. Flujo Kahoot en clase

1. **Profesor (admin):** Abre la app → **Examen Kahoot** → pestaña **Administrador** → ingresa `ADMIN_PIN` → **Crear sala**.
2. Copia el enlace (`?room=CODIGO`) y compártelo con los estudiantes.
3. **Estudiantes:** Abren el enlace → ingresan su **nombre** → entran al lobby.
4. El profesor ve la tabla de participantes y pulsa **Iniciar examen (15 preguntas)** cuando quiera.
5. Cada pregunta es un circuito con espacios `?` — arrastrar la compuerta correcta.
6. Al completar bien aparece **¡Ganaste!** y se actualiza el ranking en vivo.

## 4. Health check

Railway usa `GET /api/health` (configurado en `railway.toml`).

## 5. Local

```bash
cd Programa
pip install -r requirements.txt
cp .env.example .env
python run.py
```
