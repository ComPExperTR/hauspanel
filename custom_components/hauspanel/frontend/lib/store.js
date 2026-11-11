// Settings shared by every screen (kept in Home Assistant) and choices each device remembers.
import { debounce, uid } from "./util.js";

export const DEFAULT_SETTINGS = {
  containers: {},
  sizes: {},
  pages: [],
  calendars: null, // null = all calendars
  todos: null, // null = all lists
  weather: null, // null = first weather entity
  look: {
    cardColor: "snow",
    accent: "sea",
    background: "ember",
    followLights: true,
    corners: "soft",
    frame: true,
    glass: true,
  },
  header: { date: true, weather: true, agenda: true },
  todayCard: true,
  side: { weather: true, agenda: true, status: true, rooms: false }, // left panel of the Sidebar layout
  // Hidden everywhere in HausPanel: single entities, device types, integrations and text rules.
  hide: { entities: [], domains: [], platforms: [], patterns: [] },
};

/**
 * Settings about the house rather than the screen: what is hidden, when doors may be open, which cameras
 * the Security page shows, doorbell, baby monitor, calendars and weather … Copying "the house" from
 * another panel takes these; looks, order and the Home screen stay as they are.
 */
export const HOUSE_KEYS = ["hide", "secAllow", "doorbell", "baby", "calendars", "todos", "weather", "meters", "maintIgnore", "nightCheck", "sceneConfirm", "energyPick", "notices", "parcels"];
const houseContainer = (k) => k.startsWith("security:");

/** The settings after taking `from` (another panel's) into `to`: "house" or "all". Neither is changed. */
export function takeSettings(to, from, mode = "house") {
  const c = (o) => JSON.parse(JSON.stringify(o ?? null));
  if (mode === "all") return c(from);
  const out = c(to);
  for (const k of HOUSE_KEYS) {
    if (from[k] === undefined) delete out[k];
    else out[k] = c(from[k]);
  }
  const conts = { ...(out.containers || {}) };
  for (const k of Object.keys(conts)) if (houseContainer(k)) delete conts[k];
  for (const [k, v] of Object.entries(from.containers || {})) if (houseContainer(k)) conts[k] = c(v);
  out.containers = conts;
  return out;
}

const defaultSize = (key) => (key.startsWith("camera.") ? 2 : key === "card:today" ? "w" : 1);

export const DEFAULT_DEVICE = {
  layout: "grid",
  tileSize: "auto", // auto = fill the screen; s, c (compact), m, l = fixed size
  tileHeight: "normal", // normal, low, lower (with a fixed tile size)
  hideSidebar: false,
  camsPerPage: 6, // Security layout
};

const DEVICE_KEY = "hauspanel.device";

const clone = (o) => JSON.parse(JSON.stringify(o));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

/** What changed between two settings objects, as [path, value] (value undefined = removed), down to 3 levels. */
function diff(a, b, path = [], out = []) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const x = a?.[k];
    const y = b?.[k];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (isObj(x) && isObj(y) && path.length < 2) diff(x, y, [...path, k], out);
    else out.push([[...path, k], y === undefined ? undefined : clone(y)]);
  }
  return out;
}

/** Put the changes onto (a copy of) other settings. */
function applyOps(base, ops) {
  const out = clone(base || {});
  for (const [path, v] of ops) {
    let o = out;
    for (const k of path.slice(0, -1)) {
      if (!isObj(o[k])) o[k] = {};
      o = o[k];
    }
    const last = path[path.length - 1];
    if (v === undefined) delete o[last];
    else o[last] = clone(v);
  }
  return out;
}

function merge(base, over) {
  const out = clone(base);
  for (const [k, v] of Object.entries(over || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
      out[k] = { ...out[k], ...v };
    } else out[k] = v;
  }
  return out;
}

export class Settings {
  constructor(onChange) {
    this.onChange = onChange;
    this.s = clone(DEFAULT_SETTINGS);
    this.panel = "hauspanel";
    this.device = this._loadDevice();
    this.hass = null;
    this.loaded = false;
    this._saveSoon = debounce(() => this._save(), 400);
    this._pendingSave = false;
    this._ops = [];
  }

  /** Each sidebar entry (HausPanel, MobilePanel, SecurityPanel) has its own settings. */
  _msg(type, extra = {}) {
    // HausPanel leaves the panel out, so it also works with an older backend.
    return this.panel === "hauspanel" ? { type, ...extra } : { type, panel: this.panel, ...extra };
  }

