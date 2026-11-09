// Settings sheet: changes show live on the dashboard behind it.
import { h, icon, toggleSwitch } from "./util.js";
import { openSheet, confirmDialog } from "./dialogs.js";
import { LAYOUTS, CAT_DEFAULTS } from "./layouts.js";
import { CAMS_PER_PAGE } from "./securitypanel.js";
import { candidateEntities, hideMatcher } from "./model.js";
import { t } from "./i18n.js";
import { babyCamera, babyAreaOf, openBaby } from "./baby.js";
import { securityEditor } from "./overviews.js";
import { cameraList, CAM_CONTAINER } from "./securityview.js";
import { openMotionCams, motionCamPref, frigateCams } from "./visitors.js";
import { openWelcome } from "./welcome.js";
import { setupHints } from "./hints.js";
import { setPref } from "./userprefs.js";
import { takeSettings } from "./store.js";
import { doorbells, bellCameras, openers, bellEnabled, bellCamera, bellOpener, ringNow } from "./doorbell.js";

/** Soft surface of lit cards. */
export const CARD_COLORS = {
  snow: "#ffffff", cream: "#f4ecda", sand: "#eee2c9", linen: "#e8e0d2", stone: "#e2ddd6", blush: "#f0dfe0", peach: "#f3e1cf", lilac: "#e4dcea",
  lavender: "#dfdcef", mist: "#dde3ea", sky: "#d5e3ee", mint: "#d7e8e1", sage: "#dfe6d9", ash: "#dcdbe0", white: "#f8f6f2",
};

/** Vivid colour for lit icons, light dots, sliders and counters. */
export const ACCENTS = {
  sea: "#6cc7b2", amber: "#f4c244", orange: "#f39c3c", coral: "#f07a5a", red: "#ef5f67", pink: "#f06fa5", violet: "#a985f5",
  indigo: "#7f86f6", blue: "#4ea5f5", cyan: "#3cc7dd", teal: "#2fc4a2", green: "#5cc879", lime: "#b7d94a",
};

/** Backgrounds; "glow" fades in with the lights that are on. */
export const BACKGROUNDS = {
  slate: { base: "radial-gradient(90% 70% at 75% 10%, #4a5f7c 0%, transparent 60%), radial-gradient(80% 70% at 10% 90%, #33465e 0%, transparent 60%), linear-gradient(160deg, #28354a, #171f2c)", glow: "radial-gradient(60% 50% at 32% 30%, rgba(255,235,190,.16), transparent 70%)" },
  plum: { base: "radial-gradient(120% 90% at 30% 20%, #5a3550 0%, #432639 45%, #2c1a28 100%)", glow: "radial-gradient(70% 60% at 32% 30%, rgba(255,190,200,.22), transparent 70%), radial-gradient(60% 50% at 85% 90%, rgba(255,170,120,.12), transparent 70%)" },
  dusk: { base: "radial-gradient(120% 90% at 30% 20%, #3c3a66 0%, #2b2a4c 45%, #1a1a30 100%)", glow: "radial-gradient(70% 60% at 30% 30%, rgba(190,170,255,.22), transparent 70%)" },
  ocean: { base: "radial-gradient(120% 90% at 30% 20%, #23506a 0%, #1b3a50 45%, #0f2231 100%)", glow: "radial-gradient(70% 60% at 30% 30%, rgba(140,220,255,.18), transparent 70%)" },
  ember: { base: "radial-gradient(120% 90% at 30% 20%, #6a3a3a 0%, #4c2a2c 45%, #2c1819 100%)", glow: "radial-gradient(70% 60% at 30% 30%, rgba(255,170,120,.24), transparent 70%)" },
  forest: { base: "radial-gradient(120% 90% at 30% 20%, #3b5a44 0%, #2a4232 45%, #18261d 100%)", glow: "radial-gradient(70% 60% at 30% 30%, rgba(200,240,170,.16), transparent 70%)" },
  aurora: { base: "radial-gradient(120% 90% at 30% 20%, #2f5c5a 0%, #2b3d55 50%, #1e1c33 100%)", glow: "radial-gradient(70% 60% at 25% 25%, rgba(120,255,210,.18), transparent 70%), radial-gradient(60% 50% at 85% 85%, rgba(190,130,255,.16), transparent 70%)" },
  graphite: { base: "radial-gradient(120% 90% at 30% 20%, #3c3a3e 0%, #2a292c 50%, #19181a 100%)", glow: "radial-gradient(70% 60% at 30% 30%, rgba(255,255,255,.08), transparent 70%)" },
};

/** Home Assistant's first screen: per user ("user") or for everyone ("system", admins only). */
async function getDefaultPanel(hass, scope) {
  try {
    const r = await hass.callWS({ type: `frontend/get_${scope}_data`, key: "core" });
    return r?.value?.default_panel;
  } catch {
    return undefined;
  }
}

async function setDefaultPanel(hass, scope, on, panel) {
  const r = await hass.callWS({ type: `frontend/get_${scope}_data`, key: "core" }).catch(() => ({}));
  const value = { ...(r?.value || {}) };
  if (on) value.default_panel = panel;
  else delete value.default_panel;
  await hass.callWS({ type: `frontend/set_${scope}_data`, key: "core", value });
}

const PANEL_TITLES = { hauspanel: "HausPanel", iphonepanel: "MobilePanel", securitypanel: "SecurityPanel" };
const panelTitle = (id) => PANEL_TITLES[id] || id;

function row(label, control, hint) {
  return h("div", { class: "hp-set-row" }, h("div", { class: "hp-set-label" }, h("span", {}, label), hint ? h("small", {}, hint) : null), control);
}

