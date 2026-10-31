/* tests/page-smoke.js — the page, driven.
 *
 * test-node.js proves the machine and the levels. This proves the PAGE: it boots
 * the real docs/play/index.html in jsdom with the three scripts inlined, picks a
 * puzzle, runs a program that should fail, peeks at the working solution, runs it
 * again and checks the page says "Solved". jsdom is a test-only dependency.
 *
 * SPDX-FileCopyrightText: 2026 Dr Sohil Momin
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 */
"use strict";

const fs = require("fs");
const path = require("path");

let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) { console.log("jsdom is not installed — run `npm install` (test-only dependency)"); process.exit(2); }

const dir = path.join(__dirname, "..", "docs", "play");
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
for (const kit of ["web-kit.js", "weft8.js", "world.js"]) {
  html = html.replace('<script src="' + kit + '"></script>',
    "<script>" + fs.readFileSync(path.join(dir, kit), "utf8") + "</script>");
}

const errors = [];
const dom = new JSDOM(html, {
  runScripts: "dangerously", pretendToBeVisual: true,
  beforeParse(w) { w.addEventListener("error", (e) => errors.push(e.message)); }
});
const w = dom.window, d = w.document;
let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) { pass++; console.log("PASS  " + n); } else { fail++; console.log("FAIL  " + n + (extra ? "  [" + extra + "]" : "")); } };
const click = (id) => d.getElementById(id).dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
const text = (id) => d.getElementById(id).textContent;

ok("the page boots without an error", errors.length === 0, errors.join("; "));
ok("all five puzzles are listed", d.querySelectorAll("#levels button").length === 5);
ok("the board is drawn for puzzle 1 (3 cells)", d.querySelectorAll("#board .cell").length === 3);
ok("the robot is on the board", d.querySelectorAll("#board .cell.robot").length === 1);

/* the starter program moves once; the goal is two squares away */
click("run");
ok("a program that stops short is not accepted", /Not solved/.test(text("status")), text("status"));
ok("and the page shows how far it got", /steps/.test(text("meta")), text("meta"));

/* the reference solution must solve it, through the UI */
click("peek");
click("run");
ok("the reference solution solves puzzle 1 in the page", /Solved/.test(text("status")), text("status"));
ok("the puzzle is ticked once solved", d.querySelectorAll("#levels .tick").length === 1);

/* a second puzzle loads with its own board */
d.querySelectorAll("#levels button")[1].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
ok("picking puzzle 2 redraws the board (3x3 = 9 cells)", d.querySelectorAll("#board .cell").length === 9);
ok("puzzle 2 has a wall", d.querySelectorAll("#board .cell.wall").length === 1);

/* a bad program is refused, not run */
d.getElementById("src").value = "FROB R1";
click("run");
ok("a program that does not assemble is refused with its line", /line 1: unknown instruction/.test(text("status")), text("status"));

/* reset puts the robot back */
click("reset");
ok("reset returns the robot to the start", /Reset/.test(text("status")), text("status"));

console.log("");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