  async load(hass, panel = "hauspanel") {
    this.hass = hass;
    this.panel = panel;
    this.device = this._loadDevice();
    try {
      const res = await hass.callWS(this._msg("hauspanel/settings/get"));
      this.s = merge(DEFAULT_SETTINGS, res.settings);
      this.personal = !!res.personal;
    } catch (e) {
      console.warn("HausPanel: could not load settings", e);
    }
    this.loaded = true;
    try {
      this._unsub = await hass.connection.subscribeMessage(
        (msg) => {
          // Our own save comes back too; skip it while edits are still queued.
          if (this._pendingSave) return;
          this.s = merge(DEFAULT_SETTINGS, msg.settings);
          this.onChange("remote");
        },
        this._msg("hauspanel/settings/subscribe")
      );
    } catch (e) {
      console.warn("HausPanel: live settings not available", e);
    }
    // After the phone or tablet was asleep, changes made elsewhere were missed: fetch them again.
    if (!this._onReady) {
      this._onReady = () => this._refresh();
      hass.connection.addEventListener?.("ready", this._onReady);
    }
  }

  async _refresh() {
    if (this._pendingSave || !this.hass) return;
    try {
      const res = await this.hass.callWS(this._msg("hauspanel/settings/get"));
      if (this._pendingSave) return;
      this.s = merge(DEFAULT_SETTINGS, res.settings);
      this.personal = !!res.personal;
      this.onChange("remote");
    } catch { /* stays as it is */ }
  }

  /** Own settings for this user on this panel (on), or the ones everybody shares (off). */
  async setPersonal(enabled) {
    const res = await this.hass.callWS(this._msg("hauspanel/settings/personal", { enabled }));
    this.s = merge(DEFAULT_SETTINGS, res.settings);
    this.personal = !!res.personal;
    this.onChange("remote");
  }

  disconnect() {
    if (this._onReady) this.hass?.connection.removeEventListener?.("ready", this._onReady);
    this._onReady = null;
    this._unsub?.();
    this._unsub = undefined;
  }

  /**
   * Saves only what changed here, on top of what is stored now. So a screen that slept with old settings
   * (or another screen saving at the same time) cannot wipe out changes made elsewhere.
   */
  async _save() {
    const ops = this._ops;
    this._ops = [];
    if (!ops.length) {
      this._pendingSave = false;
      return;
    }
    try {
      let latest = null;
      try {
        latest = (await this.hass.callWS(this._msg("hauspanel/settings/get"))).settings;
      } catch { latest = null; }
      const next = latest ? applyOps(latest, ops) : this.s;
      await this.hass.callWS(this._msg("hauspanel/settings/save", { settings: next }));
      if (latest) {
        const changedElsewhere = JSON.stringify(merge(DEFAULT_SETTINGS, next)) !== JSON.stringify(this.s);
        // Edits made while saving stay on top.
        this.s = merge(DEFAULT_SETTINGS, applyOps(next, this._ops));
        if (changedElsewhere) this.onChange("remote");
      }
    } catch (e) {
      console.error("HausPanel: could not save settings", e);
    }
    if (this._ops.length) this._saveSoon();
    else this._pendingSave = false;
  }

  /** Change shared settings: update(s => { s.look.accent = "teal" }). */
  update(fn, reason = "settings") {
    const before = clone(this.s);
    fn(this.s);
    this._ops.push(...diff(before, this.s));
    this._pendingSave = true;
    this._saveSoon();
    this.onChange(reason);
  }

  get _deviceKey() {
    return this.panel === "hauspanel" ? DEVICE_KEY : `${DEVICE_KEY}.${this.panel}`;
  }

  /** This device's choices for this panel; a new panel starts from what HausPanel uses here. */
  _loadDevice() {
    try {
      const own = localStorage.getItem(this._deviceKey);
      return { ...DEFAULT_DEVICE, ...JSON.parse(own ?? localStorage.getItem(DEVICE_KEY) ?? "{}") };
    } catch {
      return { ...DEFAULT_DEVICE };
    }
  }

  setDevice(key, value) {
    this.device[key] = value;
    try {
      localStorage.setItem(this._deviceKey, JSON.stringify(this.device));
    } catch {
      /* private mode: keep it for this visit only */
    }
    this.onChange("device");
  }

  // ---- arrangement of a container (room, page, scene strip, dock) ----

  cont(id) {
    return this.s.containers[id] || {};
  }

  _cont(s, id) {
    if (!s.containers[id]) s.containers[id] = {};
    const c = s.containers[id];
    c.order ||= [];
    c.hidden ||= [];
    c.added ||= [];
    c.seps ||= {};
    return c;
  }