/** A heading with its hint above a rounded list of rows. */
function section(title, ...children) {
  const kids = children.filter(Boolean);
  const hint = kids[0]?.classList?.contains("hp-muted") ? kids.shift() : null;
  if (hint) hint.className = "hp-set-hint";
  return h("div", { class: "hp-set-block" },
    h("div", { class: "hp-set-head" }, title), hint,
    h("div", { class: "hp-set-section" }, ...kids));
}

/** Step-by-step guides on GitHub, and the one that fits each settings tab. */
const GUIDES = "https://github.com/alpacalabs-de/hauspanel/blob/main/docs/";
const GUIDE_OF = { home: "edit", rooms: "areas", security: "security", look: "look", device: "wall-tablet", navigation: "pages", agenda: "agenda", hide: "hiding", system: "own-settings" };

/** Icon colour per settings tab. */
const TAB_COLORS = { security: "#ef5f67", home: "#6cc7b2", rooms: "#f6c945", look: "#f06fa5", device: "#4ea5f5", navigation: "#a985f5", agenda: "#f39c3c", hide: "#8f9bab", system: "#7f8ea3" };

export function openSettings(ctx) {
  const sheet = openSheet(ctx, { title: t("settings"), subtitle: t("settings_sub"), cls: "settings" });
  let tab = "home";
  const S = ctx.settings;
  const isAdmin = !!ctx.hass.user?.is_admin;
  // Which dashboard this is: HausPanel shows everything, MobilePanel and SecurityPanel only what they use.
  const panelId = ctx._panelId || "hauspanel";
  const kind = ctx._forceLayout === "phone" ? "phone" : ctx._forceLayout === "security" ? "security" : "main";
  const defaultPanel = { user: undefined, system: undefined };
  Promise.all([getDefaultPanel(ctx.hass, "user"), isAdmin ? getDefaultPanel(ctx.hass, "system") : undefined]).then(([u, sys]) => {
    defaultPanel.user = u;
    defaultPanel.system = sys;
    draw();
  });

  const hideState = { query: "" };
  const draw = () => {
    const scroll = sheet.body.querySelector(".hp-set-pane")?.scrollTop || 0;
    const s = S.s;
    const dev = S.device;
    const look = s.look;
    sheet.body.replaceChildren();
    const groups = {};
    const add = (key, ...els) => (groups[key] ||= []).push(...els);

    // Layout (each device remembers its own). Only HausPanel lets you pick; the other two have a fixed layout.
    const camsRow = () => row(t("cams_per_page"), h("div", { class: "hp-seg" }, CAMS_PER_PAGE.map((n) => {
      const b = h("button", { class: (dev.camsPerPage || 6) === n ? "active" : "" }, String(n));
      b.addEventListener("click", () => { S.setDevice("camsPerPage", n); draw(); });
      return b;
    })), t("cams_per_page_hint"));
    const sidebarRow = () => row(t("hide_sidebar"), toggleSwitch(dev.hideSidebar, () => { S.setDevice("hideSidebar", !dev.hideSidebar); draw(); }), t("hide_sidebar_hint"));
    // Effects: automatic (lite on slow screens), full, or lite.
    const liteRow = () => row(t("lite_label"), h("div", { class: "hp-seg" }, [["auto", "lite_auto"], ["off", "lite_full"], ["on", "lite_on"]].map(([v, l]) => {
      const b = h("button", { class: (dev.lite || "auto") === v ? "active" : "" }, t(l));
      b.addEventListener("click", () => { S.setDevice("lite", v); draw(); });
      return b;
    })), (dev.lite || "auto") === "auto" && ctx._slow ? t("lite_hint_slow") : t("lite_hint"));
    // Cameras: which ones the Security page shows (for everyone), and whose movements the security
    // popup lists (only for the signed-in user). Before, both were only in edit mode and the popup.
    const camerasSection = () => {
      const { items, hidden } = cameraList(ctx);
      const all = [...items, ...hidden.filter((id) => !items.includes(id) && ctx.hass.states[id])];
      if (!all.length && !frigateCams(ctx.hass).length) return null;
      const nameOf = (id) => ctx.hass.states[id]?.attributes.friendly_name || id;
      const list = h("div", { class: "hp-qlist" }, ...all.map((id) => {
        const shown = items.includes(id);
        const sw = toggleSwitch(shown, () => {
          if (shown) ctx.hideItem(CAM_CONTAINER, id); else S.unhide(CAM_CONTAINER, id);
          draw();
        });
        return h("div", { class: `hp-qrow ${shown ? "" : "off"}` }, h("span", { class: "hp-qrow-ic" }, icon("mdi:cctv")),
          h("div", { class: "hp-qrow-text" }, h("b", {}, nameOf(id))), sw);
      }));
      const motionSub = h("small", {}, "…");
      motionCamPref(ctx.hass).then((own) => {
        motionSub.textContent = own == null ? t("set_cams_motion_default") : own.length ? own.map(nameOf).join(", ") : t("set_cams_motion_none");
      });
      const pickBtn = h("button", { class: "hp-chip" }, icon("mdi:cctv"), t("set_cams_motion_pick"));
      pickBtn.addEventListener("click", () => openMotionCams(ctx, items, draw));
      const motion = frigateCams(ctx.hass).length
        ? h("div", { class: "hp-set-row" }, h("div", { class: "hp-set-label" },
            h("span", {}, t("set_cams_motion"), " ", h("span", { class: "hp-set-own" }, t("only_you"))), motionSub), pickBtn)
        : null;
      return section(t("set_cams"), h("p", { class: "hp-muted small" }, t("set_cams_hint")),
        all.length ? h("div", { class: "hp-set-sub" }, t("set_cams_page")) : null, all.length ? list : null, motion);
    };
    if (kind === "main") {
      const lay = h("div", { class: "hp-layout-pick" });
      for (const l of LAYOUTS) {
        const b = h("button", { class: `hp-layout-opt ${dev.layout === l.id ? "active" : ""}` },
          icon(l.icon), h("b", {}, t(`layout_${l.id}`)), h("small", {}, t(`layout_${l.id}_desc`)));
        b.addEventListener("click", () => {
          S.setDevice("layout", l.id);
          draw();
        });
        lay.append(b);
      }
      add("device", section(t("layout"), lay, h("p", { class: "hp-muted small" }, t("layout_hint"))));
      // Tile size only where tiles are fitted to the screen.
      if (["grid", "sidebar"].includes(dev.layout)) {
        const sizes = h("div", { class: "hp-seg" }, ["auto", "s", "c", "m", "l"].map((k) => {
          const b = h("button", { class: (dev.tileSize || "auto") === k ? "active" : "" }, t(`size_${k}`));
          b.addEventListener("click", () => { S.setDevice("tileSize", k); draw(); });
          return b;
        }));
        // Height only matters for a fixed size; "fill screen" picks its own.
        const heights = (dev.tileSize || "auto") === "auto" ? null : h("div", { class: "hp-seg" }, ["normal", "low", "lower"].map((k) => {
          const b = h("button", { class: (dev.tileHeight || "normal") === k ? "active" : "" }, t(`height_${k}`));
          b.addEventListener("click", () => { S.setDevice("tileHeight", k); draw(); });
          return b;
        }));
        add("device", section(t("tile_size"), sizes, h("p", { class: "hp-muted small" }, t("tile_size_hint")),
          heights ? row(t("tile_height"), heights, t("tile_height_hint")) : null));
      }
      if (dev.layout === "sidebar") {
        const side = { weather: true, agenda: true, status: true, scenes: true, onnow: false, rooms: false, ...(s.side || {}) };
        add("device", section(t("side_panel"), h("p", { class: "hp-muted small" }, t("side_panel_hint")),
          ...[["weather", "mdi:weather-partly-cloudy", t("weather")], ["agenda", "mdi:calendar-blank-outline", t("upcoming")],
            ["status", "mdi:home-outline", t("home_status")], ["scenes", "mdi:palette-outline", t("scenes")], ["onnow", "mdi:lightbulb-on-outline", t("on_now")], ["rooms", "mdi:format-list-bulleted", t("side_rooms")]].map(([k, ic, label]) =>
            row(h("span", {}, icon(ic), " ", label), toggleSwitch(side[k], () => {
              S.update((x) => { x.side = { ...side, [k]: !side[k] }; });
              draw();
            })))));
      }
      add("device", section(t("set_screen"), sidebarRow(), liteRow(), dev.layout === "security" ? camsRow() : null));
    } else if (kind === "security") {
      add("device", section(t("set_screen"), camsRow(), sidebarRow(), liteRow()));
    }

    // Look
    // Card colours as small lit cards, highlight colours as round dots with a check mark.
    const swatches = (map, key) => {
      const cards = key === "cardColor";
      const box = h("div", { class: cards ? "hp-cardpick" : "hp-accentpick" });
      for (const [name, val] of Object.entries(map)) {
        const active = look[key] === name;
        const b = cards
          ? h("button", { class: `hp-cardpick-opt ${active ? "active" : ""}`, title: name, "aria-label": name, style: { background: val } },
            h("span", { class: "hp-cardpick-dot" }), h("span", { class: "hp-cardpick-line" }))
          : h("button", { class: `hp-accentpick-opt ${active ? "active" : ""}`, title: name, "aria-label": name, style: { background: val } },
            active ? icon("mdi:check") : null);
        b.addEventListener("click", () => {
          S.update((x) => { x.look[key] = name; });
          draw();
        });
        box.append(b);
      }
      return box;
    };
    const bgs = h("div", { class: "hp-bg-row" });
    for (const [name, bg] of Object.entries(BACKGROUNDS)) {
      const b = h("button", { class: `hp-bg-opt ${look.background === name ? "active" : ""}`, style: { background: `${bg.glow === "none" ? "" : bg.glow + ","} ${bg.base}` } }, h("span", {}, t(`bg_${name}`)));
      b.addEventListener("click", () => {
        S.update((x) => { x.look.background = name; });
        draw();
      });
      bgs.append(b);
    }
    const corners = h("div", { class: "hp-seg" }, ["square", "soft", "round"].map((c) => {
      const b = h("button", { class: look.corners === c ? "active" : "" }, t(`corners_${c}`));
      b.addEventListener("click", () => { S.update((x) => { x.look.corners = c; }); draw(); });
      return b;
    }));
    const tog = (path, val) => toggleSwitch(val, () => {
      S.update((x) => {
        const [a, b] = path;
        if (b) x[a][b] = !x[a][b];
        else x[a] = !x[a];
      });
      draw();
    });
    // A lit card that shows the chosen colours right away.
    const preview = h("div", { class: "hp-preview" },
      h("div", { class: "hp-tile on" },
        h("div", { class: "hp-tile-top" }, h("div", { class: "hp-tile-icon" }, icon("mdi:lightbulb")), h("span", { class: "hp-badge", style: { position: "static" } }, "2")),
        h("div", { class: "hp-tile-text" }, h("div", { class: "hp-tile-name" }, t("preview_room")), h("div", { class: "hp-tile-state" }, "75 %")),
        h("div", { class: "hp-slider mini", style: { marginTop: "10px" } }, h("div", { class: "hp-slider-fill", style: { width: "75%" } }))));
    add("look", section(t("look"), preview,
      h("div", { class: "hp-set-title" }, t("card_color")), h("small", {}, t("card_color_hint")), swatches(CARD_COLORS, "cardColor"),
      h("div", { class: "hp-set-title" }, t("accent_color")), h("small", {}, t("accent_color_hint")), swatches(ACCENTS, "accent")),
      section(t("background"), h("p", { class: "hp-muted small" }, t("background_hint")), bgs,
        row(t("follow_lights"), tog(["look", "followLights"], look.followLights !== false), t("follow_lights_hint"))),
      section(t("style"),
        row(t("corners"), corners),
        row(t("frame"), tog(["look", "frame"], look.frame !== false)),
        row(t("glass"), tog(["look", "glass"], look.glass !== false), t("glass_hint"))),
      section(t("ov_popups"),
        row(t("ov_classic"), toggleSwitch(!!s.classicPopups, () => { S.update((x) => { x.classicPopups = !x.classicPopups; }); draw(); }), t("ov_classic_hint"))));

    // Header and Home
    // The iPhone header has no calendar buttons; the security screen has no Home page.
    const headerSection = section(t("header"),
      row(t("show_date"), tog(["header", "date"], s.header.date)),
      row(t("show_weather"), tog(["header", "weather"], s.header.weather)),
      kind === "main" ? row(t("show_agenda"), tog(["header", "agenda"], s.header.agenda)) : null,
      kind !== "security" ? row(t("today_card"), tog(["todayCard"], s.todayCard), t("today_card_hint")) : null);
    if (kind === "security") add("home", headerSection);
    if (kind !== "security") {
      const cats = { ...CAT_DEFAULTS, ...(s.cats || {}) };
      const chipsSection = section(t("cat_chips"), h("p", { class: "hp-muted small" }, t("cat_chips_hint")),
        ...[["light", "mdi:lightbulb-outline", t("cat_light")], ["climate", "mdi:thermometer", t("climate")], ["shades", "mdi:blinds-horizontal", t("shades")], ["security", "mdi:shield-outline", t("security")],
          ["energy", "mdi:lightning-bolt-outline", t("energy")], ["today", "mdi:calendar-blank-outline", t("cat_today")], ["waste", "mdi:delete-variant", t("waste")], ["maint", "mdi:wrench-outline", t("maintenance")], ["leave", "mdi:home-export-outline", t("leave_chip")]].map(([k, ic, label]) =>
          row(h("span", {}, icon(ic), " ", label), toggleSwitch(cats[k], () => {
            S.update((x) => { x.cats = { ...cats, [k]: !cats[k] }; });
            draw();
          }))));
      const style = s.homeStyle === "favorites" ? "favorites" : "rooms";
      const pick = (v, ic, label, hint) => {
        const b = h("button", { class: `hp-home-style ${style === v ? "active" : ""}` }, icon(ic), h("b", {}, label), h("small", {}, hint));
        b.addEventListener("click", () => { S.update((x) => { x.homeStyle = v; }); draw(); });
        return b;
      };
      add("home", section(t("home_style"),
        h("div", { class: "hp-home-styles" },
          pick("rooms", "mdi:view-grid-outline", t("home_style_rooms"), t("home_style_rooms_hint")),
          pick("favorites", "mdi:star-outline", t("home_style_fav"), t("home_style_fav_hint")))), chipsSection);
      add("rooms", section(t("scenes"),
        row(t("scene_confirm_setting"), toggleSwitch(s.sceneConfirm !== false, () => {
          S.update((x) => { x.sceneConfirm = x.sceneConfirm === false; });
          draw();
        }), t("scene_confirm_hint"))));
      add("rooms", section(t("set_rooms_open"),
        // What a tap on a room opens, as two clear choices (holding opens the other one).
        row(t("rp_tap"), h("div", { class: "hp-seg" }, [[true, "rp_tap_glance"], [false, "rp_tap_page"]].map(([v, l]) => {
          const b = h("button", { class: (s.roomPopup !== false) === v ? "active" : "" }, t(l));
          b.addEventListener("click", () => { S.update((x) => { x.roomPopup = v; }); draw(); });
          return b;
        })), t("rp_tap_hint")),
        // Motion in the room popup: a choice of each person, not of the panel.
        h("div", { class: "hp-set-row" }, h("div", { class: "hp-set-label" },
          h("span", {}, t("rp_motion_setting"), " ", h("span", { class: "hp-set-own" }, t("only_you"))), h("small", {}, t("rp_motion_setting_hint"))),
          toggleSwitch(!!ctx.prefs?.roomMotion, () => { setPref(ctx, "roomMotion", !ctx.prefs?.roomMotion); draw(); }))));
      // Security: the popup behind the Security chip, its doors and when they may be open, the good night check.
      const ed = securityEditor(ctx);
      add("security",
        section(t("ov_watched_label"), h("p", { class: "hp-muted small" }, t("set_sec_items_hint")), ed.items),
        section(t("set_sec_popup"), h("p", { class: "hp-muted small" }, t("set_sec_popup_hint")), ed.parts),
        camerasSection(),
        section(t("gn_title"), row(t("gn_setting"), toggleSwitch(s.nightCheck === true, () => {
          S.update((x) => { x.nightCheck = x.nightCheck !== true; });
          draw();
        }), t("gn_setting_hint"))));
      add("rooms", section(t("shades"),
        row(t("group_shades"), toggleSwitch(!!s.groupShades, () => {
          S.update((x) => { x.groupShades = !x.groupShades; });
          draw();
        }), t("group_shades_hint"))));
    }

    // Doorbell: camera full screen with an open button when it rings.
    const bells = doorbells(ctx.hass);
    if (bells.length) {
      const bell = bells[0];
      const nameOf = (id) => ctx.hass.states[id]?.attributes.friendly_name || id;
      const setBell = (k, v) => S.update((x) => { x.doorbell = { ...(x.doorbell || {}), [k]: v }; });
      const on = bellEnabled(ctx);
      const cam = h("select", { class: "hp-select" }, bellCameras(ctx.hass).map((id) => h("option", { value: id }, nameOf(id))));
      cam.value = bellCamera(ctx, bell) || "";
      cam.addEventListener("change", () => setBell("camera", cam.value));
      const op = h("select", { class: "hp-select" }, h("option", { value: "" }, t("doorbell_none")), openers(ctx.hass, bell).map((id) => h("option", { value: id }, nameOf(id))));
      op.value = bellOpener(ctx, bell) || "";
      op.addEventListener("change", () => setBell("opener", op.value));
      const test = h("button", { class: "hp-chip" }, icon("mdi:bell-ring-outline"), t("doorbell_test"));
      test.addEventListener("click", () => ringNow(ctx, bell));
      add("security", section(t("doorbell"), h("p", { class: "hp-muted small" }, t("doorbell_hint")),
        row(t("doorbell_show"), toggleSwitch(on, () => { setBell("enabled", !on); draw(); })),
        on ? row(t("doorbell_camera"), cam) : null,
        on ? row(t("doorbell_opener"), op) : null,
        on ? h("div", { class: "hp-set-row-end" }, test) : null));
    }

    // Baby monitor: which camera, which room (for temperature and the tile).
    {
      const nameOf = (id) => ctx.hass.states[id]?.attributes.friendly_name || id;
      const setBaby = (k, v) => S.update((x) => { x.baby = { ...(x.baby || {}), [k]: v }; });
      const cams = Object.keys(ctx.hass.states).filter((id) => id.startsWith("camera.") && !/letzte|letztes|_person$|_car$|snapshot|browser_mod/i.test(id))
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      const cur = babyCamera(ctx);
      const cam = h("select", { class: "hp-select" }, h("option", { value: "" }, t("baby_off")), cams.map((id) => h("option", { value: id }, nameOf(id))));
      cam.value = cur || "";
      cam.addEventListener("change", () => { setBaby("camera", cam.value); draw(); });
      const room = h("select", { class: "hp-select" }, ctx.model.areas.map((a) => h("option", { value: a.id }, a.name)));
      if (cur) room.value = babyAreaOf(ctx, cur) || "";
      room.addEventListener("change", () => setBaby("area", room.value));
      const test = h("button", { class: "hp-chip" }, icon("mdi:baby-face-outline"), t("baby_open"));
      test.addEventListener("click", () => { const c = babyCamera(ctx); if (c) openBaby(ctx, c); });
      add("security", section(t("baby_title"), h("p", { class: "hp-muted small" }, t("baby_set_hint")),
        row(t("doorbell_camera"), cam),
        cur ? row(t("room"), room) : null,
        cur ? h("div", { class: "hp-set-row-end" }, test) : null));
    }

    // Calendars, lists, weather
    const pickList = (ids, key) => {
      const sel = s[key] ?? ids;
      const box = h("div", {});
      for (const id of ids) {
        const on = sel.includes(id);
        box.append(row(ctx.hass.states[id]?.attributes.friendly_name || id, toggleSwitch(on, () => {
          S.update((x) => {
            const cur = new Set(x[key] ?? ids);
            if (cur.has(id)) cur.delete(id);
            else cur.add(id);
            x[key] = [...cur];
          });
          ctx.agenda.refresh();
          draw();
        })));
      }
      if (!ids.length) box.append(h("div", { class: "hp-muted small" }, t("none_found")));
      return box;
    };
    const wsel = h("select", { class: "hp-select" },
      h("option", { value: "" }, ctx.model.weather.length ? t("automatic") : t("open_meteo")),
      ctx.model.weather.map((w) => h("option", { value: w }, ctx.hass.states[w]?.attributes.friendly_name || w)));
    wsel.value = s.weather || "";
    wsel.addEventListener("change", () => {
      S.update((x) => { x.weather = wsel.value || null; });
      ctx.weather.start();
    });
    if (kind !== "security") {
      add("agenda",
        section(t("calendars"), pickList(ctx.model.calendars, "calendars")),
        section(t("reminder_lists"), pickList(ctx.model.todos, "todos")));
    }
    add("agenda", section(t("weather"), row(t("weather_source"), wsel)));

    // Navigation and own pages
    const pages = h("div", {});
    for (const p of s.pages) {
      pages.append(h("div", { class: "hp-set-row" },
        h("div", { class: "hp-set-label" }, h("span", {}, icon(p.icon), " ", p.title)),
        h("div", { class: "hp-row-btns" },
          h("button", { class: "hp-round ghost", "aria-label": t("rename"), onclick: async () => {
            const v = await ctx.prompt(t("page_name"), p.title);
            if (v) { S.renamePage(p.id, v); draw(); }
          } }, icon("mdi:pencil")),
          h("button", { class: "hp-round ghost danger", "aria-label": t("remove"), onclick: () => ctx.confirm({
            title: p.title, text: t("remove_page_q"), ok: t("remove"), danger: true,
            onOk: () => { S.removePage(p.id); draw(); },
          }) }, icon("mdi:delete-outline")))));
    }
    const iconPick = ["mdi:star-outline", "mdi:sofa-outline", "mdi:baby-face-outline", "mdi:tree-outline", "mdi:car", "mdi:flower-outline", "mdi:gamepad-variant-outline", "mdi:briefcase-outline"];
    pages.append(h("button", { class: "hp-chip", onclick: async () => {
      const v = await ctx.prompt(t("page_name"), "");
      if (v) {
        S.addPage(v, iconPick[s.pages.length % iconPick.length]);
        draw();
      }
    } }, icon("mdi:plus"), t("new_page")));
    // Which tabs show at the bottom, and which summary cards show on Home
    const dockTabs = ctx._tabs();
    const tabBox = h("div", {});
    const fixedOrder = ["rooms", "media", "security"];
    const tabKeys = [...dockTabs.items, ...dockTabs.hidden].filter((k) => k !== "home")
      .sort((a, b) => (fixedOrder.indexOf(a) + 1 || 99) - (fixedOrder.indexOf(b) + 1 || 99));
    for (const key of tabKeys) {
      const shown = !dockTabs.hidden.includes(key);
      tabBox.append(row(h("span", {}, icon(ctx.tabIcon(key)), " ", ctx.tabLabel(key)), toggleSwitch(shown, () => {
        if (shown) S.hide("dock", key);
        else S.unhide("dock", key);
        draw();
      })));
    }
    const homeHidden = new Set(S.cont("home").hidden || []);
    const cardBox = h("div", {});
    for (const [key, label, ic] of [["card:today", t("card_today"), "mdi:calendar-today"], ["card:security", t("security"), "mdi:shield-outline"], ["card:climate", t("climate"), "mdi:thermometer"], ["card:media", t("tab_media"), "mdi:music"]]) {
      const shown = !homeHidden.has(key);
      cardBox.append(row(h("span", {}, icon(ic), " ", label), toggleSwitch(shown, () => {
        if (shown) S.hide("home", key);
        else S.unhide("home", key);
        draw();
      })));
    }
    if (kind !== "security") {
      if (kind === "main") add("home", section(t("home_cards"), h("p", { class: "hp-muted small" }, t("home_cards_hint")), cardBox));
      add("home", headerSection);
    }
    add("navigation", section(t("visible_tabs"), h("p", { class: "hp-muted small" }, t("visible_tabs_hint")), tabBox));
    add("navigation", section(t("pages"), h("p", { class: "hp-muted small" }, t("pages_hint")), pages,
      h("p", { class: "hp-muted small" }, t("dock_hint"))));

    // This device
    const startToggle = (scope) => toggleSwitch(defaultPanel[scope] === panelId, async () => {
      const on = defaultPanel[scope] !== panelId;
      try {
        await setDefaultPanel(ctx.hass, scope, on, panelId);
        defaultPanel[scope] = on ? panelId : undefined;
        ctx.toast(on ? t("start_on") : t("start_off"));
      } catch (e) {
        ctx.toast(t("start_failed"));
      }
      draw();
    });
    // Own settings for this person on this dashboard, or the ones everybody shares.
    add("system", section(t("whose_settings"),
      row(t("personal_settings"), toggleSwitch(!!S.personal, async () => {
        try {
          await S.setPersonal(!S.personal);
          ctx.toast(S.personal ? t("personal_on") : t("personal_off"));
        } catch {
          ctx.toast(t("personal_failed"));
        }
        draw();
      }), t("personal_settings_hint", { user: ctx.hass.user?.name || "", panel: panelTitle(panelId) }))));
    // Back up and restore: the settings of this panel (yours or the shared ones, whichever you see) as a file.
    {
      const exp = h("button", { class: "hp-chip" }, icon("mdi:download-outline"), t("backup_export"));
      exp.addEventListener("click", () => {
        const data = { hauspanel: ctx.version, panel: panelId, exported: new Date().toISOString(), settings: JSON.parse(JSON.stringify(S.s)) };
        const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })), download: `hauspanel-${panelId}-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      });
      const file = h("input", { type: "file", accept: ".json,application/json", hidden: true });
      const imp = h("button", { class: "hp-chip" }, icon("mdi:upload-outline"), t("backup_import"));
      imp.addEventListener("click", () => file.click());
      file.addEventListener("change", async () => {
        const f = file.files?.[0];
        file.value = "";
        if (!f) return;
        let data;
        try { data = JSON.parse(await f.text()); } catch { data = null; }
        if (!data || typeof data.settings !== "object" || !("hauspanel" in data)) { ctx.toast(t("backup_bad")); return; }
        confirmDialog(ctx, { title: t("backup_import"), text: t("backup_import_confirm", { panel: panelTitle(data.panel || panelId), date: (data.exported || "").slice(0, 10) }), ok: t("backup_import_ok"), danger: true,
          onOk: () => {
            S.update((x) => { for (const k of Object.keys(x)) delete x[k]; Object.assign(x, JSON.parse(JSON.stringify(data.settings))); }, "import");
            ctx.toast(t("backup_done"));
            draw();
          } });
      });
      // Take settings from another panel: just the house (hidden devices, door windows, cameras …) or everything.
      const others = Object.keys(PANEL_TITLES).filter((id) => id !== panelId);
      const from = h("select", { class: "hp-select" }, others.map((id) => h("option", { value: id }, panelTitle(id))));
      let mode = "house";
      const modes = h("div", { class: "hp-seg" }, [["house", "take_house"], ["all", "take_all"]].map(([v, l]) => {
        const b = h("button", { class: v === mode ? "active" : "" }, t(l));
        b.addEventListener("click", () => { mode = v; modes.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b)); });
        return b;
      }));
      const take = h("button", { class: "hp-chip" }, icon("mdi:swap-horizontal"), t("take_go"));
      take.addEventListener("click", async () => {
        let src;
        try {
          src = (await ctx.hass.callWS({ type: "hauspanel/settings/get", panel: from.value }))?.settings;
        } catch { src = null; }
        if (!src || typeof src !== "object") { ctx.toast(t("take_failed")); return; }
        const fromName = panelTitle(from.value);
        confirmDialog(ctx, { title: t("take_title"), text: t(mode === "all" ? "take_confirm_all" : "take_confirm_house", { from: fromName, to: panelTitle(panelId) }), ok: t("take_ok"), danger: mode === "all",
          onOk: () => {
            const next = takeSettings(S.s, src, mode);
            S.update((x) => { for (const k of Object.keys(x)) delete x[k]; Object.assign(x, next); }, "take");
            ctx.toast(t("take_done", { from: fromName }));
            draw();
          } });
      });
      add("system", section(t("backup_title"), h("p", { class: "hp-muted small" }, t("backup_hint")),
        h("div", { class: "hp-set-row-end hp-backup-btns" }, exp, imp, file),
        row(t("take_label"), from, t("take_hint")),
        h("div", { class: "hp-set-row-end hp-take-btns" }, modes, take)));
    }
    add("system", section(t("when_opening"),
      row(t("start_screen"), startToggle("user"), t("start_screen_hint")),
      isAdmin ? row(t("start_screen_all"), startToggle("system"), t("start_screen_all_hint")) : null));

    // A quiet thank-you link next to the version; opens Ko-fi in a new tab.
    {
      const again = h("button", { class: "hp-chip" }, icon("mdi:hand-wave-outline"), t("wel_again"));
      again.addEventListener("click", () => { sheet.close(); setTimeout(() => openWelcome(ctx), 250); });
      add("system", section(t("wel_title"), row(t("wel_again_label"), again, t("wel_again_hint"))));
    }
    add("system", h("p", { class: "hp-muted small center hp-set-version" }, `HausPanel ${ctx.version}`, " · ",
      h("a", { href: "https://ko-fi.com/alpacalabs", target: "_blank", rel: "noopener" }, t("support_link"))));

    // Hiding: device types, integrations, text rules and single entities, everywhere in HausPanel.
    add("hide", ...hidePane(ctx, S, draw, hideState));

    const TABS = [
      ["home", "mdi:home-outline", kind === "security" ? t("header") : t("set_tab_start")],
      ["rooms", "mdi:sofa-outline", t("set_tab_rooms")],
      ["security", "mdi:shield-outline", t("security")],
      ["look", "mdi:palette-outline", t("look")],
      ["device", kind === "security" ? "mdi:cctv" : "mdi:tablet-dashboard", t("set_tab_device")],
      kind !== "security" ? ["navigation", "mdi:dock-bottom", t("navigation")] : null,
      ["agenda", kind === "security" ? "mdi:weather-partly-cloudy" : "mdi:calendar-blank-outline", kind === "security" ? t("weather") : t("agenda_weather")],
      ["hide", "mdi:eye-off-outline", t("hiding")],
      ["system", "mdi:cog-outline", t("system")],
    ].filter((x) => x && groups[x[0]]?.length);
    if (!groups[tab]) tab = TABS[0][0];
    const nav = h("nav", { class: "hp-set-nav" }, TABS.map(([key, ic, label]) => {
      const b = h("button", { class: `hp-set-tab ${tab === key ? "active" : ""}` }, h("span", { class: "hp-set-tab-ic" }, icon(ic)), h("span", { class: "hp-set-tab-label" }, label));
      b.style.setProperty("--c", TAB_COLORS[key]);
      b.addEventListener("click", () => {
        tab = key;
        draw();
        sheet.body.querySelector(".hp-set-pane").scrollTop = 0;
      });
      return b;
    }));
    // Worth a look: rooms without a floor, devices without a room … on top of the first tab, each with its guide.
    const de = /^de/i.test(ctx.hass.locale?.language || ctx.hass.language || "");
    const guideUrl = (anchor) => `${GUIDES}${de ? "guides.de.md" : "guides.md"}#${anchor}`;
    const hints = kind === "security" ? [] : setupHints(ctx);
    if (hints.length) {
      const list = h("div", { class: "hp-qlist" }, ...hints.map((x) => h("a", { class: "hp-qrow hp-hint", href: guideUrl(x.guide), target: "_blank", rel: "noopener" },
        h("span", { class: "hp-qrow-ic" }, icon(x.icon)), h("div", { class: "hp-qrow-text" }, h("b", {}, t(`hint_${x.key}`, { n: x.n })), h("small", {}, t(`hint_${x.key}_fix`))),
        icon("mdi:open-in-new", "hp-hint-go"))));
      (groups.home ||= []).unshift(section(t("hints_title"), h("p", { class: "hp-muted small" }, t("hints_hint")), list));
    }
    // Who a tab's settings are for: this screen only, just you, or everyone on this dashboard.
    const scope = tab === "device" ? ["mdi:tablet", t("scope_device")]
      : tab === "system" || tab === "hide" ? null
        : S.personal ? ["mdi:account-outline", t("scope_personal", { user: ctx.hass.user?.name || "", panel: panelTitle(panelId) })]
          : ["mdi:account-multiple-outline", t("scope_shared", { panel: panelTitle(panelId) })];
    const note = scope ? h("div", { class: "hp-set-scope" }, icon(scope[0]), h("span", {}, scope[1])) : null;
    // One line on what the tab is for, so a first look makes sense.
    // … and a link to the step-by-step guide for it (German page when HausPanel speaks German).
    const guide = guideUrl(GUIDE_OF[tab] || "guides");
    const intro = h("p", { class: "hp-set-intro" }, t(`set_intro_${tab}`), " ",
      h("a", { class: "hp-set-guide", href: guide, target: "_blank", rel: "noopener" }, icon("mdi:help-circle-outline"), t("set_guide")));
    const pane = h("div", { class: "hp-set-pane" }, ...[intro, note, ...(groups[tab] || [])].filter(Boolean));
    sheet.body.append(nav, pane);
    pane.scrollTop = scroll;
    // On narrow screens the tab row scrolls: keep the open tab in view.
    const on = nav.querySelector(".active");
    if (on) nav.scrollLeft = Math.max(0, on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
  };
  draw();
}

const domainName = (hass, d) => {
  const n = hass.localize?.(`component.${d}.entity_component._.name`) || d;
  return d.startsWith("input_") ? `${n} (${t("helper")})` : n;
};
const platformName = (state, p) => state.names?.[p] || p;
const nEntities = (n) => t(n === 1 ? "one_entity" : "n_entities", { n });
const nameOf = (hass, id) => hass.states[id]?.attributes.friendly_name || id;

function hidePane(ctx, S, draw, state) {
  const hass = ctx.hass;
  const hide = S.s.hide || { entities: [], domains: [], platforms: [], patterns: [] };
  const all = candidateEntities(hass);
  const why = hideMatcher(hass, hide);
  const hiddenCount = all.filter((id) => why(id)).length;

  const change = (fn) => {
    S.update((x) => {
      x.hide = { entities: [], domains: [], platforms: [], patterns: [], ...(x.hide || {}) };
      fn(x.hide);
    }, "hide");
    draw();
  };
  const toggleIn = (list, v) => (h) => {
    const set = new Set(h[list]);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    h[list] = [...set];
  };
  const count = (pred) => all.filter(pred).length;

  // Device types
  const domains = [...new Set(all.map((id) => id.split(".")[0]))].sort((a, b) => domainName(hass, a).localeCompare(domainName(hass, b)));
  const domBox = h("div", {});
  for (const d of domains) {
    const n = count((id) => id.startsWith(d + "."));
    domBox.append(row(`${domainName(hass, d)}`, toggleSwitch(hide.domains.includes(d), () => change(toggleIn("domains", d))), nEntities(n)));
  }

  // Integrations
  const plats = {};
  for (const id of all) {
    const p = hass.entities?.[id]?.platform;
    if (p) plats[p] = (plats[p] || 0) + 1;
  }
  // Integration names come from their manifests, once.
  if (!state.names) {
    state.names = {};
    hass.callWS({ type: "manifest/list", integrations: Object.keys(plats) }).then((list) => {
      for (const m of list) state.names[m.domain] = m.name;
      draw();
    }).catch(() => {});
  }
  const platBox = h("div", {});
  for (const [p, n] of Object.entries(plats).sort((a, b) => platformName(state, a[0]).localeCompare(platformName(state, b[0])))) {
    platBox.append(row(platformName(state, p), toggleSwitch(hide.platforms.includes(p), () => change(toggleIn("platforms", p))), nEntities(n)));
  }

  // Text rules
  const patBox = h("div", {});
  for (const p of hide.patterns) {
    const one = hideMatcher(hass, { patterns: [p] });
    patBox.append(h("div", { class: "hp-set-row" },
      h("div", { class: "hp-set-label" }, h("span", {}, icon("mdi:text-search"), " ", p), h("small", {}, t("n_matches", { n: count((id) => one(id)) }))),
      h("button", { class: "hp-round ghost danger", "aria-label": t("remove"), onclick: () => change((x) => { x.patterns = x.patterns.filter((v) => v !== p); }) }, icon("mdi:delete-outline"))));
  }
  const patInput = h("input", { class: "hp-input", placeholder: t("pattern_placeholder") });
  const addPat = () => {
    const v = patInput.value.trim();
    if (v && !hide.patterns.includes(v)) change((x) => { x.patterns = [...x.patterns, v]; });
  };
  patInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addPat(); });
  const patPreview = h("small", { class: "hp-muted" });
  patInput.addEventListener("input", () => {
    const v = patInput.value.trim();
    if (!v) { patPreview.textContent = ""; return; }
    const one = hideMatcher(hass, { patterns: [v] });
    const hits = all.filter((id) => one(id));
    patPreview.textContent = t("n_matches", { n: hits.length }) + (hits.length ? ": " + hits.slice(0, 4).map((id) => nameOf(hass, id)).join(", ") + (hits.length > 4 ? " …" : "") : "");
  });
  patBox.append(h("div", { class: "hp-pat-add" }, patInput, h("button", { class: "hp-chip", onclick: addPat }, icon("mdi:plus"), t("add"))), patPreview);

  // Single entities: search, or the ones hidden one by one
  const results = h("div", {});
  const search = h("input", { class: "hp-input", type: "search", placeholder: t("search_entities"), value: state.query });
  const drawResults = () => {
    const q = state.query.trim().toLowerCase();
    const cur = S.s.hide || hide;
    const curWhy = hideMatcher(hass, cur);
    const list = q
      ? all.filter((id) => id.toLowerCase().includes(q) || nameOf(hass, id).toLowerCase().includes(q))
      : (cur.entities || []).filter((id) => hass.states[id]);
    list.sort((a, b) => nameOf(hass, a).localeCompare(nameOf(hass, b)));
    results.replaceChildren();
    for (const id of list.slice(0, 60)) {
      const reason = curWhy(id);
      const byRule = reason && reason !== "entity";
      const sw = toggleSwitch(!!reason, () => {
        if (byRule) return;
        S.update((x) => {
          x.hide = { entities: [], domains: [], platforms: [], patterns: [], ...(x.hide || {}) };
          toggleIn("entities", id)(x.hide);
        }, "hide");
        draw();
      });
      if (byRule) sw.classList.add("locked");
      results.append(row(nameOf(hass, id), sw, byRule ? `${id} · ${t("hidden_by_" + reason)}` : id));
    }
    if (!list.length) results.append(h("div", { class: "hp-muted small" }, q ? t("none_found") : t("no_single_hidden")));
    else if (list.length > 60) results.append(h("div", { class: "hp-muted small" }, t("more_results", { n: list.length - 60 })));
  };
  search.addEventListener("input", () => { state.query = search.value; drawResults(); });
  drawResults();

  return [
    h("p", { class: "hp-muted small" }, t("hiding_intro", { n: hiddenCount, m: all.length })),
    section(t("single_entities"), h("p", { class: "hp-muted small" }, t("single_entities_hint")), search, results),
    section(t("text_rules"), h("p", { class: "hp-muted small" }, t("text_rules_hint")), patBox),
    section(t("device_types"), h("p", { class: "hp-muted small" }, t("device_types_hint")), domBox),
    section(t("integrations"), h("p", { class: "hp-muted small" }, t("integrations_hint")), platBox),
  ];
}
