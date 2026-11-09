// HausPanel: a dashboard for Home Assistant that builds itself.
import { h, icon, formatTime, formatDate, fireHass, debounce, formatNumber, isUnlocked } from "./lib/util.js";
import { buildModel, registrySignature, isOn } from "./lib/model.js";
import { Settings } from "./lib/store.js";
import { renderHome, renderRooms, renderPage, specialTiles } from "./lib/layouts.js";
import { SIDE_DEFAULTS } from "./lib/sidepanel.js";
import { sortable } from "./lib/drag.js";
import { confirmDialog, promptDialog, detailsDialog, addDialog, hiddenDialog, toast } from "./lib/dialogs.js";
import { Agenda, openCalendar, openReminders, todayCard } from "./lib/agenda.js";
import { Weather, openWeather } from "./lib/weather.js";
import { WEATHER_ICONS, linkedCover } from "./lib/domains.js";
import { openPlayer, playerView } from "./lib/media.js";
import { openCamera } from "./lib/camera.js";
import { doorbellWatcher } from "./lib/doorbell.js";
import { openShades } from "./lib/shades.js";
import { classicPopups, openShadesOverview, openSecurityOverview } from "./lib/overviews.js";
import { openPrinter, printerForEntity } from "./lib/printer.js";
import { openVacuum, vacuumFor } from "./lib/vacuum.js";
import { openThermostat } from "./lib/thermostat.js";
import { openGarden, isIrrigationValve } from "./lib/garden.js";
import { openPool, poolOf } from "./lib/pool.js";
import { openCar, carOf } from "./lib/car.js";
import { openDoor, bellFor } from "./lib/door.js";
import { openHeatPump, heatPumpOf } from "./lib/heatpump.js";
import { openGate, isGate } from "./lib/gate.js";
import { openWallbox, wallboxOf } from "./lib/wallbox.js";
import { openGoodNight } from "./lib/goodnight.js";
import { openRoomPopup } from "./lib/roompop.js";
import { openBaby, isBabyCam } from "./lib/baby.js";
import { loadPlugLinks } from "./lib/usage.js";
import { securityView, cameraEditor, openSecuritySheet, setSecAllowSource, allowedNow } from "./lib/securityview.js";
import { fitToScreen } from "./lib/fit.js";
import { loadEnergyPrefs, hasEnergy, energyView } from "./lib/energy.js";
import { renderPhone, isPhoneScreen, bindEdgeSwipe } from "./lib/phone.js";
import { renderSecurityPanel, securityBar, securityStatePill, securityPages, bindPageSwipe } from "./lib/securitypanel.js";
import { openSettings, CARD_COLORS, ACCENTS, BACKGROUNDS } from "./lib/settings.js";
import { setLanguage, t } from "./lib/i18n.js";
import { maybeWelcome } from "./lib/welcome.js";
import { loadPrefs } from "./lib/userprefs.js";
import { STYLES, loadFont } from "./lib/styles.js";

const BUILT_IN_TABS = {
  home: { icon: "mdi:home-outline", label: "tab_home" },
  rooms: { icon: "mdi:view-grid-outline", label: "tab_rooms" },
  media: { icon: "mdi:play-box-outline", label: "tab_media" },
  security: { icon: "mdi:shield-outline", label: "tab_security" },
  energy: { icon: "mdi:lightning-bolt-outline", label: "tab_energy" },
};

const PERSON_COLORS = ["#f3b37a", "#f4d27a", "#c9c6d6", "#9fd3c7", "#f2a7b5", "#b9c8f0"];

class HausPanelElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.live = [];
    this.clocks = [];
    this.sheets = new Set();
    this.editing = false;
    this.tab = "home";
    this.roomSel = null;
    this.phoneRoom = null; // iPhone layout: the room opened on top of the current tab
    this.secPage = 0; // Security layout: the page on screen
    this._secIdle = 0;
    this._narrow = false;
    this._sig = null;
    this._agendaBtns = [];
    this.version = "";
    this.settings = new Settings((reason) => this._settingsChanged(reason));
    setSecAllowSource(() => this.settings.s.secAllow);
    this._rerenderSoon = debounce(() => this.rerender(), 30);
  }

  // ---- properties set by Home Assistant ----
  get hass() {
    return this._hass;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._start();
    else if (this._ready) this._onHass();
  }

  set narrow(v) {
    if (v === this._narrow) return;
    this._narrow = v;
    if (this._ready) this._rerenderSoon();
  }

  get narrow() {
    return (this._rootEl?.clientWidth || window.innerWidth) < 640;
  }

  set panel(p) {
    this.version = p?.config?.version || "";
    this._panelId = p?.url_path || "hauspanel";
    // The MobilePanel and SecurityPanel entries in the sidebar always show their own layout.
    this._forceLayout = p?.config?.layout || (p?.config?.phone ? "phone" : null);
  }

  /** The layout drawn now: the panel's or the device's choice, or the iPhone layout on phones. */
  get layout() {
    const dev = this.settings.device.layout;
    if (this._forceLayout) return this._forceLayout;
    if (dev === "phone" || dev === "security") return dev;
    // "Single room" is taken out for now: devices that used it get Tiles.
    if (dev === "focus") return isPhoneScreen() ? "phone" : "grid";
    if ((dev === "grid" || dev === "sidebar") && isPhoneScreen()) return "phone";
    return dev;
  }

  /** Lite mode: no glass, no glow and no endless animations on this screen ("auto" follows the speed test). */
  get lite() {
    const v = this.settings.device.lite || "auto";
    return v === "on" || (v === "auto" && !!this._slow);
  }

  get isPhone() {
    return this.layout === "phone";
  }

  set route(r) {
    this._route = r;
  }

  get root() {
    return this._rootEl;
  }

  // ---- lifecycle ----
  async _start() {
    // Home Assistant sets hass and panel in the same go; wait a tick so the panel is known.
    await Promise.resolve();
    await setLanguage(this._hass.language);
    loadFont(new URL("./fonts/outfit-latin.woff2", import.meta.url).href);
    const style = h("style", {}, STYLES);
    this._bgBase = h("div", { class: "hp-bg-base" });
    this._bgGlow = h("div", { class: "hp-bg-glow" });
    this._header = h("header", { class: "hp-header" });
    this._main = h("main", { class: "hp-main" });
    this._dock = h("nav", { class: "hp-dock" });
    this._fab = h("button", { class: "hp-fab" });
    this._fab.addEventListener("click", () => {
      this.editing = !this.editing;
      this.rerender();
    });
    this.layer = h("div", { class: "hp-layer" });
    this._rootEl = h("div", { class: "hp-root" }, this._bgBase, this._bgGlow, this._header, this._main, this._dock, this._fab, this.layer);
    this._rootEl.append(h("div", { class: "hp-loading" }, icon("mdi:view-dashboard-variant"), t("loading")));
    this.shadowRoot.append(style, this._rootEl);
    bindEdgeSwipe(this._main, () => this.isPhone && !!this.phoneRoom && !this.editing, () => this.back());
    bindPageSwipe(this._main, () => this.layout === "security" && !this.editing && !this.sheets.size, (d) => this.goSecurityPage(this.secPage + d));

    // The person's own choices (motion in the room popup …) load with the panel's settings.
    const [, , prefs] = await Promise.all([this.settings.load(this._hass, this._panelId || "hauspanel"), loadEnergyPrefs(this), loadPrefs(this._hass)]);
    this.prefs = prefs;
    this.model = this._buildModel();
    this._sig = registrySignature(this._hass);
    this.agenda = new Agenda(this, () => this._agendaChanged());
    this.weather = new Weather(this, () => this._weatherChanged());
    this._ready = true;
    this._applyDevice(true);
    this.rerender();
    this.agenda.refresh();
    this.weather.start();
    // The very first time this user opens HausPanel (not on a camera-only screen): three short steps.
    if (this.layout !== "security") setTimeout(() => maybeWelcome(this), 800);

    // Slow tablet? A second of frames after start tells; Settings → This screen can also force it.
    measureSpeed().then((slow) => { this._slow = slow; if (slow && this.lite) this.rerender(); });
    this._clockTimer = setInterval(() => this._tick(), 1000);
    const activity = () => this._activity();
    for (const ev of ["pointerdown", "keydown", "wheel"]) this.shadowRoot.addEventListener(ev, activity, { capture: true });
    this._resize = debounce(() => this.rerender(), 150);
    window.addEventListener("resize", this._resize);
    document.fonts?.ready.then(() => this._fit());
  }

  connectedCallback() {
    if (this._ready && !this._clockTimer) this._clockTimer = setInterval(() => this._tick(), 1000);
  }

  disconnectedCallback() {
    clearInterval(this._clockTimer);
    this._clockTimer = null;
    if (this.settings.device.hideSidebar) fireHass(this, "hass-dock-sidebar", { dock: this._prevDock || "docked" });
  }

  _onHass() {
    loadPlugLinks(this._hass, () => this._rerenderSoon());
    const sig = registrySignature(this._hass);
    if (sig.some((x, i) => x !== this._sig[i])) {
      this._sig = sig;
      this.model = this._buildModel();
      if (!this._main.querySelector(".sorting")) this._rerenderSoon();
      return;
    }
    for (const el of this.live) el.update(this._hass);
    for (const s of this.sheets) s.update(this._hass);
    (this._doorbell ||= doorbellWatcher(this))(this._hass);
    this.agenda.watch(this._hass);
    this._updateGlow();
    this._updatePersons();
    this._weatherPill?.update();
  }

  _buildModel() {
    this._hideSig = JSON.stringify(this.settings.s.hide || {});
    return buildModel(this._hass, this.settings.s.hide);
  }

  _settingsChanged(reason) {
    if (!this._ready) return;
    if (reason === "device") this._applyDevice(false);
    if (JSON.stringify(this.settings.s.hide || {}) !== this._hideSig) this.model = this._buildModel();
    this._rerenderSoon();
  }

  _applyDevice(first) {
    const want = this.settings.device.hideSidebar;
    if (first && !want) return;
    if (want) {
      if (first) this._prevDock = localStorage.getItem("dockedSidebar")?.replace(/"/g, "") || "docked";
      fireHass(this, "hass-dock-sidebar", { dock: "always_hidden" });
    } else if (this._sidebarHidden) {
      fireHass(this, "hass-dock-sidebar", { dock: this._prevDock && this._prevDock !== "always_hidden" ? this._prevDock : "docked" });
    }
    this._sidebarHidden = want;
  }

  _agendaChanged() {
    this._updateAgendaBtns();
    for (const p of this.live) p.sideRefresh?.();
    this._today?.update();
    for (const s of this.sheets) s.update(this._hass);
  }

  _weatherChanged() {
    this._weatherPill?.update();
    for (const p of this.live) p.sideRefresh?.();
    for (const s of this.sheets) s.update(this._hass);
  }

  // ---- helpers the parts call (this element is their "ctx") ----
  hideItem(container, key) {
    this.settings.hide(container, key);
  }

  specialTiles() {
    return specialTiles(this);
  }

  openAdd(container, autoItems, domains) {
    addDialog(this, { container, autoItems, domains, onPick: (id) => this.settings.add(container, id, autoItems) });
  }

  openHidden(container, hidden, label) {
    hiddenDialog(this, container, hidden, label);
  }

  prompt(title, value) {
    return promptDialog(this, title, value);
  }

  confirm(opts) {
    confirmDialog(this, opts);
  }

  openDetails(entityId) {
    // A 3D printer's light or sensor opens the printer.
    const printer = printerForEntity(this._hass, entityId);
    if (printer) return openPrinter(this, printer);
    // Cars, pool, robot vacuums, thermostats, sprinklers and the doorbell have their own popups.
    const hs = this._hass;
    const car = carOf(hs, entityId);
    if (car) return openCar(this, car);
    const pool = poolOf(hs, entityId);
    if (pool) return openPool(this, pool);
    const wb = wallboxOf(hs, entityId);
    if (wb) return openWallbox(this, wb);
    const hp = heatPumpOf(hs, entityId);
    if (hp) return openHeatPump(this, hp);
    const gate = linkedCover(hs, entityId) || entityId;
    if (isGate(hs, gate)) return openGate(this, gate);
    const vac = vacuumFor(hs, entityId);
    if (vac) return openVacuum(this, vac);
    if (entityId.startsWith("climate.") && hs.states[entityId]) return openThermostat(this, entityId);
    if (isIrrigationValve(hs, entityId)) return openGarden(this);
    const bell = entityId.startsWith("event.") ? bellFor(this, entityId) : null;
    if (bell) return openDoor(this, bell);
    // A gate or garage sensor opens its gate's open/close popup.
    detailsDialog(this, linkedCover(this._hass, entityId) || entityId);
  }

  openDetailsPlain(entityId) {
    detailsDialog(this, entityId, { plain: true });
  }

  openPlayer(entityId) {
    openPlayer(this, entityId);
  }

  openCamera(entityId) {
    if (isBabyCam(this, entityId)) return openBaby(this, entityId);
    const bell = bellFor(this, entityId);
    if (bell) return openDoor(this, bell);
    openCamera(this, entityId);
  }

  openCameraPlain(entityId) {
    openCamera(this, entityId);
  }

  openGoodNight(sceneId) {
    openGoodNight(this, sceneId);
  }

  openShadesClassic(opts) {
    openShades(this, opts);
  }

  /** The security popup behind the "Everything secure" banner (classic one if chosen in Settings). */
  openSecurityPopup() {
    if (classicPopups(this)) openSecuritySheet(this);
    else openSecurityOverview(this, () => openSecuritySheet(this));
  }

  openShades(opts) {
    if (classicPopups(this)) return openShades(this, opts);
    openShadesOverview(this, opts, () => openShades(this, opts));
  }

  toast(text) {
    toast(this, text);
  }

  goTab(tab) {
    if (this.editing) return;
    this.tab = tab;
    this.phoneRoom = null;
    this.roomPage = null;
    this.rerender();
  }

  /** A tap on a room: the room popup by default, the room page when switched off in the settings. */
  tapRoom(areaId) {
    if (this.settings.s.roomPopup !== false && areaId !== "_other") openRoomPopup(this, areaId);
    else this.openRoom(areaId);
  }

  holdRoom(areaId) {
    if (this.settings.s.roomPopup !== false || areaId === "_other") this.openRoom(areaId);
    else openRoomPopup(this, areaId);
  }

  /** The full page of a room (in the Rooms tab, or on the phone on top of the current tab). */
  openRoom(areaId) {
    if (this.editing) return;
    this.roomSel = areaId;
    this.roomPage = areaId;
    // iPhone: the room opens on top of the current tab (Home or Rooms) and Back returns there.
    if (this.isPhone) this.phoneRoom = areaId;
    else this.tab = "rooms";
    this.rerender();
  }

  /** Security layout: show page i (-1 = the last, the status page). */
  goSecurityPage(i) {
    if (this.editing) return;
    const n = securityPages(this).length;
    const next = i < 0 ? n - 1 : Math.max(0, Math.min(n - 1, i));
    if (next === this.secPage) return;
    this.secPage = next;
    this.rerender();
  }

  /** iPhone: one screen back. */
  back() {
    if (!this.phoneRoom) return;
    this.phoneRoom = null;
    this.rerender();
  }

  todayCard() {
    this._today = todayCard(this);
    return this._today;
  }

  /** Rooms in the order chosen in edit mode; rooms without devices are left out. */
  roomList() {
    const m = this.model;
    const has = (a) => a.tiles.length || this.settings.cont(`room:${a.id}`).added?.length;
    const auto = m.areas.filter(has).map((a) => a.id);
    const { items } = this.settings.arrange("rooms", auto);
    const out = items.map((id) => m.areaById.get(id)).filter(Boolean);
    if (has(m.unassigned) && !this.settings.cont("rooms").hidden?.includes("_other")) out.push({ ...m.unassigned, name: t("other") });
    return out;
  }

  allScenes() {
    return [...this.model.areas.flatMap((a) => a.scenes), ...this.model.unassigned.scenes];
  }

  /** Calendar and reminders buttons with their counters. */
  agendaButtons() {
    const row = h("div", { class: "hp-head-row" });
    if (!this.settings.s.header.agenda) return row;
    if (this.agenda.calendars().length) {
      const b = h("button", { class: "hp-icon-btn", "aria-label": t("calendar"), onclick: () => openCalendar(this) }, icon("mdi:calendar-blank-outline"), h("span", { class: "hp-badge" }));
      b.dataset.kind = "cal";
      row.append(b);
    }
    if (this.agenda.todoLists().length) {
      const b = h("button", { class: "hp-icon-btn", "aria-label": t("reminders"), onclick: () => openReminders(this) }, icon("mdi:format-list-checks"), h("span", { class: "hp-badge" }));
      b.dataset.kind = "rem";
      row.append(b);
    }
    this._agendaBtns.push(row);
    this._updateAgendaBtns();
    return row;
  }

  _updateAgendaBtns() {
    const ev = this.agenda?.todayEvents().length || 0;
    const items = this.agenda?.items.length || 0;
    const over = this.agenda?.overdue().length || 0;
    for (const row of this._agendaBtns) {
      for (const b of row.children) {
        const badge = b.querySelector(".hp-badge");
        if (b.dataset.kind === "cal") badge.textContent = ev ? String(ev) : "";
        if (b.dataset.kind === "rem") {
          badge.textContent = items ? String(items) : "";
          badge.classList.toggle("red", over > 0);
        }
      }
    }
  }

  tabLabel(key) {
    if (BUILT_IN_TABS[key]) return t(BUILT_IN_TABS[key].label);
    const p = this.settings.s.pages.find((x) => `page:${x.id}` === key);
    return p?.title || key;
  }

  tabIcon(key) {
    if (BUILT_IN_TABS[key]) return BUILT_IN_TABS[key].icon;
    return this.settings.s.pages.find((x) => `page:${x.id}` === key)?.icon || "mdi:star-outline";
  }

  // ---- pages ----
  _tabs() {
    const m = this.model;
    const avail = ["home"];
    if (this.roomList().length) avail.push("rooms");
    if (m.media.length) avail.push("media");
    if (m.security.length) avail.push("security");
    if (hasEnergy(this)) avail.push("energy");
    for (const p of this.settings.s.pages) avail.push(`page:${p.id}`);
    return this.settings.arrange("dock", avail);
  }

  _roomGroups(kind, pick, opts = {}) {
    const groups = this.roomList().map((a) => ({
      container: `${kind}:${a.id}`,
      sortKey: a.id === "_other" ? null : a.id,
      sortContainer: "rooms",
      title: a.name,
      icon: a.icon,
      area: a,
      areaName: a.name,
      items: pick(a),
      ...opts,
    }));
    // Rooms with nothing for this page still show up when something was added by hand.
    // Rooms where everything is hidden drop out (in edit mode they stay, so things can come back).
    return groups.filter((g) => this.editing
      ? g.items.length || this.settings.cont(g.container).added?.length
      : this.settings.arrange(g.container, g.items).items.length);
  }

  _page() {
    const m = this.model;
    const tab = this.tab;
    if (tab === "media") {
      // The same players the rooms show (model.media): no twin a Music Assistant player stands for, no copies.
      const shown = new Set(m.media);
      let groups = this._roomGroups("media", (a) => a.all.filter((id) => shown.has(id)), { addDomains: ["media_player"] });
      if (!this.editing) {
        // One grid instead of a heading per room (most rooms have one speaker): playing first, then on, then off.
        const rank = (id) => {
          const s = this._hass.states[id]?.state;
          return s === "playing" ? 0 : s === "paused" ? 1 : s === "unavailable" || s === "unknown" || s === undefined ? 4 : s === "off" || s === "standby" ? 3 : 2;
        };
        const ids = [...new Set(groups.flatMap((g) => this.settings.arrange(g.container, g.items).items.filter((k) => !k.startsWith("sep:"))))];
        const order = new Map(ids.map((id, i) => [id, i]));
        ids.sort((a, b) => rank(a) - rank(b) || order.get(a) - order.get(b));
        groups = ids.length ? [{ container: "media:all", title: t("players"), items: ids, sort: null }] : [];
      }
      const top = h("div", { class: "hp-top" });
      const active = this._activePlayer();
      if (active) {
        const view = playerView(this, active, { compact: true });
        this.live.push(view);
        const pick = h("div", { class: "hp-player-pick" }, m.media.map((id) => {
          const b = h("button", { class: `hp-chip ${id === active ? "active" : ""}` }, this._hass.states[id]?.attributes.friendly_name || id);
          b.addEventListener("click", () => {
            this._player = id;
            this.rerender();
          });
          return b;
        }));
        const big = h("button", { class: "hp-round ghost", "aria-label": t("open_player"), onclick: () => this.openPlayer(active) }, icon("mdi:arrow-expand"));
        top.append(h("div", { class: "hp-card hp-player-card" }, view, big), pick);
      }
      return { groups, top, title: t("tab_media"), label: t("now_playing") };
    }
    if (tab === "energy") {
      return { groups: [], top: energyView(this), title: t("tab_energy"), label: t("energy") };
    }
    if (tab === "security" && !this.editing) {
      // Overview: status row and live cameras. Edit mode shows the rooms, to hide or add things.
      const side = { ...SIDE_DEFAULTS, ...(this.settings.s.side || {}) };
      const status = !(this.layout === "sidebar" && !this.narrow && side.status);
      return { groups: [], top: securityView(this, this._securitySummary(), { status }), title: t("tab_security"), label: t("security") };
    }
    if (tab === "security") {
      // Cameras have their own order across rooms; the rest is arranged per room.
      const groups = this._roomGroups("security", (a) => a.all.filter((id) => m.security.includes(id) && !id.startsWith("camera.")), { addDomains: ["lock", "alarm_control_panel", "binary_sensor", "cover"] });
      return { groups, top: h("div", { class: "hp-sec-edit" }, this._securitySummary(), cameraEditor(this)), title: t("tab_security"), label: t("security") };
    }
    if (tab.startsWith("page:")) {
      const p = this.settings.s.pages.find((x) => `page:${x.id}` === tab);
      if (p) {
        return { groups: [{ container: tab, title: p.title, items: [], emptyText: t("empty_page") }], top: null, title: p.title, label: t("own_page") };
      }
    }
    return null;
  }

  _activePlayer() {
    const m = this.model;
    const st = (id) => this._hass.states[id];
    if (this._player && st(this._player)) return this._player;
    return m.media.find((id) => st(id)?.state === "playing") || m.spotify[0] || m.media.find((id) => isOn(st(id))) || m.media[0];
  }

  /** Security entities that are not hidden on the security page. */
  securityItems() {
    const m = this.model;
    return m.security.filter((id) => !(this.settings.cont(`security:${m.areaOf[id] || "_other"}`).hidden || []).includes(id));
  }

  _securitySummary() {
    const box = h("div", { class: "hp-card hp-sec-summary" });
    box.update = (hass) => {
      const sec = this.securityItems().filter((id) => !allowedNow(id));
      const unlocked = sec.filter((id) => isUnlocked(hass, id));
      const open = sec.filter((id) => id.startsWith("binary_sensor.") && ["door", "window", "garage_door", "opening"].includes(hass.states[id]?.attributes.device_class) && hass.states[id]?.state === "on");
      const ok = !unlocked.length && !open.length;
      const sig = `${unlocked}|${open}`;
      if (box.dataset.sig === sig) return;
      box.dataset.sig = sig;
      box.classList.toggle("ok", ok);
      box.replaceChildren(icon(ok ? "mdi:shield-check" : "mdi:shield-alert-outline", "hp-sec-icon"),
        h("div", {}, h("b", {}, ok ? t("everything_secure") : t("needs_attention")),
          h("small", {}, [unlocked.length ? t("unlocked_n", { n: unlocked.length }) : t("all_locked"), open.length ? t("open_n", { n: open.length }) : t("all_closed")].join(" · "))));
    };
    box.update(this._hass);
    this.live.push(box);
    return box;
  }

  // ---- drawing ----
  rerender() {
    if (!this._ready) return;
    const scroller = this._main.querySelector(".hp-side-main, .hp-layout");
    const scroll = scroller?.scrollTop ?? 0;
    this.live = [];
    this.clocks = [];
    this._agendaBtns = [];
    this._today = null;
    this._applyLook();
    const layout = this.layout;
    const tabs = this._tabs();
    if (!tabs.items.includes(this.tab) && this.tab !== "rooms") this.tab = tabs.items[0] || "home";
    this._rootEl.className = `hp-root layout-${layout} tab-${this.tab.split(":")[0]} ${this.editing ? "editing" : ""} ${this.narrow ? "narrow" : ""} ${this._rootEl.classList.contains("light-bg") ? "light-bg" : ""} ${this.lite ? "lite" : ""}`;
    this._rootEl.querySelector(".hp-loading")?.remove();

    if (layout !== "phone") this.phoneRoom = null;
    if (this.phoneRoom && !this.roomList().some((a) => a.id === this.phoneRoom)) this.phoneRoom = null;
    if (layout === "phone") this._renderPhoneHeader();
    else if (layout === "security") this._renderSecurityHeader();
    else this._renderHeader();
    let view;
    if (layout === "security") view = renderSecurityPanel(this);
    else if (layout === "phone") view = renderPhone(this) || renderHome(this, "grid");
    else if (this.tab === "home") view = renderHome(this, layout);
    else if (this.tab === "rooms") view = renderRooms(this, layout);
    else {
      const page = this._page();
      if (page) view = renderPage(this, layout, page);
      else {
        this.tab = "home";
        view = renderHome(this, layout);
      }
    }
    this._main.replaceChildren(view);
    if (layout === "security" && !this.editing) this._dock.replaceChildren(securityBar(this, (i) => this.goSecurityPage(i)));
    else this._renderDock(tabs);
    this._fab.replaceChildren(icon(this.editing ? "mdi:check" : "mdi:pencil-outline"), h("span", {}, this.editing ? t("done") : t("edit")));
    const newScroller = this._main.querySelector(".hp-side-main, .hp-layout");
    const where = `${this.tab}|${this.phoneRoom || ""}|${this.secPage}`;
    if (newScroller && this._lastWhere === where) newScroller.scrollTop = scroll;
    this._lastWhere = where;
    this._updateGlow();
    this._updatePersons();
    this._fit();
  }

  /** Wall tablets: Home and rooms on one screen, without scrolling. */
  _fit() {
    cancelAnimationFrame(this._fitFrame);
    if (this.isPhone || this.layout === "security") return; // phones scroll; the security layout sizes itself
    this._fitFrame = requestAnimationFrame(() => fitToScreen(this._main, { editing: this.editing, size: this.settings.device.tileSize, height: this.settings.device.tileHeight }));
  }

  _applyLook() {
    const look = this.settings.s.look;
    const r = this._rootEl.style;
    r.setProperty("--hp-lit", CARD_COLORS[look.cardColor] || CARD_COLORS.snow);
    r.setProperty("--hp-lit-text", "#1e2833");
    r.setProperty("--hp-lit-sub", "rgba(30,40,51,.58)");
    r.setProperty("--hp-accent", ACCENTS[look.accent] || ACCENTS.sea);
    r.setProperty("--hp-radius", { square: "10px", soft: "18px", round: "26px" }[look.corners] || "18px");
    const bg = BACKGROUNDS[look.background] || BACKGROUNDS.slate;
    this._bgBase.style.background = bg.base;
    this._bgGlow.style.background = bg.glow;
    this._rootEl.dataset.frame = look.frame === false ? "0" : "1";
    this._rootEl.dataset.glass = look.glass === false ? "0" : "1";
  }

  /** The background glows the more lights are on (when that option is on). */
  _updateGlow() {
    const look = this.settings.s.look;
    if (look.followLights === false) {
      this._bgGlow.style.opacity = "1";
      return;
    }
    const lights = this.model.lights.filter((id) => this.model.areaOf[id]);
    const on = lights.filter((id) => isOn(this._hass.states[id])).length;
    const f = lights.length ? on / lights.length : 0;
    this._bgGlow.style.opacity = String(0.15 + 0.85 * Math.min(1, f * 1.5));
  }

  _renderHeader() {
    const s = this.settings.s;
    const hdr = this._header;
    hdr.replaceChildren();
    const menu = (this.narrow || this.settings.device.hideSidebar)
      ? h("button", { class: "hp-icon-btn", "aria-label": t("menu"), onclick: () => fireHass(this, "hass-toggle-menu", { open: true }) }, icon("mdi:menu"))
      : null;
    this._clock = h("div", { class: "hp-clock" });
    this._date = s.header.date ? h("div", { class: "hp-date" }) : null;
    const left = h("div", { class: "hp-head-left" },
      this._date,
      h("div", { class: "hp-head-row" }, menu, this._clock),
      this.editing ? h("div", { class: "hp-edit-hint" }, t("edit_hint")) : null);
    this._weatherPill = s.header.weather ? this._weatherEl() : null;
    this._persons = h("div", { class: "hp-persons" });
    const gear = h("button", { class: "hp-icon-btn settings", "aria-label": t("settings"), onclick: () => openSettings(this) }, icon("mdi:cog-outline"));
    // Edit sits up here in the Sidebar layout (its panel is the navigation, so there is no bar at the bottom).
    const edit = h("button", { class: `hp-icon-btn hp-head-edit ${this.editing ? "on" : ""}`, "aria-label": this.editing ? t("done") : t("edit"),
      onclick: () => { this.editing = !this.editing; this.rerender(); } }, icon(this.editing ? "mdi:check" : "mdi:pencil-outline"));
    hdr.append(left, h("div", { class: "hp-head-right" }, this._weatherPill, this.agendaButtons(), this._persons, edit, gear));
    this._tick(true);
  }

  /** Security tablet: one slim row with clock, the security state, weather, people and settings. */
  _renderSecurityHeader() {
    const s = this.settings.s;
    const hdr = this._header;
    hdr.replaceChildren();
    const menu = (this.narrow || this.settings.device.hideSidebar)
      ? h("button", { class: "hp-icon-btn", "aria-label": t("menu"), onclick: () => fireHass(this, "hass-toggle-menu", { open: true }) }, icon("mdi:menu"))
      : null;
    this._clock = h("div", { class: "hp-clock" });
    this._date = s.header.date ? h("div", { class: "hp-date" }) : null;
    this._weatherPill = s.header.weather ? this._weatherEl() : null;
    this._persons = h("div", { class: "hp-persons" });
    const gear = h("button", { class: "hp-icon-btn settings", "aria-label": t("settings"), onclick: () => openSettings(this) }, icon("mdi:cog-outline"));
    hdr.append(h("div", { class: "hp-sec-head" }, menu, this._clock, this._date, securityStatePill(this),
      this.editing ? h("div", { class: "hp-edit-hint" }, t("edit_hint")) : null),
      h("div", { class: "hp-head-right" }, this._weatherPill, this._persons, gear));
    this._tick(true);
  }

  /** iPhone top bar: back (or menu), weather, edit and settings; below it the title of the screen. */
  _renderPhoneHeader() {
    const s = this.settings.s;
    const hdr = this._header;
    hdr.replaceChildren();
    const room = this.phoneRoom && this.roomList().find((a) => a.id === this.phoneRoom);
    const left = room
      ? h("button", { class: "hp-ph-back", "aria-label": t("back"), onclick: () => this.back() }, icon("mdi:chevron-left"), h("span", {}, this.tabLabel(this.tab)))
      : h("button", { class: "hp-icon-btn", "aria-label": t("menu"), onclick: () => fireHass(this, "hass-toggle-menu", { open: true }) }, icon("mdi:menu"));
    this._weatherPill = s.header.weather ? this._weatherEl() : null;
    const edit = h("button", { class: `hp-icon-btn hp-ph-edit ${this.editing ? "on" : ""}`, "aria-label": this.editing ? t("done") : t("edit"),
      onclick: () => { this.editing = !this.editing; this.rerender(); } }, icon(this.editing ? "mdi:check" : "mdi:pencil-outline"));
    const gear = h("button", { class: "hp-icon-btn settings", "aria-label": t("settings"), onclick: () => openSettings(this) }, icon("mdi:cog-outline"));
    const bar = h("div", { class: "hp-ph-bar" }, left, h("div", { class: "hp-ph-right" }, this._weatherPill, edit, gear));

    this._clock = h("div", { class: "hp-clock" });
    this._date = h("div", { class: "hp-date" });
    this._persons = h("div", { class: "hp-persons" });
    let title;
    if (room) title = h("div", { class: "hp-ph-title" }, h("h1", {}, room.name || t("other")));
    else if (this.tab === "home") {
      title = h("div", { class: "hp-ph-title" }, h("div", { class: "hp-ph-home" }, s.header.date ? this._date : null, this._clock), this._persons);
    } else title = h("div", { class: "hp-ph-title" }, h("h1", {}, this.tabLabel(this.tab)));
    hdr.append(bar, title);
    if (this.editing) hdr.append(h("div", { class: "hp-edit-hint" }, t("edit_hint")));
    this._tick(true);
  }

  _weatherEl() {
    const ic = icon("mdi:weather-partly-cloudy");
    const temp = h("b", {});
    const label = h("small", {});
    const el = h("button", { class: "hp-pill", "aria-label": t("weather"), onclick: () => openWeather(this) }, ic, temp, label);
    el.update = () => {
      const c = this.weather?.current();
      el.hidden = !c;
      if (!c) return;
      ic.icon = WEATHER_ICONS[c.condition] || "mdi:weather-partly-cloudy";
      temp.textContent = c.temperature != null ? `${formatNumber(this._hass, c.temperature, 0)}°` : "";
      label.textContent = c.label || "";
    };
    el.update();
    return el;
  }

  /** Avatars of the people at home, with a dot for home or away. */
  _updatePersons() {
    if (!this._persons) return;
    const ids = Object.keys(this._hass.states).filter((id) => id.startsWith("person.")).sort();
    const sig = ids.map((id) => `${id}${this._hass.states[id].state}${this._hass.states[id].attributes.entity_picture || ""}`).join("|");
    if (this._persons.dataset.sig === sig) return;
    this._persons.dataset.sig = sig;
    this._persons.replaceChildren(...ids.slice(0, 5).map((id, i) => {
      const st = this._hass.states[id];
      const name = st.attributes.friendly_name || id;
      const pic = st.attributes.entity_picture;
      const el = h("button", { class: `hp-person ${st.state === "home" ? "home" : ""}`, title: name, "aria-label": name,
        style: pic ? { backgroundImage: `url("${pic}")` } : { background: PERSON_COLORS[i % PERSON_COLORS.length] } }, pic ? "" : name.charAt(0).toUpperCase(), h("i"));
      el.addEventListener("click", () => fireHass(this, "hass-more-info", { entityId: id }));
      return el;
    }));
  }

  _renderDock(tabs) {
    const dock = this._dock;
    dock.replaceChildren();
    const box = h("div", { class: "hp-dock-tabs", dataset: { container: "dock" } });
    for (const key of tabs.items) {
      const b = h("button", { class: `hp-tab ${this.tab === key ? "active" : ""}`, dataset: { key } }, icon(this.tabIcon(key)), h("span", {}, this.tabLabel(key)));
      b.addEventListener("click", () => {
        if (this.editing) return;
        // Tapping a tab (also the current one) goes back to its first screen.
        this.tab = key;
        this.phoneRoom = null;
        this.rerender();
      });
      if (key !== "home") {
        const minus = h("span", { class: "hp-edit-minus", role: "button", "aria-label": t("hide") }, icon("mdi:minus"));
        minus.addEventListener("pointerdown", (e) => e.stopPropagation());
        minus.addEventListener("click", (e) => {
          e.stopPropagation();
          this.settings.hide("dock", key);
        });
        b.append(minus);
      }
      box.append(b);
    }
    sortable(box, { onDrop: (keys) => this.settings.setOrder("dock", keys), axis: "x" });
    dock.append(box);
    if (this.editing && tabs.hidden.length) {
      dock.append(h("button", { class: "hp-chip small", onclick: () => this.openHidden("dock", tabs.hidden, t("navigation")) }, icon("mdi:eye-off-outline"), String(tabs.hidden.length)));
    }
  }

  // ---- clock ----
  _tick(force) {
    if (!this._hass || !this._clock) return;
    const now = new Date();
    const min = now.getMinutes();
    if (force || min !== this._lastMin) {
      this._lastMin = min;
      this._clock.textContent = formatTime(this._hass, now);
      if (this._date) this._date.textContent = formatDate(this._hass, now, { weekday: "long", month: "long", day: "2-digit" });
      for (const c of this.clocks) c.update(this._hass);
      if (!force && min === 0) this.agenda.refresh();
    }
    // Security tablet: back to the first camera page after two minutes without a touch.
    if (this.layout === "security" && this.secPage && this._secIdle++ >= 120 && !this.sheets.size && !this.editing) {
      this.secPage = 0;
      this.rerender();
    }
  }

  _activity() {
    this._secIdle = 0;
  }

}

if (!customElements.get("hauspanel-panel")) customElements.define("hauspanel-panel", HausPanelElement);

/**
 * A rough speed test: frame times for about a second while the panel settles. Few cores or little memory,
 * or under ~35 frames a second, counts as slow.
 */
function measureSpeed() {
  if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 1)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const times = [];
    let last = 0;
    const step = (now) => {
      if (last) times.push(now - last);
      last = now;
      if (times.length < 60) requestAnimationFrame(step);
      else {
        times.sort((a, b) => a - b);
        resolve(times[Math.floor(times.length / 2)] > 28);
      }
    };
    // Wait for the first drawing to finish, then measure.
    setTimeout(() => requestAnimationFrame(step), 1500);
    // A hidden tab gets no frames: then it is not slow, just not looked at.
    setTimeout(() => resolve(false), 6000);
  });
}
