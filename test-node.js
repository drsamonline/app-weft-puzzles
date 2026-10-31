/* test-node.js — the proof for Weft Puzzles.
 *
 * Three things are asserted:
 *   1. the machine is the Loom's machine (the engine is untouched and still works)
 *   2. the world obeys its own rules (walls, bumps, flags, the goal)
 *   3. EVERY level is solvable — its reference solution is run on the real VM
 *
 * Run: node test-node.js
 *
 * SPDX-FileCopyrightText: 2026 Dr Sohil Momin
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 */
"use strict";

const W = require("./docs/play/weft8.js");
const World = require("./docs/play/world.js");

let pass = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { pass++; return; }
  failures.push(name);
  console.log("  FAIL  " + name);
}
function eq(got, want, name) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  ok(g === w, name + "  (got " + g + ", want " + w + ")");
}

/* ------------------------------------------------------- the machine is intact */
console.log("the machine — the Loom's Weft-8, unchanged");

{
  const a = W.assemble("LDI 0x2A\nMOV R3, R0\nHLT");
  eq(a.all, [0x00, 0x2A, 0x01, 0x30, 0x1A, 0x00], "the encoding is still two bytes, opcode first");
  eq(Object.keys(W.OPCODES).length, 27, "the instruction set is still 27 opcodes");
}
{
  const r = World.run(World.levelById("first-thread"), "LDI 1\nOUT MOVE\nHLT");
  eq(r.errors, [], "a program assembles against the puzzle ports");
}

/* ------------------------------------------------------------- the world rules */
console.log("the world — walls, bumps, flags, the goal");

{
  const level = World.levelById("step-around");
  const w = new World.World(level);
  eq([w.x, w.y], [0, 0], "the robot starts where the level says");
  eq(w.under(), World.FLOOR, "the start square is floor");
  eq(w.move(2), false, "south into the wall at (0,1) is refused");
  eq(w.bumped, 1, "and the bump flag is set");
  eq([w.x, w.y], [0, 0], "so the robot has not moved");
  ok(w.move(1), "east is free");
  eq(w.bumped, 0, "a successful move clears the bump flag");
}
{
  const level = World.levelById("the-whole-weave");
  const w = new World.World(level);
  eq(w.flags.length, 2, "the level starts with two flags");
  w.move(1);                                   // onto the first flag
  eq(w.flags.length, 1, "stepping on a flag takes it");
  eq(w.collected, 1, "and counts it");
  eq(w.under(), World.FLOOR, "the square underneath is floor again");
}
{
  const synth = { w: 3, h: 1, start: [2, 0], goal: [2, 0], walls: [], flags: [[0, 0]], id: "synth", name: "synth" };
  const w = new World.World(synth);
  eq(w.onGoal(), true, "the robot can be on the goal");
  eq(w.solved(), false, "but a level with a flag still out is not solved");
  ok(/flag/.test(w.explain()), "and the checker says a flag is left: " + w.explain());
}
{
  const level = World.levelById("first-thread");
  const r = World.run(level, "loop: JMP loop", 200);
  eq(r.solved, false, "a program that never finishes does not solve the level");
  ok(/step limit/.test(r.reason), "and the reason is the step limit: " + r.reason);
  eq(r.steps, 200, "after exactly the steps it was allowed");
}
{
  const level = World.levelById("first-thread");
  const r = World.run(level, "FROB");
  eq(r.solved, false, "a program that does not assemble does not run");
  ok(/unknown instruction/.test(r.errors[0].message), "and says why");
}

/* --------------------------------------------------------- every level is solvable */
console.log("the levels — each reference solution is run on the real machine");

World.LEVELS.forEach(function (level) {
  const r = World.run(level, level.solution);
  eq(r.errors, [], level.id + ": its solution assembles");
  eq(r.solved, true, level.id + ": its solution solves the level (" + r.reason + ")");
  ok(r.steps < 400, level.id + ": it solves in under 400 steps (" + r.steps + ")");
  ok(r.bytes.length <= 128, level.id + ": its solution fits the 128-byte ROM (" + r.bytes.length + ")");
  ok(level.walls.every(function (p) {
    return p[0] >= 0 && p[1] >= 0 && p[0] < level.w && p[1] < level.h;
  }), level.id + ": every wall is inside the grid");
  ok(level.start[0] < level.w && level.start[1] < level.h, level.id + ": the start is inside the grid");
  ok(level.goal[0] < level.w && level.goal[1] < level.h, level.id + ": the goal is inside the grid");
  ok(!(level.goal[0] === level.start[0] && level.goal[1] === level.start[1]), level.id + ": the goal is not the start");
});

/* --------------------------------------------------------------- the puzzle bites */
console.log("the puzzle bites — a wrong answer is not accepted");

{
  /* the right length, the wrong direction */
  const r = World.run(World.levelById("first-thread"), "LDI 3\nOUT MOVE\nOUT MOVE\nHLT");
  eq(r.solved, false, "moving west does not solve 'First thread'");
  ok(/not on the goal/.test(r.reason), "and the checker says so: " + r.reason);
}
{
  /* arriving without doing the job */
  const r = World.run(World.levelById("the-whole-weave"), "LDI 1\nOUT MOVE\nOUT MOVE\nHLT");
  eq(r.solved, false, "stopping part-way does not solve 'The whole weave'");
}
{
  /* the detour level really needs the detour */
  const r = World.run(World.levelById("step-around"), "LDI 2\nOUT MOVE\nHLT");
  eq(r.solved, false, "walking straight into the wall does not solve 'Step around'");
  eq(r.world.bumped, 1, "the machine felt the wall");
}
{
  /* the sensor loop must actually read the sensor */
  const blind = "LDI 1\nOUT MOVE\nOUT MOVE\nOUT MOVE\nOUT MOVE\nHLT";
  const r = World.run(World.levelById("until-you-stand-on-it"), blind);
  eq(r.solved, false, "guessing the length of the corridor does not solve it — it stops one short");
  eq([r.world.x, r.world.y], [4, 0], "the robot is where five blind moves put it");
}

/* ------------------------------------------------------------------- summary */

/* the family — every page links back to the Loom, and the Loom to every page */
{
  const fsm = require("fs");
  const landing = fsm.readFileSync("./docs/index.html", "utf8");
  ok(landing.indexOf('id="family"') > 0, "the landing page carries the family strip");
  ok(landing.indexOf("you are here") > 0, "and marks this page as the one you are on");
  ['app-jacquard', 'app-clip-loom', 'weft8-hardware', 'weft8-kit', 'weft8-classroom', 'weft8-compare'].forEach(function (slug) {
    ok(landing.indexOf("https://drsamonline.github.io/" + slug + "/") > 0, "it links to " + slug);
  });
  const readme = fsm.readFileSync("./README.md", "utf8");
  ok(readme.indexOf("The Weft-8 family") > 0, "the README carries the family table too");
  ok(readme.indexOf("you are here") > 0, "and marks this repository in it");
}

console.log("");
console.log(pass + " passed, " + failures.length + " failed");
if (failures.length) {
  console.log("failed:");
  failures.forEach(f => console.log("  - " + f));
  process.exit(1);
}
