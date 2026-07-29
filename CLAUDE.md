# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla Tetris. No build, no deps, no package.json, no framework. Three files: `index.html`, `style.css`, `game.js`. Open `index.html` directly or serve statically (`python3 -m http.server`, `npx serve .`).

## Gotcha

`COLS`, `ROWS`, `BLOCK` constants in `game.js` must stay in sync with `<canvas id="board">` width/height in `index.html` (`width = COLS × BLOCK`, `height = ROWS × BLOCK`). Changing one without other breaks rendering.

## Docs/comments language

README and in-code comments are Spanish. Match that when editing docs; code identifiers stay English.
