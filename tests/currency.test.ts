import assert from "node:assert/strict";
import { test } from "node:test";
import { money, parseAmount } from "../core/values.js";

test("D9 three minor units parse and format 1.250 and reject 1.2501", () => {
  const currency = { code: "KWD", symbol: "KWD", minorUnits: 3 };
  assert.equal(parseAmount("1.250", 3), 1250);
  assert.equal(money(1250, currency), "KWD1.250");
  assert.throws(() => parseAmount("1.2501", 3));
});

test("D9 zero minor units display JPY without decimals and reject 100.0", () => {
  const currency = { code: "JPY", symbol: "\u00a5", minorUnits: 0 };
  assert.equal(parseAmount("100", 0), 100);
  assert.equal(money(1100, currency), "\u00a51,100");
  assert.throws(() => parseAmount("100.0", 0));
});
