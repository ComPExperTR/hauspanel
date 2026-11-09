// Every language has every text, with the same {placeholders} as English, and loads on demand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LIB } from "./fake.mjs";

const i18n = await import(LIB + "i18n.js");
const { en, de } = i18n.BUILTIN;
const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");

const check = (name, dict) => {
  const missing = Object.keys(en).filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in en));
  const wrong = Object.keys(en).filter((k) => k in dict && ph(en[k]) !== ph(dict[k]));
  const empty = Object.keys(dict).filter((k) => typeof dict[k] !== "string" || !dict[k].trim());
  assert.deepEqual(missing, [], `${name}: texts missing`);
  assert.deepEqual(extra, [], `${name}: texts English doesn't have`);
  assert.deepEqual(wrong, [], `${name}: {placeholders} differ from English`);
  assert.deepEqual(empty, [], `${name}: empty texts`);
};

test("German has every English text", () => check("de", de));

for (const code of i18n.LANGS) {
  test(`${code} has every English text`, async () => check(code, (await import(`${LIB}lang/${code}.js`)).default));
}

test("the language follows Home Assistant, with English as fallback", async () => {
  await i18n.setLanguage("fr-FR");
  assert.equal(i18n.currentLang(), "fr");
  await i18n.setLanguage("de");
  assert.equal(i18n.t("settings"), de.settings);
  await i18n.setLanguage("xx");
  assert.equal(i18n.currentLang(), "en");
  assert.equal(i18n.t("settings"), en.settings);
  assert.equal(i18n.t("no_such_key"), "no_such_key");
  assert.equal(i18n.t("n_devices", { n: 3 }), en.n_devices.replace("{n}", "3"));
});

test("setup texts (config flow) exist for every language, with the same keys as English", () => {
  const dir = new URL("../custom_components/hauspanel/translations/", import.meta.url);
  const keys = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`])).sort();
  const base = keys(JSON.parse(readFileSync(new URL("en.json", dir))));
  for (const code of ["de", ...i18n.LANGS]) {
    assert.deepEqual(keys(JSON.parse(readFileSync(new URL(`${code}.json`, dir)))), base, `translations/${code}.json`);
  }
});

test("no text key is written twice in a language file (the second would silently win)", () => {
  const files = ["i18n.js", "i18n_popups.js", ...i18n.LANGS.map((c) => `lang/${c}.js`)];
  for (const f of files) {
    const src = readFileSync(new URL(f, LIB), "utf8");
    // Each object literal of texts: { key: "…", key2: "…" }.
    for (const block of src.split(/\n(?:export )?(?:const [A-Z_]+ = |default )\{/).slice(1)) {
      const body = block.split("\n};")[0];
      const keys = [...body.matchAll(/(?:^|[\s,{])([a-z][a-z0-9_]*): "/g)].map((m) => m[1]);
      const twice = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
      assert.deepEqual(twice, [], `${f}: written twice`);
    }
  }
});
