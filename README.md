# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico, ampliada con mecánicas modernas:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) más **piezas especiales** (pentominós `+`, `U`, `Y` y una 3×3 hueca) que aparecen con baja probabilidad.
- **Rotación** con _wall kicks_ básicos; se invierte (CCW) en niveles altos en el reto "Rotación inversa".
- **Soft drop**, **hard drop** y **pieza fantasma** (_ghost piece_).
- **Cola de siguientes piezas** (5 de profundidad) y **Hold** (`C` / `Shift`) para reservar una pieza, con límite de una vez por turno.
- **Combo y multiplicadores**: cadenas de líneas consecutivas, bonus de **T-spin**, **Back-to-Back Tetris** y **Perfect Clear**, con efectos visuales (texto flotante, partículas, destello).
- **Sistema de power-ups**: piezas especiales que se recogen (bomba, rayo, tinte, gravedad, congelar) y se activan con `1`/`2`/`3`.
- **Habilidades cargables**: una barra de energía que se llena al limpiar líneas; al completarse (`E`) se elige una de 5 habilidades (ver 5 piezas, intercambiar pieza, cámara lenta, deshacer, limpiar fila inferior).
- **Modo desafío**: 5 retos con objetivos propios (sprint de líneas, basura ascendente, tablero pre-poblado, piezas invisibles, rotación inversa) con progreso guardado en `localStorage`.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Tema claro/oscuro**, **pausa** y **Game Over** con opción de reinicio.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla           | Acción                                |
| --------------- | -------------------------------------- |
| `←` / `→`       | Mover la pieza horizontalmente        |
| `↑` o `X`       | Rotar la pieza en sentido horario     |
| `↓`             | Soft drop (bajar más rápido)          |
| `Espacio`       | Hard drop (caída instantánea)         |
| `C` / `Shift`   | Hold: reservar / intercambiar pieza   |
| `E`             | Usar habilidad (con la barra al 100%) |
| `1` `2` `3`     | Usar power-up del inventario          |
| `P`             | Pausar / reanudar                     |

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, `COMBO`, `OBJETIVO` (modo desafío), `HOLD`, `NEXT`, `POWER-UPS`, barra de `ENERGÍA` y la lista de controles.
- Overlays para **PAUSA**, **GAME OVER**, el **menú inicial** (Clásico / Desafío) y el **menú de habilidades**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice que identifica el tipo de pieza (estándar, especial, power-up o comodín).
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW` / `rotateCCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro. En el reto "Rotación inversa" rota en sentido antihorario a partir de cierto nivel.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval` (ajustado por cámara lenta, congelar o basura del modo desafío).
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa (o con celda comodín) se elimina y se inserta una vacía en la cima. Devuelve cuántas líneas y cuáles se limpiaron.
- **Puntuación y combo** (`applyLineScore`): centraliza la tabla clásica `[0, 100, 300, 500, 800]`, el multiplicador de combo (cadenas consecutivas), el bonus de T-spin (`detectTSpin`, regla de las 3 esquinas), el ×1.5 de Back-to-Back Tetris y el bonus de Perfect Clear; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Hold** (`tryHold`): guarda el tipo de pieza actual y lo intercambia por el de la pieza reservada; se bloquea hasta que la pieza en juego se asiente.
- **Habilidades** (`activateAbility`): la energía se gana al limpiar líneas y, al llenarse, abre un menú con 5 habilidades que pausan brevemente el bucle.
- **Modo desafío** (`CHALLENGES`, `checkModeProgress`): cada reto es un objeto de configuración (líneas objetivo, límite de tiempo, basura periódica, tablero pre-poblado, piezas ocultas o rotación inversa); el progreso completado se guarda en `localStorage`.
- **Efectos visuales**: un array de partículas/textos flotantes/destellos (`effects`) que se actualiza y dibuja cada frame; no hay audio en el proyecto.

### Flujo del juego

```
showMenu()                          → overlay Clásico / Desafío
  └─ init(modeId)
       ├─ createBoard() (+ prefillBoard si el reto lo pide)
       ├─ nextQueue = [] ; refillQueue()   → cola de 5 piezas
       ├─ spawn()                          → primera pieza
       └─ requestAnimationFrame(loop)
              ↓
         loop(timestamp)
           ├─ acumula dt; actualiza timers (congelar, lento, reto, basura)
           ├─ si dt ≥ dropInterval efectivo → baja la pieza o llama a lockPiece()
           ├─ updateEffects(dt) + draw()  (grid + tablero + ghost + pieza + efectos)
           └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / hold / habilidad / power-up / pausa
```

`lockPiece()` detecta T-spin, fusiona la pieza, limpia líneas, aplica `applyLineScore` (combo/B2B/perfect clear) y comprueba el objetivo del reto (`checkModeProgress`). Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), o se cumple/incumple la condición de un reto, se dispara `endGame(won)` y se muestra el overlay correspondiente.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (tema claro/oscuro)
├── game.js         # Toda la lógica del Tetris
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 7 colores             |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
