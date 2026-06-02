# 🔬 LogicPuzzle Lab

## Simulador y Rompecabezas de Lógica Combinacional

**Aplicación web interactiva y educativa** para la enseñanza de Lógica Combinacional y Álgebra de Boole, desarrollada como recurso didáctico para la **Universidad Técnica de Ambato**.

---

## 🎯 Objetivo Educativo

LogicPuzzle Lab permite a los estudiantes:

- **Aprender** los fundamentos de las compuertas lógicas y el Álgebra de Boole.
- **Practicar** construyendo circuitos combinacionales de forma interactiva.
- **Resolver** rompecabezas de complejidad progresiva.
- **Visualizar** el flujo de señales digitales en tiempo real.
- **Evaluar** sus conocimientos en modo examen.

Basado en: *Fundamentos de Sistemas Digitales* – Thomas L. Floyd, 9na edición.

---

## ✨ Características

| Característica | Descripción |
|---|---|
| 🧩 **Simulador Visual** | Arrastrar y conectar compuertas lógicas en un workspace SVG interactivo |
| 📊 **Tablas de Verdad** | Generación automática desde expresiones booleanas o circuitos |
| 🎮 **Modo Puzzle** | 20+ ejercicios con dificultad progresiva, cronómetro y estrellas |
| 📚 **Modo Aprendizaje** | Contenido teórico paso a paso sobre cada compuerta |
| 📝 **Modo Examen** | Evaluación cronometrada sin pistas con calificación |
| 🔧 **Modo Libre** | Sandbox para construir cualquier circuito |
| 🔢 **Calculadora Booleana** | Parser de expresiones con tabla de verdad instantánea |
| 📱 **Responsive** | Funciona en PC, tablets y celulares |
| 🌐 **Acceso en Red** | Accesible desde cualquier dispositivo en la misma red WiFi |
| 🔊 **Efectos de Sonido** | Audio procedural con Web Audio API (sin archivos) |
| 💾 **Progreso Local** | Historial y puntuaciones guardados en localStorage |

### Compuertas Soportadas

AND · OR · NOT · NAND · NOR · XOR · XNOR

### Circuitos Incluidos

Semi-sumador · Sumador completo · Multiplexor 2:1 · Comparador de igualdad · Teoremas de De Morgan

---

## 📂 Estructura del Proyecto

```
Programa/
├── backend/
│   ├── __init__.py          # Paquete Python
│   ├── app.py               # Aplicación Flask (API + rutas)
│   └── logic_engine.py      # Motor de lógica booleana
├── static/
│   ├── css/
│   │   └── style.css        # Tema futurista con efectos neón
│   └── js/
│       ├── app.js            # Orquestador principal
│       ├── gates.js          # Definiciones SVG de compuertas
│       ├── circuit.js        # Renderizador de circuitos SVG
│       ├── dragdrop.js       # Sistema drag & drop (mouse + touch)
│       ├── simulator.js      # Propagación de señales
│       ├── truthtable.js     # Generador de tablas de verdad
│       ├── puzzles.js        # Gestión de puzzles
│       ├── learning.js       # Modo aprendizaje
│       ├── exam.js           # Modo examen
│       ├── sounds.js         # Efectos de sonido (Web Audio)
│       └── ui.js             # Controlador de UI
├── templates/
│   └── index.html            # SPA principal
├── puzzles/
│   └── exercises.json        # Base de datos de ejercicios
├── requirements.txt          # Dependencias Python
├── .env.example              # Variables de entorno de ejemplo
├── README.md                 # Este archivo
└── run.py                    # Punto de entrada
```

---

## 🚀 Instalación y Ejecución

### Requisitos Previos

- **Python 3.10+** instalado
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

### Paso 1: Crear Entorno Virtual

```bash
# Windows
cd Programa
python -m venv venv
venv\Scripts\activate

# Linux/Mac
cd Programa
python3 -m venv venv
source venv/bin/activate
```

### Paso 2: Instalar Dependencias

