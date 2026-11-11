# Weft Puzzles — how to play

**Version 1.0.0 · PolyForm Noncommercial 1.0.0**

Six small programming puzzles, solved on a real 8-bit machine with **sixteen registers, four flags
and twenty-seven instructions — and no `if` statement.**

So you build one, out of `CMP` and `JZ`. That is the whole point: the constraint is the lesson.

Play it: <https://drsamonline.github.io/app-weft-puzzles/>

## The six puzzles

| # | Puzzle | What it teaches |
|---|---|---|
| 01 | **First thread** | `LDI` puts a number in the accumulator; `OUT MOVE` hands it to the machine |
| 02 | **Step around** | four moves, three directions — a straight line is not always the answer |
| 03 | **Until you stand on it** | `LOAD` reads a port; `CMP` + `JZ` are how a machine decides |
| 04 | **Feel for the wall** | `BUMPED` is the machine's own feedback — a loop that reacts |
| 05 | **The whole weave** | a level can ask for more than arrival: collect both flags first |
| 06 | **The long way round** | three bump loops in a row — a program is a shape you repeat |

## Every puzzle is known solvable

Each one ships a **working solution**, and the test suite runs every solution on the real machine. A
puzzle nobody has solved is a puzzle nobody knows is solvable, so that is asserted rather than
assumed.

If you are stuck, the shipped solution is there to read — reading it is not cheating, it is the
second half of the lesson.

## The machine

The Weft-8 comes from [Jacquard](https://github.com/drsamonline/app-jacquard): 27 opcodes, 16
registers, Z/C/N/V flags, a 256-byte memory map, and peripherals as host callbacks. The same engine
runs [Clip Loom](https://github.com/drsamonline/app-clip-loom) and the Jacquard page itself, which is
why a program you write here reads the same everywhere.

## Licence

PolyForm Noncommercial 1.0.0. See [LICENSE](../LICENSE).