  /**
   * Visible keys in order, plus the hidden ones. `exists(key)` filters out vanished entities.
   * `sort` gives the default order while nothing has been arranged by hand.
   */
  arrange(id, autoItems, exists = () => true, sort = null) {
    const c = this.cont(id);
    const hidden = new Set(c.hidden || []);
    const seps = c.seps || {};
    const candidates = new Set([...autoItems, ...(c.added || [])].filter(exists));
    for (const k of Object.keys(seps)) candidates.add(k);
    const out = [];
    const used = new Set();
    for (const k of c.order || []) {
      if (candidates.has(k) && !hidden.has(k) && !used.has(k)) {
        out.push(k);
        used.add(k);
      }
    }
    for (const k of candidates) {
      if (!used.has(k) && !hidden.has(k)) out.push(k);
    }
    const items = sort && !(c.order || []).length ? sort(out) : out;
    return { items, hidden: [...hidden].filter((k) => candidates.has(k)) };
  }

  /** Back to the default order (hidden and added items stay as they are). */
  resetOrder(id) {
    this.update((s) => {
      if (s.containers[id]) s.containers[id].order = [];
    }, "order");
  }

  setOrder(id, keys) {
    this.update((s) => {
      this._cont(s, id).order = keys;
    }, "order");
  }

  hide(id, key) {
    this.update((s) => {
      const c = this._cont(s, id);
      if (key.startsWith("sep:")) {
        delete c.seps[key];
        c.order = c.order.filter((k) => k !== key);
      } else if (c.added.includes(key)) {
        c.added = c.added.filter((k) => k !== key);
      } else if (!c.hidden.includes(key)) c.hidden.push(key);
    });
  }

  unhide(id, key) {
    this.update((s) => {
      const c = this._cont(s, id);
      c.hidden = c.hidden.filter((k) => k !== key);
      // A camera hidden earlier in its room's security group comes back too.
      if (id === "security:cameras") {
        for (const [k, other] of Object.entries(s.containers || {})) {
          if (k.startsWith("security:") && other.hidden?.includes(key)) other.hidden = other.hidden.filter((x) => x !== key);
        }
      }
    });
  }

  add(id, key, autoItems = []) {
    this.update((s) => {
      const c = this._cont(s, id);
      if (c.hidden.includes(key)) c.hidden = c.hidden.filter((k) => k !== key);
      else if (!autoItems.includes(key) && !c.added.includes(key)) c.added.push(key);
      c.order = c.order.filter((k) => k !== key);
      c.order.push(key);
    });
  }

  addSeparator(id, title, currentOrder) {
    const key = `sep:${uid()}`;
    this.update((s) => {
      const c = this._cont(s, id);
      c.seps[key] = title;
      c.order = [...(currentOrder || c.order), key];
    });
    return key;
  }

  renameSeparator(id, key, title) {
    this.update((s) => {
      this._cont(s, id).seps[key] = title;
    });
  }

  sepTitle(id, key) {
    return this.cont(id).seps?.[key] ?? "";
  }

  /** Cameras start wide so the picture is worth looking at. */
  /** 1 = normal, "w" = wide (2×1), 2 = big (2×2). */
  size(key) {
    return this.s.sizes[key] || defaultSize(key);
  }

  /** Edit mode resize button: normal → wide → big → normal. */
  cycleSize(key) {
    const order = [1, "w", 2];
    const next = order[(order.indexOf(this.size(key)) + 1) % order.length];
    this.update((s) => {
      if (next === defaultSize(key)) delete s.sizes[key];
      else s.sizes[key] = next;
    });
  }

  /** A socket shown as "meter only" (watts and usage, no switching) or as a normal switch. */
  toggleMeter(key) {
    this.update((s) => {
      s.meters = { ...(s.meters || {}) };
      if (s.meters[key]) delete s.meters[key];
      else s.meters[key] = true;
    });
  }

  toggleSize(key) {
    this.cycleSize(key);
  }

  // ---- own pages ----

  addPage(title, iconName) {
    const id = uid();
    this.update((s) => {
      s.pages.push({ id, title, icon: iconName || "mdi:star-outline" });
    });
    return id;
  }

  removePage(id) {
    this.update((s) => {
      s.pages = s.pages.filter((p) => p.id !== id);
      delete s.containers[`page:${id}`];
    });
  }

  renamePage(id, title, iconName) {
    this.update((s) => {
      const p = s.pages.find((x) => x.id === id);
      if (p) {
        p.title = title;
        if (iconName) p.icon = iconName;
      }
    });
  }
}
