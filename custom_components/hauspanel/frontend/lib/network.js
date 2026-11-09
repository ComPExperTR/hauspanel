// Network popup: internet → gateway → access points and switches as a live map with pulses,
// internet latency over the last hours, Wi-Fi networks with their clients, gateway load and the rack's power.
import { h, icon } from "./util.js";
import { openSheet } from "./dialogs.js";
import { meterSensors, watts, formatWatts } from "./usage.js";
import { t } from "./i18n.js";
import { num, live, stat, hint, historyChart, ago, fmt } from "./popkit.js";

const plat = (hass, id) => hass.entities?.[id]?.platform;

/** UniFi: gateway, access points and switches from their device trackers; Wi-Fi networks from "… Clients" sensors. */
export function unifiNet(hass) {
  const trackers = Object.keys(hass.states).filter((id) => id.startsWith("device_tracker.") && plat(hass, id) === "unifi"
    && /^device_tracker\.(ucg|udm|usg|uxg|ucg_|accesspoint|ap_|u6|u7|usw|switch)/i.test(id));
  if (!trackers.length) return null;
  const devs = trackers.map((id) => {
    const dev = hass.entities[id].device_id;
    const ents = Object.values(hass.entities).filter((e) => e.device_id === dev).map((e) => e.entity_id);
    const kind = /ucg|udm|usg|uxg/i.test(id) ? "gw" : /usw|switch/i.test(id) ? "sw" : "ap";
    return { id, dev, kind, name: (hass.states[id].attributes.friendly_name || id).replace(/^AccessPoint-/i, "AP "),
      clients: ents.find((x) => /_clients$/.test(x)), cpu: ents.find((x) => /_cpu_utilization$/.test(x)), mem: ents.find((x) => /_memory_utilization$/.test(x)),
      temp: ents.find((x) => /_cpu_temperature$/.test(x)), uptime: ents.find((x) => /_uptime$/.test(x)), state: ents.find((x) => /^sensor\..*_state$/.test(x)),
      lat: ents.filter((x) => /_wan_latency$/.test(x)) };
  });
  const gw = devs.find((d) => d.kind === "gw") || null;
  const wifi = Object.keys(hass.states).filter((id) => id.startsWith("sensor.") && plat(hass, id) === "unifi" && /clients$/i.test(hass.states[id].attributes.friendly_name || "")
    && !devs.some((d) => d.clients === id));
  return { gw, nodes: devs.filter((d) => d !== gw).sort((a, b) => (a.kind > b.kind ? 1 : -1) || a.name.localeCompare(b.name)), wifi };
}
const up = (hass, d) => hass.states[d.id]?.state === "home" && (!d.state || /connected|online/i.test(hass.states[d.state]?.state || "connected"));

