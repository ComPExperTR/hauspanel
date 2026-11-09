// Full player: artwork, progress, shuffle, repeat, volume, speaker choice and favourites.
import { h, icon, supports, slider, entityName } from "./util.js";
import { MEDIA, roundBtn } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";

const fmt = (s) => {
  if (s == null || Number.isNaN(s)) return "–:––";
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const hh = Math.floor(m / 60);
  const ss = String(s % 60).padStart(2, "0");
  return hh ? `${hh}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

function position(st) {
  const a = st.attributes;
  if (a.media_position == null) return null;
  let p = a.media_position;
  if (st.state === "playing" && a.media_position_updated_at) p += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000;
  return Math.min(p, a.media_duration ?? p);
}

/** The player itself; used in the sheet and on the Media page. */
export function playerView(ctx, entityId, { compact = false } = {}) {
  const call = (svc, data = {}) => ctx.hass.callService("media_player", svc, { entity_id: entityId, ...data });
  const art = h("div", { class: "hp-player-art" }, icon("mdi:music-note", "hp-player-noart"));
  const title = h("div", { class: "hp-player-title" });
  const artist = h("div", { class: "hp-player-artist" });
  const cur = h("small", {});
  const dur = h("small", {});
  const prog = slider({ value: 0, min: 0, max: 100, cls: "progress", label: t("position"), onChange: (v) => {
    const st = ctx.hass.states[entityId];
    if (supports(st, MEDIA.SEEK) && st.attributes.media_duration) call("media_seek", { seek_position: (v / 100) * st.attributes.media_duration });
  } });
  const shuffle = roundBtn("mdi:shuffle-variant", t("shuffle"), () => call("shuffle_set", { shuffle: !ctx.hass.states[entityId].attributes.shuffle }), "ghost");
  const repeat = roundBtn("mdi:repeat", t("repeat"), () => {
    const r = ctx.hass.states[entityId].attributes.repeat;
    call("repeat_set", { repeat: r === "off" ? "all" : r === "all" ? "one" : "off" });
  }, "ghost");
  const play = roundBtn("mdi:play", t("play_pause"), () => call("media_play_pause"), "main big");
  const prev = roundBtn("mdi:skip-previous", t("previous"), () => call("media_previous_track"));
  const next = roundBtn("mdi:skip-next", t("next"), () => call("media_next_track"));
  const power = roundBtn("mdi:power", t("power"), () => {
    const st = ctx.hass.states[entityId];
    call(st.state === "off" || st.state === "standby" ? "turn_on" : "turn_off");
  }, "ghost");
  const mute = roundBtn("mdi:volume-high", t("mute"), () => call("volume_mute", { is_volume_muted: !ctx.hass.states[entityId].attributes.is_volume_muted }), "ghost");
  const vol = slider({ value: 0, cls: "volume", label: t("volume"), onChange: (v) => call("volume_set", { volume_level: v / 100 }) });
  const source = h("select", { class: "hp-select" });
  source.addEventListener("change", () => call("select_source", { source: source.value }));
  const browse = h("div", { class: "hp-browse" });

  const el = h("div", { class: `hp-player ${compact ? "compact" : ""}` },
    art,
    h("div", { class: "hp-player-main" },
      h("div", { class: "hp-player-meta" }, title, artist),
      h("div", { class: "hp-player-progress" }, prog, h("div", { class: "hp-player-times" }, cur, dur)),
      h("div", { class: "hp-player-btns" }, shuffle, prev, play, next, repeat),
      h("div", { class: "hp-vol" }, mute, vol, power),
      h("div", { class: "hp-player-source" }, icon("mdi:speaker-multiple"), source)),
    compact ? null : browse);

  let last = null;
  el.update = (hass) => {
    const st = hass.states[entityId];
    if (!st) return;
    const a = st.attributes;
    if (st !== last) {
      last = st;
      const pic = a.entity_picture_local || a.entity_picture;
      art.style.backgroundImage = pic ? `url("${pic}")` : "";
      art.classList.toggle("has-art", !!pic);
      el.style.setProperty("--hp-art", pic ? `url("${pic}")` : "none");
      title.textContent = a.media_title || (st.state === "off" ? t("off") : entityName(hass, entityId));
      artist.textContent = [a.media_artist, a.media_album_name].filter(Boolean).join(" · ") || a.app_name || hass.formatEntityState?.(st) || st.state;
      play.querySelector("ha-icon").icon = st.state === "playing" ? "mdi:pause" : "mdi:play";
      shuffle.hidden = !supports(st, MEDIA.SHUFFLE);
      shuffle.classList.toggle("active", !!a.shuffle);
      repeat.hidden = !supports(st, MEDIA.REPEAT);
      repeat.classList.toggle("active", a.repeat && a.repeat !== "off");
      repeat.querySelector("ha-icon").icon = a.repeat === "one" ? "mdi:repeat-once" : "mdi:repeat";
      prev.hidden = !supports(st, MEDIA.PREVIOUS);
      next.hidden = !supports(st, MEDIA.NEXT);
      power.hidden = !supports(st, MEDIA.TURN_ON) && !supports(st, MEDIA.TURN_OFF);
      mute.hidden = !supports(st, MEDIA.VOLUME_MUTE);
      mute.querySelector("ha-icon").icon = a.is_volume_muted ? "mdi:volume-off" : "mdi:volume-high";
      vol.hidden = !supports(st, MEDIA.VOLUME_SET);
      vol.update(Math.round((a.volume_level ?? 0) * 100));
      const list = a.source_list || [];
      source.parentElement.hidden = !supports(st, MEDIA.SELECT_SOURCE) || !list.length;
      if (source.dataset.list !== list.join("|")) {
        source.dataset.list = list.join("|");
        source.replaceChildren(...list.map((s) => h("option", { value: s }, s)));
      }
      if (a.source) source.value = a.source;
    }
    const p = position(st);
    const d = a.media_duration;
    el.querySelector(".hp-player-progress").hidden = p == null || !d;
    if (p != null && d) {
      prog.update((p / d) * 100);
      cur.textContent = fmt(p);
      dur.textContent = fmt(d);
    }
  };
  el.update(ctx.hass);
  const tick = setInterval(() => {
    if (!el.isConnected) return clearInterval(tick);
    el.update(ctx.hass);
  }, 1000);

  // Speakers with a Music Assistant twin get its playlists instead (HA's media browser shows cameras and pictures there).
  if (!compact && supports(ctx.hass.states[entityId], MEDIA.BROWSE) && !maPlayerFor(ctx.hass, entityId)) loadBrowse(ctx, entityId, browse);
  return el;
}

async function loadBrowse(ctx, entityId, box, node) {
  box.replaceChildren(h("div", { class: "hp-muted" }, t("loading")));
  try {
    const res = await ctx.hass.callWS({
      type: "media_player/browse_media",
      entity_id: entityId,
      ...(node ? { media_content_id: node.media_content_id, media_content_type: node.media_content_type } : {}),
    });
    box.replaceChildren(
      h("div", { class: "hp-group-label" },
        node ? h("button", { class: "hp-chip small", onclick: () => loadBrowse(ctx, entityId, box) }, icon("mdi:arrow-left"), t("back")) : null,
        node ? res.title : t("favorites")));
    const grid = h("div", { class: "hp-browse-grid" });
    for (const c of (res.children || []).slice(0, 40)) {
      const item = h("button", { class: "hp-browse-item" },
        h("div", { class: "hp-browse-thumb", style: c.thumbnail ? { backgroundImage: `url("${c.thumbnail}")` } : {} },
          c.thumbnail ? null : icon(c.can_expand ? "mdi:folder-music-outline" : "mdi:music")),
        h("span", {}, c.title));
      item.addEventListener("click", () => {
        if (c.can_play) {
          ctx.hass.callService("media_player", "play_media", { entity_id: entityId, media_content_id: c.media_content_id, media_content_type: c.media_content_type });
        } else if (c.can_expand) loadBrowse(ctx, entityId, box, c);
      });
      grid.append(item);
    }
    box.append(grid);
  } catch (e) {
    box.replaceChildren();
  }
}

export function openPlayer(ctx, entityId) {
  const st = ctx.hass.states[entityId];
  if (!st) return;
  const area = ctx.model.areaById.get(ctx.model.areaOf[entityId])?.name;
  const view = playerView(ctx, entityId);
  const sheet = openSheet(ctx, { title: entityName(ctx.hass, entityId, area), subtitle: area, cls: "tall player" });
  // The cover, big and blurred, behind the whole popup.
  const glow = h("div", { class: "hp-player-glow" });
  sheet.el.prepend(glow);
  sheet.el.classList.add("has-glow");
  const paintGlow = (hass) => {
    const a = hass.states[entityId]?.attributes || {};
    const pic = a.entity_picture_local || a.entity_picture;
    const url = pic ? `url("${pic}")` : "";
    if (glow.dataset.url !== url) {
      glow.dataset.url = url;
      glow.style.backgroundImage = url;
      glow.classList.toggle("on", !!pic);
    }
  };
  paintGlow(ctx.hass);
  sheet.body.append(view);
  sheet.updaters.push((hass) => { view.update(hass); paintGlow(hass); });
  const rooms = roomsBlock(ctx, entityId);
  if (rooms) {
    sheet.body.append(rooms);
    sheet.updaters.push((hass) => rooms.update(hass));
  }
  const lists = playlistPicker(ctx, entityId);
  if (lists) sheet.body.append(lists);
}

const GROUPING = 524288;

/**
 * Other speakers: join them to this one (Music Assistant groups) and set each room's volume.
 * Only speakers that can be grouped with this one, and that are reachable.
 */
function roomsBlock(ctx, entityId) {
  const hass = ctx.hass;
  const lead = maPlayerFor(hass, entityId) || entityId;
  const st = hass.states[lead];
  if (!st || !(st.attributes.supported_features & GROUPING)) return null;
  const leadPlatform = hass.entities?.[lead]?.platform;
  const others = () => Object.keys(ctx.hass.states).filter((id) => id.startsWith("media_player.") && id !== lead
    && hass.entities?.[id]?.platform === leadPlatform && !hass.entities?.[id]?.hidden
    && (ctx.hass.states[id].attributes.supported_features & GROUPING) && ctx.hass.states[id].state !== "unavailable"
    && !/tv|oled|hisense|macbook|apple_tv|denon/i.test(id));
  const list = h("div", { class: "hp-rooms-list" });
  const box = h("div", { class: "hp-player-rooms" }, h("div", { class: "hp-label" }, icon("mdi:speaker-multiple"), t("pl_rooms")), list);
  const rows = new Map();
  const row = (id) => {
    const name = h("b", {}, ctx.hass.states[id].attributes.friendly_name || id);
    const sub = h("small", {});
    const join = h("button", { class: "hp-chip" });
    join.addEventListener("click", () => {
      const members = ctx.hass.states[lead].attributes.group_members || [];
      if (members.includes(id)) ctx.hass.callService("media_player", "unjoin", { entity_id: id });
      else ctx.hass.callService("media_player", "join", { entity_id: lead, group_members: [id] });
    });
    const vol = slider({ value: 0, cls: "volume", label: t("volume"), onChange: (v) => ctx.hass.callService("media_player", "volume_set", { entity_id: id, volume_level: v / 100 }) });
    const el = h("div", { class: "hp-room-spk" }, h("div", { class: "hp-room-spk-top" }, icon("mdi:speaker"), h("div", { class: "txt" }, name, sub), join), vol);
    el.update = (hs) => {
      const s = hs.states[id];
      if (!s) return;
      const inGroup = (hs.states[lead].attributes.group_members || []).includes(id);
      el.classList.toggle("joined", inGroup);
      join.textContent = inGroup ? t("pl_leave") : t("pl_join");
      sub.textContent = s.state === "playing" ? [s.attributes.media_title, s.attributes.media_artist].filter(Boolean).join(" · ") || t("pl_playing") : hs.formatEntityState?.(s) || s.state;
      vol.update(Math.round((s.attributes.volume_level ?? 0) * 100));
    };
    return el;
  };
  box.update = (hs) => {
    const ids = others();
    for (const id of ids) if (!rows.has(id)) rows.set(id, row(id));
    const want = ids.map((id) => rows.get(id));
    if (list.children.length !== want.length || want.some((r, i) => list.children[i] !== r)) list.replaceChildren(...want);
    want.forEach((r) => r.update(hs));
    box.hidden = !ids.length;
  };
  box.update(hass);
  return box;
}

// ---- Playlists from Music Assistant (Spotify and the rest), played on the speaker's Music Assistant twin

/** The Music Assistant player for a speaker: itself, or the one with the same name (HomePod via AirPlay). */
export function maPlayerFor(hass, entityId) {
  const ent = hass.entities || {};
  if (ent[entityId]?.platform === "music_assistant") return entityId;
  const name = hass.states[entityId]?.attributes.friendly_name;
  if (!name) return null;
  const twins = Object.values(ent).filter((e) => e.platform === "music_assistant" && e.entity_id.startsWith("media_player.")
    && hass.states[e.entity_id]?.attributes.friendly_name === name);
  return (twins.find((e) => hass.states[e.entity_id].state !== "unavailable") || twins[0])?.entity_id || null;
}

let maEntry = null;
async function maEntryId(hass) {
  if (maEntry) return maEntry;
  const entries = await hass.callWS({ type: "config_entries/get", domain: "music_assistant" });
  maEntry = entries.find((e) => e.state === "loaded")?.entry_id || null;
  return maEntry;
}

/** Playlists anywhere in Music Assistant's sources (Spotify), for the search field. */
async function searchPlaylists(hass, query) {
  const entry = await maEntryId(hass);
  if (!entry) return [];
  const r = await hass.connection.sendMessagePromise({
    type: "call_service", domain: "music_assistant", service: "search",
    service_data: { config_entry_id: entry, name: query, media_type: ["playlist"], limit: 24 },
    return_response: true,
  });
  return r?.response?.playlists || [];
}

async function loadPlaylists(hass) {
  const entry = await maEntryId(hass);
  if (!entry) return [];
  const r = await hass.connection.sendMessagePromise({
    type: "call_service", domain: "music_assistant", service: "get_library",
    service_data: { config_entry_id: entry, media_type: "playlist", limit: 200, order_by: "name" },
    return_response: true,
  });
  return r?.response?.items || [];
}

function playlistPicker(ctx, entityId) {
  const twin = maPlayerFor(ctx.hass, entityId);
  if (!twin) return null;
  const grid = h("div", { class: "hp-pl-grid" }, h("div", { class: "hp-muted small" }, t("loading")));
  const search = h("input", { class: "hp-input hp-pl-search", type: "search", placeholder: t("search_playlists") });
  let items = [];
  let found = [];
  let seq = 0;
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const mine = items.filter((p) => !q || p.name.toLowerCase().includes(q));
    const uris = new Set(mine.map((p) => p.uri));
    const shown = [...mine, ...(q ? found.filter((p) => !uris.has(p.uri)) : [])];
    grid.replaceChildren(...shown.map((p) => {
      const b = h("button", { class: "hp-pl" }, h("span", { class: "hp-pl-ic" }, icon(/^spotify/.test(p.uri) ? "mdi:spotify" : "mdi:playlist-music")), h("span", { class: "hp-pl-name" }, p.name));
      b.addEventListener("click", async () => {
        grid.querySelectorAll(".hp-pl.playing").forEach((x) => x.classList.remove("playing"));
        b.classList.add("playing");
        try {
          await ctx.hass.callService("music_assistant", "play_media", { media_id: p.uri, media_type: "playlist", enqueue: "replace" }, { entity_id: twin });
          ctx.toast(t("playing_x", { name: p.name }));
        } catch (e) {
          b.classList.remove("playing");
          ctx.toast(t("play_failed"));
        }
      });
      return b;
    }));
    if (!shown.length) grid.append(h("div", { class: "hp-muted small" }, t(items.length ? "nothing_found" : "no_playlists")));
  };
  // Typing also searches Spotify (and the other sources), after a short pause.
  let timer = null;
  search.addEventListener("input", () => {
    draw();
    clearTimeout(timer);
    const q = search.value.trim();
    found = [];
    if (q.length < 3) return;
    const my = ++seq;
    timer = setTimeout(() => searchPlaylists(ctx.hass, q).then((list) => {
      if (my !== seq) return;
      found = list;
      draw();
    }).catch(() => {}), 450);
  });
  loadPlaylists(ctx.hass).then((list) => {
    // Your own playlists (Spotify) first, then Music Assistant's generated ones.
    const own = (p) => !p.uri.startsWith("library://") || !/random|infinite|favorit|zufall/i.test(p.name);
    items = [...list.filter(own), ...list.filter((p) => !own(p))];
    draw();
  }).catch(() => grid.replaceChildren(h("div", { class: "hp-muted small" }, t("no_playlists"))));
  return h("div", { class: "hp-pl-block" },
    h("div", { class: "hp-pl-head" }, h("div", { class: "hp-label" }, icon("mdi:playlist-music"), t("playlists")), search),
    grid);
}