```bash
pip install -r requirements.txt
```

### Paso 3: Ejecutar

```bash
python run.py
```

### Paso 4: Acceder

El servidor mostrará las URLs de acceso:

```
╔══════════════════════════════════════════════════════════════╗
║   🌐 Acceso Local:    http://localhost:5000                 ║
║   📱 Acceso en Red:   http://192.168.X.X:5000              ║
╚══════════════════════════════════════════════════════════════╝
```

- **Desde la misma máquina:** http://localhost:5000
- **Desde otros dispositivos (celulares, tablets, laptops):** http://\<IP_LOCAL\>:5000

> **Nota:** Todos los dispositivos deben estar en la misma red WiFi/LAN.

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────┐     HTTP/JSON      ┌──────────────────┐
│              │ ◄─────────────────► │                  │
│  Frontend    │                     │   Backend        │
│  (Browser)   │                     │   (Flask)        │
│              │                     │                  │
│  HTML + CSS  │     GET /           │  app.py          │
│  JavaScript  │ ◄───────────────── │  (rutas + API)   │
│  SVG         │                     │                  │
│              │  POST /api/...      │  logic_engine.py │
│  Módulos ES  │ ──────────────────► │  (parser +       │
│              │                     │   evaluador)     │
└──────────────┘                     └──────────────────┘
```

### Decisiones Técnicas

| Decisión | Justificación |
|---|---|
| **Flask** | Sencillez para servir templates + API REST simple |
| **SVG nativo** | Interactividad por elemento, sin librerías de terceros |
| **JavaScript vanilla** | Zero build tools, funciona con solo Python |
| **ES Modules** | Código modular y limpio sin bundler |
| **Web Audio API** | Sonidos procedurales sin archivos externos |
| **localStorage** | Persistencia de progreso sin base de datos |

---

## 📖 Explicación Pedagógica

### ¿Cómo funciona el modo Puzzle?

1. El estudiante selecciona un ejercicio del catálogo.
2. Se muestra la expresión booleana objetivo y la tabla de verdad esperada.
3. El estudiante arrastra compuertas desde el panel lateral al workspace.
4. Conecta las compuertas haciendo clic en los pines (output → input).
5. Las señales se propagan automáticamente mostrando valores HIGH/LOW.
6. Al presionar "Verificar", el sistema compara la tabla de verdad del circuito construido con la esperada.
7. Se otorgan estrellas según tiempo, intentos y pistas usadas.

### ¿Cómo se evalúa un circuito?

El motor de lógica (`logic_engine.py`) implementa:

1. **Tokenización** de expresiones booleanas.
2. **Parser de descenso recursivo** con precedencia de operadores.
3. **Evaluación de AST** con valores binarios.
4. **Generación de tablas de verdad** por fuerza bruta (todas las combinaciones).
5. **Comparación de equivalencia** entre tabla esperada y tabla del circuito.

---

## 🛠️ Tecnologías

- **Backend:** Python 3.10+, Flask 3.1
- **Frontend:** HTML5, CSS3, JavaScript (ES Modules)
- **Gráficos:** SVG nativo
- **Audio:** Web Audio API
- **Almacenamiento:** localStorage (browser)
- **Tipografía:** Inter, JetBrains Mono (Google Fonts)

---

## 🔮 Futuras Mejoras

- [ ] Exportar circuitos como imagen PNG
- [ ] Modo multijugador competitivo
- [ ] Editor de puzzles personalizado
- [ ] Soporte para circuitos secuenciales (flip-flops)
- [ ] Simulación de propagación con delay
- [ ] Sistema de logros (achievements)
- [ ] Backend con base de datos para ranking global
- [ ] Soporte para circuitos MSI (codificadores, decodificadores)
- [ ] Modo oscuro/claro switchable
- [ ] PWA (Progressive Web App) para uso offline

---

## 📜 Licencia

Proyecto educativo desarrollado para la Universidad Técnica de Ambato.
Uso libre para fines académicos y de enseñanza.
