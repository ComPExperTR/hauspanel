// Pool popup: rippling water with the temperature, pH and redox on a scale with their target,
// salt, the filter pump and the pool lights.
import { h, icon, domainOf } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { num, live, slotsOf, stat, hint, btn, ago, fmt } from "./popkit.js";

const SLOTS = [
  ["temp", /^sensor\..*_(temperature|wassertemperatur|water_temperature)$/],
  ["ph", /^sensor\.(?!.*(control|approach|dosing|target|alert|pause)).*_ph$/],
  ["phTarget", /^number\..*_ph_target$/],
  ["phMin", /^number\..*_ph_alert_min$/],
  ["phMax", /^number\..*_ph_alert_max$/],
  ["redox", /^sensor\..*_redox$/],
  ["redoxTarget", /^sensor\..*_(se_timed_cycle_redox_limit|redox_target)$/],
  ["salt", /^sensor\..*_salt$/],
  ["saltAdd", /^sensor\..*_salt_to_add$/],
  ["pump", /^sensor\..*_flow_pump_status$/],
  ["message", /^sensor\..*_messages$/],
  ["online", /^binary_sensor\..*_device_online$/],
  ["lastMsg", /^sensor\..*_last_mqtt_message$/],
  ["canister", /^sensor\..*_ph_minus_canister_status$/],
];

/** Pool controllers: a device with a pH sensor and a redox or chlorine sensor. */
export function poolDevices(hass) {
  const devs = new Set();
  for (const e of Object.values(hass.entities || {})) {
    if (!e.device_id || !/^sensor\.(?!.*(control|approach|dosing)).*_ph$/.test(e.entity_id)) continue;
    const s = slotsOf(hass, e.device_id, SLOTS);
    if (s.redox || s.salt) devs.add(e.device_id);
  }
  return [...devs];
}
export const poolOf = (hass, entityId) => {
  const dev = hass.entities?.[entityId]?.device_id;
  return dev && poolDevices(hass).includes(dev) ? dev : null;
};

/** A scale with a coloured good range, the target and where the value is. */
function scale(label, ic, { lo, hi, goodLo, goodHi, digits = 1, unit = "" }) {
  const dot = h("i", { class: "dot" });
  const tgt = h("i", { class: "tgt" });
  const good = h("i", { class: "good" });
  const val = h("b");
  const el = h("div", { class: "hp-pool-scale" }, h("div", { class: "head" }, h("span", {}, icon(ic), label), val), h("div", { class: "track" }, good, tgt, dot),
    h("div", { class: "ends" }, h("small", {}, String(lo)), h("small", {}, String(hi))));
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  el.set = (hass, v, target, gl = goodLo, gh = goodHi) => {
    good.style.left = pos(gl);
    good.style.width = `calc(${pos(gh)} - ${pos(gl)})`;
    tgt.hidden = target == null;
    if (target != null) tgt.style.left = pos(target);
    dot.hidden = v == null;
    if (v != null) dot.style.left = pos(v);
    val.textContent = v == null ? "–" : `${fmt(hass, v, digits)}${unit}`;
    el.dataset.tone = v == null ? "" : v < gl || v > gh ? "bad" : "";
  };
  return el;
}

export function openPool(ctx, dev) {
  const hass = ctx.hass;
  const s = slotsOf(hass, dev, SLOTS);
  const d = hass.devices?.[dev];
  const area = ctx.model.areaById.get(d?.area_id)?.name;
  const lights = Object.keys(hass.states).filter((id) => domainOf(id) === "light" && /pool/i.test(id) && hass.states[id].state !== "unavailable");

  const temp = h("b");
  const tempSub = h("small");
  const water = h("div", { class: "hp-pool-water" }, h("i", { class: "w1" }), h("i", { class: "w2" }), h("i", { class: "w3" }),
    h("div", { class: "hp-pool-temp" }, temp, tempSub));
  const ph = scale("pH", "mdi:ph", { lo: 6.4, hi: 8.4, goodLo: 7.0, goodHi: 7.4, digits: 1 });
  const redox = scale(t("pool_redox"), "mdi:flask-outline", { lo: 400, hi: 900, goodLo: 650, goodHi: 800, digits: 0, unit: " mV" });
  const sSalt = stat("mdi:shaker-outline", t("pool_salt"));
  const sPump = stat("mdi:pump", t("pool_pump"));
  const stats = h("div", { class: "hp-app-stats" }, sSalt, sPump);
  const hints = h("div", { class: "hp-app-hints" });
  const lightBox = h("div", { class: "hp-modes hp-pk-chips" });
  const lightBtns = lights.map((id) => {
    const b = h("button", { class: "hp-chip" }, icon("mdi:lightbulb-outline"), (hass.states[id].attributes.friendly_name || id).replace(/garten|pool|light bulb|licht/gi, "").trim() || t("pool_light"));
    b.addEventListener("click", () => ctx.hass.callService("light", "toggle", { entity_id: id }));
    lightBox.append(b);
    return [id, b];
  });

  const sheet = openSheet(ctx, { title: t("pool_title"), subtitle: area, cls: "appliance pool" });
  const more = btn("mdi:home-assistant", t("more_short"));
  more.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, s.ph); });
  sheet.body.append(water, h("div", { class: "hp-pool-scales" }, ph, redox), stats,
    ...(lights.length ? [h("div", { class: "hp-label" }, t("pool_lights")), lightBox] : []), hints, h("div", { class: "hp-sheet-actions hp-app-foot" }, more));

  const update = (hs) => {
    const offline = s.online && hs.states[s.online]?.state === "off";
    const tv = num(hs, s.temp);
    const okT = tv != null && tv > -5 && tv < 45;
    temp.textContent = okT ? `${fmt(hs, tv, 1)}°` : "–";
    tempSub.textContent = t("pool_water");
    water.classList.toggle("warm", okT && tv >= 24);
    water.classList.toggle("cold", okT && tv < 18);
    water.classList.toggle("still", !!offline);
    const pt = num(hs, s.phTarget);
    ph.set(hs, num(hs, s.ph), pt, num(hs, s.phMin) != null && pt != null ? pt - 0.2 : 7.0, pt != null ? pt + 0.2 : 7.4);
    const rt = num(hs, s.redoxTarget);
    redox.set(hs, num(hs, s.redox), rt);
    const salt = num(hs, s.salt);
    sSalt.set(salt != null ? `${fmt(hs, salt, 1)} g/l` : "–");
    const pump = hs.states[s.pump]?.state;
    sPump.set(live(hs, s.pump) ? (/off|aus/i.test(pump) ? t("off") : t("on")) : "–");
    const list = [];
    if (offline) list.push(hint("mdi:wifi-off", t("pool_offline", { when: live(hs, s.lastMsg) ? ago(hs, hs.states[s.lastMsg].state) : "?" }), true));
    const add = num(hs, s.saltAdd);
    if (add > 0) list.push(hint("mdi:shaker", t("pool_salt_add", { n: fmt(hs, add) })));
    if (/missing|leer|empty|low/i.test(hs.states[s.canister]?.state || "")) list.push(hint("mdi:bottle-tonic-outline", t("pool_canister")));
    const msg = hs.states[s.message]?.state;
    if (msg && live(hs, s.message) && !/^(none|ok|keine)/i.test(msg)) list.push(hint("mdi:message-alert-outline", msg));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    for (const [id, b] of lightBtns) b.classList.toggle("active", hs.states[id]?.state === "on");
  };
  update(hass);
  sheet.updaters.push(update);
}
