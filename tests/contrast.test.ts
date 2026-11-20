import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast } from "../scripts/contrast.js";
test("black on white is 21:1", () => assert.equal(contrast("#000000", "#ffffff"), 21));
