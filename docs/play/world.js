/* world.js — the puzzle world for Weft Puzzles.
 *
 * The machine is the Weft-8 from Jacquard (the Loom) — docs/play/weft8.js, byte
 * for byte the same engine. This file adds a world around it: a robot on a grid,
 * and the peripherals that let a program feel that grid.
 *
 * Ports (added to the kit's own port table at load, so assembly can name them).
 * They sit at 0xD0 and up, clear of the Loom's own 0xC0-0xCA, so a puzzle program
 * and a Jacquard program never mean different things by the same address:
 *   0xD0 POS_X    read   where the robot is
 *   0xD1 POS_Y    read
 *   0xD2 UNDER    read   0 floor · 1 wall · 2 goal · 3 flag
 *   0xD3 MOVE     write  0 up · 1 right · 2 down · 3 left
 *   0xD4 BUMPED   read   1 if the last MOVE was blocked
 *   0xD5 DONE     write  1 says "I have finished"
 *   0xD6 BEEP     write  a number, for your own feedback
 *
 * SPDX-FileCopyrightText: 2026 Dr Sohil Momin
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./weft8.js"));
  else root.World = factory(root.Weft8);
})(typeof self !== "undefined" ? self : this, function (Weft8) {
  "use strict";

  Object.assign(Weft8.PORT, {
    POS_X: 0xD0, POS_Y: 0xD1, UNDER: 0xD2, MOVE: 0xD3,
    BUMPED: 0xD4, DONE: 0xD5, BEEP: 0xD6
  });

  var FLOOR = 0, WALL = 1, GOAL = 2, FLAG = 3;

  /* ---------------------------------------------------------------- the levels
   * Every level carries a reference solution, and the test suite runs it on the
   * real machine. A level nobody has solved is a level nobody knows is solvable.
   */
  var LEVELS = [
    {
      id: "first-thread",
      name: "First thread",
      brief: "Three squares, nothing in the way. Walk east until you stand on the goal.",
      teaches: "LDI puts a number in the accumulator; OUT MOVE hands it to the machine.",
      w: 3, h: 1, start: [0, 0], goal: [2, 0], walls: [], flags: [],
      solution: [
        "; 1 is east. Put it in R0, then move twice.",
        "        LDI 1",
        "        OUT MOVE",
        "        OUT MOVE",
        "        HLT"
      ].join("\n")
    },
    {
      id: "step-around",
      name: "Step around",
      brief: "There is a wall between you and the goal. Go round it.",
      teaches: "Four moves, three directions. Nothing stops you writing them out.",
      w: 3, h: 3, start: [0, 0], goal: [0, 2], walls: [[0, 1]], flags: [],
      solution: [
        "; east, south, south, west",
        "        LDI 1",
        "        OUT MOVE",
        "        LDI 2",
        "        OUT MOVE",
        "        OUT MOVE",
        "        LDI 3",
        "        OUT MOVE",
        "        HLT"
      ].join("\n")
    },
    {
      id: "until-you-stand-on-it",
      name: "Until you stand on it",
      brief: "A long corridor. You do not know how long — feel the floor and stop on the goal.",
      teaches: "LOAD reads a port. CMP and JZ are how a machine makes a decision.",
      w: 6, h: 1, start: [0, 0], goal: [5, 0], walls: [], flags: [],
      solution: [
        "; while UNDER is not the goal, step east",
        "loop:   LOAD UNDER",
        "        MOV R2, R0           ; keep what is underfoot",
        "        LDI 2                ; 2 = the goal",
        "        MOV R1, R0",
        "        CMP R2, R1",
        "        JZ  done",
        "        LDI 1                ; east",
        "        OUT MOVE",
        "        JMP loop",
        "done:   HLT"
      ].join("\n")
    },
    {
      id: "feel-for-the-wall",
      name: "Feel for the wall",
      brief: "Walk east until you bump, then one square south. You cannot see the wall; you can feel it.",
      teaches: "BUMPED is a flag you can read — the machine's own feedback loop.",
      w: 4, h: 3, start: [0, 0], goal: [2, 1], walls: [[3, 0], [3, 1], [3, 2]], flags: [],
      solution: [
        "; east until the machine says it was blocked, then one south.",
        "; LDI 1 is INSIDE the loop: LOAD BUMPED overwrites the accumulator,",
        "; so the direction has to be set again every time round.",
        "east:   LDI 1                ; east",
        "        OUT MOVE",
        "        LOAD BUMPED",
        "        JZ  east             ; 0 = it moved, so keep going",
        "        LDI 2                ; south",
        "        OUT MOVE",
        "        HLT"
      ].join("\n")
    },
    {
      id: "the-whole-weave",
      name: "The whole weave",
      brief: "Two flags on the way to the goal. Collect both, then stop on the goal.",
      teaches: "A level can ask for more than arrival. The checker knows what you picked up.",
      w: 8, h: 1, start: [0, 0], goal: [7, 0], walls: [], flags: [[1, 0], [4, 0]],
      solution: [
        "; the same loop as before - the flags come to you",
        "loop:   LOAD UNDER",
        "        MOV R2, R0",
        "        LDI 2",
        "        MOV R1, R0",
        "        CMP R2, R1",
        "        JZ  done",
        "        LDI 1",
        "        OUT MOVE",
        "        JMP loop",
        "done:   HLT"
      ].join("\n")
    },
    {
      id: "the-long-way-round",
      name: "The long way round",
      brief: "Three walls, one corner. East until you bump, south until you bump, then west until you stop.",
      teaches: "The same three instructions, three times. A program is a shape you repeat, not a list you write once.",
      w: 5, h: 3, start: [0, 0], goal: [0, 2], walls: [[1, 1], [2, 1], [3, 1]], flags: [],
      solution: [
        "; each leg is a bump loop; the machine tells you when to turn",
        "east:   LDI 1                ; east",
        "        OUT MOVE",
        "        LOAD BUMPED",
        "        JZ  east",
        "south:  LDI 2                ; south",
        "        OUT MOVE",
        "        LOAD BUMPED",
        "        JZ  south",
        "west:   LDI 3                ; west",
        "        OUT MOVE",
        "        LOAD BUMPED",
        "        JZ  west",
        "        HLT"
      ].join("\n")
    }
  ];

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }

  /* ------------------------------------------------------------------- world */

  function World(level) {
    this.level = level;
    this.x = level.start[0];
    this.y = level.start[1];
    this.flags = level.flags.map(function (p) { return [p[0], p[1]]; });
    this.walls = {};
    level.walls.forEach(function (p) { this.walls[p[0] + "," + p[1]] = true; }, this);
    this.bumped = 0;
    this.doneRequested = false;
    this.collected = 0;
    this.beeps = [];
    this.moves = 0;
  }

  World.prototype.isWall = function (x, y) {
    return this.walls[x + "," + y] === true;
  };

  World.prototype.under = function () {
    if (this.x === this.level.goal[0] && this.y === this.level.goal[1]) return GOAL;
    for (var i = 0; i < this.flags.length; i++) {
      if (this.flags[i][0] === this.x && this.flags[i][1] === this.y) return FLAG;
    }
    return FLOOR;
  };

  World.prototype.move = function (dir) {
    var dx = [0, 1, 0, -1][dir], dy = [-1, 0, 1, 0][dir];
    var nx = this.x + dx, ny = this.y + dy;
    this.moves++;
    if (nx < 0 || ny < 0 || nx >= this.level.w || ny >= this.level.h || this.isWall(nx, ny)) {
      this.bumped = 1;
      return false;
    }
    this.bumped = 0;
    this.x = nx;
    this.y = ny;
    for (var i = 0; i < this.flags.length; i++) {
      if (this.flags[i][0] === nx && this.flags[i][1] === ny) {
        this.flags.splice(i, 1);
        this.collected++;
        break;
      }
    }
    return true;
  };

  World.prototype.onGoal = function () {
    return this.x === this.level.goal[0] && this.y === this.level.goal[1];
  };

  World.prototype.solved = function () {
    return this.onGoal() && this.flags.length === 0;
  };

  World.prototype.explain = function () {
    if (this.solved()) return "solved";
    if (!this.onGoal() && this.flags.length) return "not on the goal, and " + this.flags.length + " flag(s) left";
    if (!this.onGoal()) return "not on the goal";
    return this.flags.length + " flag(s) left";
  };

  /* The peripherals, as the kit's host callbacks. */
  World.prototype.host = function () {
    var w = this;
    return {
      world: w,
      output: w.beeps,
      "in": function (port, name) {
        if (name === "POS_X") return w.x;
        if (name === "POS_Y") return w.y;
        if (name === "UNDER") return w.under();
        if (name === "BUMPED") return w.bumped;
        return 0;
      },
      out: function (port, value, name) {
        if (name === "MOVE") { w.move(value & 3); return; }
        if (name === "DONE") { w.doneRequested = true; return; }
        if (name === "BEEP") { w.beeps.push(value); return; }
      }
    };
  };

  /* run(level, source, maxSteps) -> everything a UI or a test needs to know */
  function run(level, source, maxSteps) {
    var a = Weft8.assemble(source);
    var world = new World(level);
    if (a.errors.length) {
      return { errors: a.errors, world: world, solved: false, reason: "does not assemble", steps: 0 };
    }
    var host = world.host();
    var vm = new Weft8.VM({ rom: a.bytes, peripherals: host });
    vm.run(maxSteps === undefined ? 4000 : maxSteps);
    var reason;
    if (vm.error) reason = vm.error;
    else if (!world.solved()) reason = world.explain();
    else reason = "solved";
    return {
      errors: [], world: world, vm: vm, steps: vm.steps, halted: vm.halted,
      solved: world.solved() && !vm.error, reason: reason, bytes: a.all
    };
  }

  return {
    LEVELS: LEVELS, levelById: levelById, World: World, run: run,
    FLOOR: FLOOR, WALL: WALL, GOAL: GOAL, FLAG: FLAG
  };
});
