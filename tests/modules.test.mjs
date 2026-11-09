// Every frontend module loads: a typo or a broken import would leave the whole panel blank.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { LIB } from "./fake.mjs";

const dir = new URL(LIB);
for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
  test(`lib/${f} loads`, async () => {
    const m = await import(LIB + f);
    assert.ok(Object.keys(m).length > 0, "exports something");
  });
}