export function openNetwork(ctx) {
  const hass = ctx.hass;
  const net = unifiNet(hass);
  if (!net) return;
  const rack = Object.keys(hass.states).find((id) => /^switch\..*netzwerk|^switch\..*network_rack|^switch\..*rack/i.test(id));
  const rackPower = rack && meterSensors(hass, rack).power;

  // Map: internet cloud → gateway → nodes
  const nodeEls = net.nodes.map((d) => h("div", { class: `hp-net-node ${d.kind}` }, h("span", { class: "dot" }, icon(d.kind === "sw" ? "mdi:switch" : "mdi:access-point")), h("small", { class: "nm" }, d.name), h("small", { class: "cl" })));
  const gwEl = h("div", { class: "hp-net-gw" }, h("span", { class: "dot" }, icon("mdi:router-network")), h("small", {}, net.gw?.name || "Gateway"));
  const cloud = h("div", { class: "hp-net-cloud" }, h("span", { class: "dot" }, icon("mdi:web")), h("small", { class: "lat" }));
  const map = h("div", { class: "hp-net-map" }, cloud, h("i", { class: "hp-net-link up" }), gwEl, h("div", { class: "hp-net-fan" }), h("div", { class: "hp-net-nodes" }, ...nodeEls));

  const sLat = stat("mdi:timer-sand", t("net_latency"));
  const sCpu = stat("mdi:cpu-64-bit", t("net_cpu"));
  const sUp = stat("mdi:clock-check-outline", t("net_uptime"));
  const sRack = stat("mdi:server-network", t("net_rack"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sLat, sCpu, sUp, ...(rackPower ? [sRack] : []));
  const wifi = h("div", { class: "hp-net-wifi" });
  const hints = h("div", { class: "hp-app-hints" });
  const lat = net.gw?.lat || [];
  const chart = lat.length ? historyChart(ctx, { label: t("net_lat_6h"), hours: 6, unit: " ms", digits: 0, minSpan: 10, series: lat.map((id, i) => ({ id, cls: i ? "target" : "now", area: !i })) }) : null;

  const sheet = openSheet(ctx, { title: t("net_title"), subtitle: t("net_sub", { n: net.nodes.length + (net.gw ? 1 : 0) }), cls: "appliance network" });
  sheet.body.append(map, stats, hints, wifi, ...(chart ? [chart] : []));

  const update = (hs) => {
    const ms = lat.map((id) => num(hs, id)).filter((v) => v != null);
    const best = ms.length ? Math.min(...ms) : null;
    const online = !!net.gw && up(hs, net.gw) && best != null;
    map.classList.toggle("offline", !online);
    cloud.querySelector(".lat").textContent = best != null ? `${fmt(hs, best)} ms` : t("net_offline");
    sLat.set(best != null ? `${fmt(hs, best)} ms` : "–");
    sLat.classList.toggle("warn", best != null && best > 60);
    const cpu = num(hs, net.gw?.cpu);
    const tmp = num(hs, net.gw?.temp);
    sCpu.set([cpu != null ? `${fmt(hs, cpu)} %` : null, tmp != null ? `${fmt(hs, tmp)}°` : null].filter(Boolean).join(" · ") || "–");
    const u = live(hs, net.gw?.uptime) ? Date.parse(hs.states[net.gw.uptime].state) : null;
    sUp.set(u ? t("net_days", { n: Math.floor((Date.now() - u) / 86400e3) }) : "–");
    if (rackPower) sRack.set(formatWatts(hs, watts(hs, rackPower)));
    const down = [];
    net.nodes.forEach((d, i) => {
      const ok = up(hs, d);
      nodeEls[i].classList.toggle("down", !ok);
      if (!ok) down.push(d.name);
      const c = num(hs, d.clients);
      nodeEls[i].querySelector(".cl").textContent = c != null ? t("net_n_clients", { n: c }) : "";
    });
    const list = [];
    if (!online) list.push(hint("mdi:web-off", t("net_no_internet"), true));
    for (const n of down) list.push(hint("mdi:access-point-off", t("net_node_down", { name: n }), true));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    const total = net.wifi.reduce((a, id) => a + (num(hs, id) || 0), 0);
    wifi.replaceChildren(h("div", { class: "hp-label" }, icon("mdi:wifi"), t("net_wifi"), h("span", { class: "hp-count" }, String(total))),
      ...net.wifi.map((id) => {
        const n = num(hs, id) || 0;
        const name = (hs.states[id].attributes.friendly_name || id).replace(/\s*clients$/i, "");
        return h("div", { class: "hp-net-ssid" }, h("span", { class: "name" }, icon(/guest|gast/i.test(name) ? "mdi:account-multiple-outline" : "mdi:wifi"), name), h("b", {}, String(n)),
          h("div", { class: "bar" }, h("i", { style: { width: `${total ? (n / total) * 100 : 0}%` } })));
      }));
    wifi.hidden = !net.wifi.length;
  };
  update(hass);
  sheet.updaters.push(update);
  chart?.load(hass);
}

/** Short line for a tile: "12 ms · 93 Geräte". */
export function networkText(hass) {
  const net = unifiNet(hass);
  if (!net) return "";
  const ms = (net.gw?.lat || []).map((id) => num(hass, id)).filter((v) => v != null);
  const clients = net.wifi.reduce((a, id) => a + (num(hass, id) || 0), 0);
  const down = net.nodes.filter((d) => !up(hass, d)).length;
  return [ms.length ? `${fmt(hass, Math.min(...ms))} ms` : t("net_offline"), clients ? t("net_n_devices", { n: clients }) : null, down ? t("net_n_down", { n: down }) : null].filter(Boolean).join(" · ");
}
