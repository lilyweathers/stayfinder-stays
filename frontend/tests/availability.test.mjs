import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
// Run the actual pure TypeScript date rules, using the existing compiler.
const source = await readFile(new URL("../src/lib/availability.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { isNightUnavailable, isStayAvailable, canSelectDate, calendarDays, shiftMonth } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const ranges = [{ check_in: "2099-01-10", check_out: "2099-01-14" }];
const today = "2099-01-01";

test("occupied nights are disabled and exclusive checkout is available", () => {
  for (const day of ["2099-01-10", "2099-01-11", "2099-01-13"]) {
    assert.equal(isNightUnavailable(day, ranges), true);
    assert.equal(canSelectDate(day, "checkIn", { checkIn: "", checkOut: "" }, ranges, today), false);
  }
  assert.equal(isNightUnavailable("2099-01-14", ranges), false);
  assert.equal(canSelectDate("2098-12-31", "checkIn", { checkIn: "", checkOut: "" }, ranges, today), false);
});

test("checkout permits the next booking boundary but cannot cross blocked nights", () => {
  const dates = { checkIn: "2099-01-08", checkOut: "" };
  assert.equal(canSelectDate("2099-01-10", "checkOut", dates, ranges, today), true);
  for (const day of ["2099-01-08", "2099-01-11", "2099-01-14", "2099-01-20"]) {
    assert.equal(canSelectDate(day, "checkOut", dates, ranges, today), false);
  }
  assert.equal(canSelectDate("2099-01-15", "checkOut", { checkIn: "2099-01-14", checkOut: "" }, ranges, today), true);
  assert.equal(canSelectDate("2099-01-15", "checkOut", { checkIn: "", checkOut: "" }, ranges, today), false);
});

test("cross-month ranges and an availability refresh invalidate conflicting selections", () => {
  assert.equal(isStayAvailable("invalid", "later", []), false);
  assert.equal(isStayAvailable("2099-02-30", "2099-03-02", []), false);
  const crossMonth = [{ check_in: "2099-01-30", check_out: "2099-02-03" }];
  assert.equal(isStayAvailable("2099-01-29", "2099-02-04", crossMonth), false);
  assert.equal(isStayAvailable("2099-02-03", "2099-02-05", crossMonth), true);
  assert.equal(isStayAvailable("2099-01-10", "2099-01-14", []), true);
  assert.equal(isStayAvailable("2099-01-10", "2099-01-14", ranges), false);
});

test("calendar handles leap years, Monday offsets and year rollover", () => {
  assert.equal(calendarDays("2028-02").filter(Boolean).length, 29);
  assert.equal(calendarDays("2027-02").filter(Boolean).length, 28);
  assert.equal(calendarDays("2026-06")[0], "2026-06-01");
  assert.equal(calendarDays("2026-02")[6], "2026-02-01");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
});
