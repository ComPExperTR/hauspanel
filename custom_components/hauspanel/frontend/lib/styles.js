// All styles of the panel (inside its shadow root).
export const STYLES = `
:host { display: block; height: 100%; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; -webkit-tap-highlight-color: transparent; }
button:focus-visible, [tabindex]:focus-visible { outline: 2px solid var(--hp-accent); outline-offset: 2px; }
[hidden] { display: none !important; }
ha-icon.hp-ic { --mdc-icon-size: 20px; display: inline-flex; flex: none; }

.hp-root {
  --hp-text: #f7efe9; --hp-sub: rgba(247,239,233,.62); --hp-faint: rgba(247,239,233,.42);
  --hp-glass: rgba(255,255,255,.075); --hp-glass-2: rgba(255,255,255,.13); --hp-border: rgba(255,255,255,.13);
  --hp-sheet: #1e1a1f; --hp-red: #ef5f67; --hp-green: #5cc879;
  --hp-gap: 12px; --hp-tile-min: 150px; --hp-tile-h: 112px;
  position: relative; height: 100vh; height: 100dvh; overflow: hidden; color: var(--hp-text);
  font-family: "HP Outfit", "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: grid; grid-template-rows: auto minmax(0, 1fr); grid-template-columns: minmax(0, 1fr); container-type: inline-size;
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none; background: #2d1b29;
}
.hp-root.light-bg { --hp-text: #2b2125; --hp-sub: rgba(43,33,37,.6); --hp-faint: rgba(43,33,37,.4); --hp-glass: rgba(255,255,255,.45); --hp-glass-2: rgba(255,255,255,.7); --hp-border: rgba(0,0,0,.08); }
.hp-bg-base, .hp-bg-glow { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.hp-bg-glow { transition: opacity 1.4s ease; }
.hp-header, .hp-main, .hp-dock, .hp-fab { position: relative; z-index: 1; }
.hp-loading { position: absolute; inset: 0; display: grid; place-content: center; gap: 12px; justify-items: center; color: var(--hp-sub); z-index: 2; }
.hp-loading ha-icon { --mdc-icon-size: 40px; color: var(--hp-accent); }

/* small caps labels, used everywhere */
.hp-label { font-size: 11.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); display: flex; align-items: center; gap: 8px; }
.hp-count { min-width: 18px; height: 18px; border-radius: 9px; padding: 0 5px; font-size: 11px; font-weight: 600; letter-spacing: 0; display: inline-grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-text); }

/* ---------- header ---------- */
.hp-header { display: flex; align-items: flex-start; gap: 14px; padding: max(22px, env(safe-area-inset-top)) 28px 6px; }
.hp-head-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.hp-head-row { display: flex; align-items: center; gap: 10px; }
.hp-date { font-size: 12px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--hp-sub); white-space: nowrap; }
.hp-clock { font-size: 46px; font-weight: 400; letter-spacing: -.01em; line-height: 1.05; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hp-edit-hint { font-size: 12.5px; color: var(--hp-sub); margin-top: 2px; }
.hp-head-right { display: flex; gap: 10px; align-items: center; margin-left: auto; padding-top: 14px; }
.hp-icon-btn { position: relative; width: 38px; height: 38px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--hp-glass); border: 1px solid var(--hp-border); flex: none; transition: transform .1s, background .2s; }
.hp-icon-btn:active { transform: scale(.93); }
.hp-icon-btn ha-icon { --mdc-icon-size: 18px; }
.hp-badge { position: absolute; top: -3px; right: -3px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; font-size: 10px; font-weight: 700; display: grid; place-items: center; background: var(--hp-accent); color: #2b2125; }
.hp-badge.red { background: var(--hp-red); color: #fff; }
.hp-badge:empty { display: none; }
.hp-pill { height: 38px; padding: 0 14px 0 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; background: var(--hp-glass); border: 1px solid var(--hp-border); font-size: 14px; font-weight: 500; white-space: nowrap; flex: none; }
.hp-pill b { font-size: 17px; font-weight: 500; }
.hp-pill small { color: var(--hp-sub); font-size: 13px; }
.hp-pill ha-icon { --mdc-icon-size: 20px; }
.hp-persons { display: flex; padding-left: 8px; }
.hp-person { position: relative; width: 36px; height: 36px; border-radius: 50%; margin-left: -8px; display: grid; place-items: center; font-size: 13px; font-weight: 600; color: #2b2125; border: 2px solid rgba(60,35,52,.9); background-size: cover; background-position: center; }
.hp-person i { position: absolute; right: -2px; bottom: -2px; width: 11px; height: 11px; border-radius: 50%; background: #8a8288; border: 2px solid rgba(60,35,52,.95); }
.hp-person.home i { background: var(--hp-green); }
.layout-sidebar .hp-head-left { display: none; }
.layout-focus.tab-home .hp-head-left, .layout-focus.tab-home .hp-head-right > :not(.settings) { display: none; }

/* ---------- main, dock, edit button ---------- */
.hp-main { overflow: hidden; min-height: 0; }
.hp-layout { height: 100%; overflow-y: auto; overflow-x: hidden; padding: 8px 28px 110px; scrollbar-width: none; }
.hp-layout::-webkit-scrollbar { display: none; }
.hp-dock { position: absolute; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; z-index: 5; max-width: calc(100% - 270px); }
.hp-dock-tabs { display: flex; gap: 2px; padding: 4px; border-radius: 999px; background: rgba(70,45,62,.55); border: 1px solid var(--hp-border);
  backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); box-shadow: 0 10px 30px rgba(20,8,16,.35); overflow-x: auto; scrollbar-width: none; }
.hp-tab { position: relative; display: flex; align-items: center; gap: 7px; height: 36px; padding: 0 16px; border-radius: 999px; color: var(--hp-text); opacity: .82; font-size: 13.5px; font-weight: 500; white-space: nowrap; transition: background .2s, color .2s, opacity .2s; }
.hp-tab ha-icon { --mdc-icon-size: 17px; }
.hp-tab.active { background: #f7f1ea; color: #2b2125; opacity: 1; }
.hp-fab { position: absolute; right: 22px; bottom: max(14px, env(safe-area-inset-bottom)); z-index: 5; height: 44px; padding: 0 18px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px;
  background: rgba(70,45,62,.55); border: 1px solid var(--hp-border); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); font-size: 14px; font-weight: 500; box-shadow: 0 10px 30px rgba(20,8,16,.35); }
.hp-fab ha-icon { --mdc-icon-size: 17px; }
.editing .hp-fab { background: #f7f1ea; color: #2b2125; }

/* ---------- status, scenes, section labels ---------- */
.hp-status { display: flex; align-items: flex-end; gap: 16px; margin: 10px 0 18px; flex-wrap: wrap; }
.hp-status-text { flex: 1; min-width: 0; }
.hp-status-big { font-size: 28px; font-weight: 400; margin-top: 6px; letter-spacing: -.005em; }
.hp-status-btns { display: flex; gap: 8px; }
.hp-btn { height: 36px; padding: 0 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 500; background: var(--hp-glass); border: 1px solid var(--hp-border); white-space: nowrap; }
.hp-btn ha-icon { --mdc-icon-size: 16px; }
.hp-btn.solid { background: #f7f1ea; color: #2b2125; border-color: transparent; }
.hp-btn.primary { background: var(--hp-accent); color: #2b2125; border-color: transparent; }
.hp-btn.danger { background: var(--hp-red); color: #fff; border-color: transparent; }
.hp-btn.ghost { background: transparent; }
.hp-scenes-block { margin-bottom: 18px; }
.hp-scenes-block .hp-label { margin-bottom: 10px; }
.hp-scenes-wrap { display: flex; gap: 8px; align-items: center; }
.hp-scenes { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px; min-width: 0; }
.hp-scenes::-webkit-scrollbar { display: none; }
.hp-scene { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px 0 13px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); font-size: 13.5px; font-weight: 500; white-space: nowrap; cursor: pointer; transition: background .3s, transform .1s; flex: none; }
.hp-scene ha-icon { --mdc-icon-size: 16px; opacity: .85; }
.hp-scene:active { transform: scale(.96); }
.hp-scene.flash { background: var(--hp-lit); color: var(--hp-lit-text); }
@keyframes hp-armed { from { filter: brightness(1); } to { filter: brightness(1.15); } }
.hp-scene .hp-edit-minus { top: -6px; left: -6px; }

.hp-room-head { display: flex; align-items: flex-end; gap: 14px; margin: 4px 0 16px; flex-wrap: wrap; }
.hp-room-head > div:first-child { flex: 1; min-width: 0; }
.hp-room-title { font-size: 30px; font-weight: 400; letter-spacing: -.01em; margin-top: 4px; display: flex; align-items: center; gap: 12px; }
.hp-room-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.hp-room-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--hp-sub); padding: 3px 10px; border-radius: 999px; background: var(--hp-glass); font-variant-numeric: tabular-nums; }
.hp-room-chip ha-icon { --mdc-icon-size: 14px; }
.hp-groups { display: flex; flex-direction: column; gap: 26px; }
.hp-group-head { display: flex; align-items: center; gap: 10px; margin: 6px 2px 12px; }
.hp-group-title { font-size: 21px; font-weight: 400; display: flex; align-items: center; gap: 10px; }
.hp-handle { display: none; color: var(--hp-sub); cursor: grab; touch-action: none; }
.editing .hp-handle { display: inline-flex; }
.hp-group-label { font-size: 11.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); margin: 18px 2px 10px; display: flex; align-items: center; gap: 10px; }
.hp-group-label.red { color: var(--hp-red); }
.hp-empty { color: var(--hp-sub); text-align: center; padding: 28px 12px; font-size: 15px; }
.hp-empty.small { padding: 10px 2px; text-align: left; font-size: 14px; }
.hp-muted { color: var(--hp-sub); font-size: 14px; margin: 6px 0; }
.hp-muted.small { font-size: 12.5px; }
.hp-muted.center { text-align: center; margin-top: 24px; }

/* ---------- grids ---------- */
.hp-items.grid, .hp-items.focus, .hp-overview { display: grid; gap: var(--hp-gap); grid-template-columns: repeat(auto-fill, minmax(var(--hp-tile-min), 1fr)); grid-auto-rows: var(--hp-tile-h); grid-auto-flow: dense; }
.hp-overview { --hp-tile-min: 168px; --hp-tile-h: 128px; }
.hp-items.focus { --hp-tile-min: 200px; --hp-tile-h: 140px; }
.hp-items.list { display: flex; flex-direction: column; }

/* ---------- cards and tiles ---------- */
.hp-tile, .hp-card { position: relative; border-radius: var(--hp-radius); background: var(--hp-glass); border: 1px solid var(--hp-border); color: var(--hp-text); padding: 14px 14px 13px; min-width: 0;
  transition: background .3s, color .3s, border-color .3s, transform .12s; }
[data-glass="1"] .hp-tile, [data-glass="1"] .hp-card, [data-glass="1"] .hp-list-card, [data-glass="1"] .hp-side-panel { backdrop-filter: blur(16px) saturate(1.2); -webkit-backdrop-filter: blur(16px) saturate(1.2); }
[data-frame="0"] .hp-tile, [data-frame="0"] .hp-card { border-color: transparent; }
.hp-tile { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; touch-action: manipulation; }
.hp-tile:active { transform: scale(.97); }
.hp-tile-top { display: flex; align-items: flex-start; justify-content: space-between; }
.hp-tile-icon { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); flex: none; transition: background .3s, border-radius .3s, color .3s; }
.hp-tile-icon ha-icon { --mdc-icon-size: 18px; }
.hp-tile-icon.big { width: 56px; height: 56px; }
.hp-tile-icon.big ha-icon { --mdc-icon-size: 28px; }
.hp-tile-text { min-width: 0; margin-top: auto; }
.hp-tile-name { font-weight: 500; font-size: 15px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-tile-state { font-size: 12.5px; color: var(--hp-sub); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.hp-tile.on, .hp-card.lit { background: var(--hp-lit); color: var(--hp-lit-text); border-color: transparent; }
.hp-tile.on .hp-tile-state, .hp-card.lit .hp-sub { color: var(--hp-lit-sub); }
.hp-tile.on .hp-tile-icon, .hp-card.lit .hp-tile-icon { background: var(--hp-accent); color: #2b2125; border-radius: 10px; }
.hp-tile[data-domain="climate"][data-state="cool"] .hp-tile-icon { background: #6cc2f0; }
.hp-tile.alert .hp-tile-icon { background: var(--hp-red); color: #fff; border-radius: 10px; }
.hp-tile[data-domain="binary_sensor"].on { background: var(--hp-glass); color: var(--hp-text); border-color: var(--hp-border); }
.hp-tile[data-domain="binary_sensor"].on .hp-tile-state { color: var(--hp-accent); }
.hp-tile[data-domain="binary_sensor"].on .hp-tile-icon { border-radius: 50%; }
/* sockets and switches don't glow: accent icon and state instead (only lights light up a tile) */
.hp-tile[data-domain="switch"].on { background: var(--hp-glass); color: var(--hp-text); border-color: var(--hp-border); }
.hp-tile[data-domain="switch"].on .hp-tile-state { color: var(--hp-accent); }
.hp-tile[data-domain="switch"].on .hp-tile-icon { background: var(--hp-accent); color: #2b2125; border-radius: 50%; }
.hp-tile.unavail { opacity: .45; }
.hp-tile .hp-mini { margin-top: 10px; }
.hp-tile.size2 { grid-column: span 2; grid-row: span 2; display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); align-items: center; column-gap: 12px; }
.hp-tile.size2 > .hp-tile-text { margin-top: 0; }
/* wide (2×1) and big (2×2) tiles and cards, chosen per tile in edit mode */
.hp-tile.wide, .hp-overview > .wide { grid-column: span 2; }
.hp-overview > .big { grid-column: span 2; grid-row: span 2; }
.hp-roomcard.big .hp-tile-icon, .hp-roomcard.big .hp-power { width: 48px; height: 48px; }
.hp-roomcard.big .hp-tile-icon ha-icon, .hp-roomcard.big .hp-power ha-icon { --mdc-icon-size: 24px; }
.hp-roomcard.big .hp-roomcard-name { font-size: 21px; }
.hp-roomcard.big .hp-sub, .hp-roomcard.big .hp-roomcard-temp { font-size: 14.5px; }
.hp-roomcard.big .hp-dots i { width: 8px; height: 8px; }
.hp-roomcard.wide .hp-roomcard-name { font-size: 17px; }
.hp-sumcard.big .hp-card-big { font-size: 28px; }
.hp-tile.size2 > .hp-controls { grid-column: 1 / -1; align-self: end; min-height: 0; }
.hp-tile.size2 .hp-tile-name { font-size: 16px; }
.hp-tile-art { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity .4s; }
.hp-tile.has-art .hp-tile-art { opacity: 1; }
.hp-tile.has-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,15,25,.15), rgba(30,15,25,.8)); }
.hp-tile.has-art > :not(.hp-tile-art) { position: relative; z-index: 1; }
.hp-tile.has-art { color: #fff; }
.hp-tile.has-art .hp-tile-state { color: rgba(255,255,255,.75); }
.hp-sheet.shades { width: min(560px, 96vw); }
/* The position slider looks like a window: slats from the top, daylight below. */
.hp-slider.position { background: repeating-linear-gradient(180deg, rgba(255,255,255,.16) 0 13px, rgba(0,0,0,.28) 13px 15px) !important; border: 3px solid rgba(255,255,255,.14); box-sizing: border-box; }
.hp-slider.position .hp-slider-fill { background: linear-gradient(180deg, #bfe0f7, #fbe3b4) !important; opacity: .9; }
.hp-slider.position .hp-slider-knob { background: rgba(43,33,37,.55) !important; height: 5px !important; }
.hp-slider.shade { background: repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 10px, rgba(0,0,0,.25) 10px 12px) !important; }
.hp-slider.shade .hp-slider-fill { background: linear-gradient(90deg, #bfe0f7, #fbe3b4) !important; opacity: .9; }
.hp-shades-all { display: flex; flex-direction: column; gap: 14px; padding: 4px 0 8px; }
.hp-shades-head { display: flex; align-items: center; gap: 14px; }
.hp-shades-big { font-size: 26px; font-weight: 500; }
.hp-shades-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.hp-shades-btns .hp-btn { flex: 1; justify-content: center; }
.hp-pos-chips { align-self: center; margin-top: 4px; }
.hp-controls.sheet .hp-pos-chips { margin-top: 16px; }
.hp-shades-list { display: flex; flex-direction: column; gap: 8px; }
.hp-shades-list[hidden] { display: none; }
.editing .hp-cats .hp-cat { position: relative; cursor: grab; }
.hp-cat.is-hidden { opacity: .45; }
.hp-edit-minus.plus { background: var(--hp-green); }
.hp-sec-hero { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 20px; background: color-mix(in srgb, var(--hp-green) 13%, transparent); border: 1px solid color-mix(in srgb, var(--hp-green) 28%, transparent); }
.hp-sec-hero.alert { background: color-mix(in srgb, var(--hp-red) 15%, transparent); border-color: color-mix(in srgb, var(--hp-red) 35%, transparent); }
.hp-sec-hero-ic { width: 50px; height: 50px; border-radius: 16px; display: grid; place-items: center; flex: none; background: var(--hp-green); color: #10251a; }
.hp-sec-hero.alert .hp-sec-hero-ic { background: var(--hp-red); color: #fff; }
.hp-sec-hero-ic ha-icon { --mdc-icon-size: 26px; }
.hp-sec-hero-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hp-sec-hero-text b { font-size: 21px; font-weight: 600; }
.hp-sec-hero-text small { color: var(--hp-sub); font-size: 13px; line-height: 1.35; }
.hp-sec-part .hp-group-label { margin: 18px 4px 8px; }
.hp-sec-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); border-radius: 18px; background: var(--hp-glass); border: 1px solid var(--hp-border); overflow: hidden; }
.hp-sec-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px 11px 11px; min-height: 60px; cursor: pointer; border-top: 1px solid var(--hp-border); margin-top: -1px; }
.hp-sec-row > ha-icon { color: var(--hp-sub); --mdc-icon-size: 20px; }
.hp-sec-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none; background: color-mix(in srgb, var(--hp-green) 18%, transparent); color: var(--hp-green); }
.hp-sec-ic ha-icon { --mdc-icon-size: 20px; }
.hp-sec-row.alert .hp-sec-ic { background: var(--hp-red); color: #fff; }
.hp-sec-row.unavail .hp-sec-ic { background: var(--hp-glass-2); color: var(--hp-sub); }
.hp-sec-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.hp-sec-text b { font-weight: 500; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sec-text small { color: var(--hp-sub); font-size: 12.5px; }
.hp-sec-row.alert .hp-sec-text small { color: var(--hp-red); }
.hp-sec-act { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px 0 9px; border-radius: 17px; border: 1px solid var(--hp-border); background: var(--hp-glass-2); color: inherit; font: inherit; font-size: 13px; cursor: pointer; flex: none; }
.hp-sec-act[hidden] { display: none; }
.hp-sec-act ha-icon { --mdc-icon-size: 16px; }
.hp-sec-act.armed { background: var(--hp-red); border-color: transparent; color: #fff; }
.hp-sec-act:disabled { opacity: .5; }
.hp-sheet-actions.hp-sec-foot { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
.hp-sheet-actions.hp-sec-foot .hp-btn { justify-content: center; }
.hp-spill-grid.editing .hp-spill { position: relative; padding-right: 46px; cursor: grab; }
.hp-spill-grid.editing .hp-spill.is-hidden { opacity: .45; cursor: default; }
.hp-spill-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; border: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--hp-glass-2); color: inherit; cursor: pointer; }
.hp-spill-eye.off { background: transparent; border: 1px solid var(--hp-border); }
.hp-spill.is-hidden .hp-spill-eye { opacity: 1; }
.hp-sec-edit-tools { margin-top: 14px; justify-content: center; }
.hp-shades-more-row { display: flex; justify-content: center; margin: 6px 0 12px; }
.hp-shade-row { display: grid; grid-template-columns: minmax(90px, 150px) minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 16px; background: rgba(255,255,255,.05); }
.hp-shade-row.unavail { opacity: .45; }
.hp-shade-name { display: flex; flex-direction: column; min-width: 0; }
.hp-shade-name b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-shade-name small { color: var(--hp-sub); font-size: 12.5px; }
.hp-shade-btns { display: flex; gap: 2px; }
.hp-shade-btns .hp-round { width: 34px; height: 34px; }
@container (max-width: 480px) { .hp-shade-row { grid-template-columns: 1fr auto; } .hp-shade-row .hp-slider { grid-column: 1 / -1; grid-row: 2; } }
.hp-add-folder { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 10px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 14px; }
.hp-add-folder:hover { background: rgba(255,255,255,.05); }
.hp-add-folder span { flex: 1; font-weight: 500; }
.hp-add-folder small { color: var(--hp-sub); }
.hp-add-folder.open { background: rgba(255,255,255,.06); }
.hp-secview { display: flex; flex-direction: column; gap: 14px; }
.hp-secview .hp-sec-summary { margin: 0; }
.hp-spill-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px 2px 4px; margin: 0 -2px; }
.hp-spill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
.hp-spill { flex: none; display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 9px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); cursor: pointer; min-width: 0; max-width: 260px; }
.hp-spill-icon { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); flex: none; }
.hp-spill-icon ha-icon { --mdc-icon-size: 18px; }
.hp-spill-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.hp-spill-text b { font-weight: 500; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-spill-text small { font-size: 12px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-spill.ok .hp-spill-icon { background: rgba(92,200,121,.18); color: #7fd99a; }
.hp-spill.alert { background: var(--hp-lit); color: var(--hp-lit-text); border-color: transparent; }
.hp-spill.alert .hp-spill-icon { background: var(--hp-red, #ef5f67); color: #fff; }
.hp-spill.alert small { color: var(--hp-lit-sub); }
.hp-spill.unavail { opacity: .5; }
.hp-secview-label { margin-top: 6px; }
.hp-camwall { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.hp-camwall.n1 { grid-template-columns: minmax(0, 1fr); }
@container (min-width: 1100px) { .hp-camwall.n3, .hp-camwall.n4 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (max-width: 560px) { .hp-camwall { grid-template-columns: minmax(0, 1fr); } }
.hp-camcard { --ar: 1.7778; position: relative; border-radius: var(--hp-radius, 18px); overflow: hidden; background: #0d080b; aspect-ratio: var(--ar); cursor: pointer; border: 1px solid var(--hp-border); }
.hp-camcard.unavail { opacity: .5; }
.hp-camcard-view { position: absolute; inset: 0; }
.hp-camcard-view .hp-cam-still, .hp-camcard-view .hp-cam-live { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.hp-camcard-name { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 12px 9px; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #fff; background: linear-gradient(180deg, transparent, rgba(0,0,0,.65)); pointer-events: none; }
.hp-live-wrap { position: absolute; inset: 0; }
.hp-cam-view .hp-live-wrap .hp-cam-live { object-fit: contain; }
.hp-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef5f67; box-shadow: 0 0 0 3px rgba(239,95,103,.25); flex: none; }
.hp-camcard .hp-live-dot { background: rgba(255,255,255,.45); box-shadow: none; }
.hp-camcard.playing .hp-live-dot { background: #ef5f67; animation: hp-live-blink 1.6s ease-in-out infinite; }
@keyframes hp-live-blink { 0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(239,95,103,.3); } 50% { opacity: .35; box-shadow: 0 0 0 0 rgba(239,95,103,0); } }
.hp-camcard.unavail .hp-live-dot { background: #999; box-shadow: none; animation: none; }
.hp-camcard-zoom { position: absolute; right: 10px; top: 10px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.45); color: #fff; border: 0; opacity: 0; transition: opacity .2s; pointer-events: none; }
.hp-camcard:hover .hp-camcard-zoom { opacity: 1; }
.hp-camcard-zoom ha-icon { --mdc-icon-size: 17px; }
.hp-cam-tile { min-height: 120px; }
.hp-cam-tile.size2 { grid-row: span 2; }
.hp-cam-tile .hp-tile-art { opacity: 1; background-color: #120a10; }
.hp-cam-tile:not(.has-art) .hp-tile-art { opacity: 0; }
.hp-cam-tile .hp-tile-top { display: none; }
.hp-tile.hp-cam-tile.has-art::after { background: linear-gradient(180deg, transparent 55%, rgba(20,10,16,.75)); }
.hp-tile.hp-cam-tile .hp-tile-art { transition: opacity .4s, background-image .3s; }
.hp-tile.hp-cam-tile > .hp-cam-badge { position: absolute; left: 12px; top: 12px; z-index: 2; }
.hp-cam-tile.size2 { display: flex; flex-direction: column; justify-content: flex-end; }
.hp-cam-badge { position: absolute; left: 12px; top: 12px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.45); color: #fff; z-index: 2; }
.hp-cam-badge ha-icon { --mdc-icon-size: 18px; }
.hp-tile.hp-cam-tile.size2 > .hp-tile-text { align-self: end; }
.hp-sheet.camera { width: min(1000px, 96vw); max-width: none; }
.hp-cam-view { position: relative; aspect-ratio: 16 / 9; width: 100%; border-radius: 18px; overflow: hidden; background: #000; display: grid; place-items: center; }
.hp-cam-view:fullscreen { border-radius: 0; aspect-ratio: auto; }
.hp-camfull { position: fixed; inset: 0; z-index: 60; pointer-events: auto; background: #000; opacity: 0; transition: opacity .2s; touch-action: none; outline: none; }
.hp-camfull.open { opacity: 1; }
.hp-camfull-stage { position: absolute; inset: 0; display: grid; place-items: center; }
.hp-camfull-stage > * { grid-area: 1 / 1; width: 100%; height: 100%; }
.hp-camfull-stage .hp-cam-still, .hp-camfull-stage .hp-cam-live, .hp-camfull-stage video, .hp-camfull-stage img { object-fit: contain; width: 100%; height: 100%; }
.hp-camfull-bar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 10px; padding: max(14px, env(safe-area-inset-top)) 16px 28px 20px; background: linear-gradient(rgba(0,0,0,.6), transparent); color: #fff; font-weight: 600; font-size: 16px; transition: opacity .3s; }
.hp-camfull-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-camfull .hp-round { background: rgba(0,0,0,.45); color: #fff; border: 1px solid rgba(255,255,255,.2); }
.hp-camfull-nav { position: absolute; top: 50%; transform: translateY(-50%); transition: opacity .3s; }
.hp-camfull-nav.prev { left: 16px; }
.hp-camfull-nav.next { right: 16px; }
.hp-camfull.calm .hp-camfull-bar, .hp-camfull.calm .hp-camfull-nav { opacity: 0; pointer-events: none; }
.hp-camfull.ring.calm .hp-camfull-bar { opacity: 1; pointer-events: auto; }
.hp-camfull-heading { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hp-camfull-heading b { font-size: 22px; }
.hp-camfull-heading .hp-camfull-name { font-weight: 500; font-size: 14px; opacity: .8; }
.hp-camfull-actions { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; gap: 14px; padding: 40px 20px max(22px, env(safe-area-inset-bottom)); background: linear-gradient(transparent, rgba(0,0,0,.6)); }
.hp-camfull-act { display: inline-flex; align-items: center; gap: 10px; height: 60px; padding: 0 28px; border-radius: 30px; border: 0; font: inherit; font-size: 17px; font-weight: 600; background: rgba(255,255,255,.92); color: #1c1c1e; cursor: pointer; }
.hp-camfull-act ha-icon { --mdc-icon-size: 24px; }
.hp-camfull-act.armed { background: var(--hp-accent); color: #2b2125; animation: hp-armed 1s ease-in-out infinite alternate; }
.hp-camfull-act.done { background: #5bd18b; color: #0e2a19; }
.hp-cam-still, .hp-cam-live { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.hp-cam-live { --video-max-height: 100%; display: block; }
.hp-cam-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(255,255,255,.6); font-size: 13px; z-index: 1; }
.hp-cam-loading ha-icon { --mdc-icon-size: 34px; }
.hp-cam-picks { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-top: 12px; padding-bottom: 2px; }
.hp-cam-picks .hp-chip { flex: none; }
.hp-focus .hp-tile-name { font-size: 18px; }
.hp-focus .hp-tile-icon { width: 42px; height: 42px; }
.hp-focus .hp-tile-icon ha-icon { --mdc-icon-size: 22px; }

/* room cards on Home */
.hp-roomcard { cursor: pointer; display: flex; flex-direction: column; }
.hp-roomcard-top { display: flex; justify-content: space-between; align-items: flex-start; }
.hp-power { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); flex: none; }
.hp-power ha-icon { --mdc-icon-size: 19px; }
.hp-card.lit .hp-power { background: rgba(43,33,37,.1); }
.hp-roomcard-name { margin-top: auto; font-size: 15px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sub { font-size: 12.5px; color: var(--hp-sub); }
.hp-roomcard .hp-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-roomcard-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 7px; min-height: 12px; }
.hp-dots { display: flex; gap: 4px; }
.hp-dots i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.28); }
.hp-card.lit .hp-dots i { background: rgba(43,33,37,.16); }
.hp-dots i.on { background: var(--hp-accent) !important; }
.hp-roomcard-temp { font-size: 12.5px; color: var(--hp-sub); font-variant-numeric: tabular-nums; }
.hp-card.lit .hp-roomcard-temp { color: var(--hp-lit-sub); }
.hp-roomcard-btns { display: flex; gap: 6px; }
.hp-shade-btn ha-icon { --mdc-icon-size: 18px; }
.hp-roomcard-temp { display: flex; align-items: center; gap: 9px; }
.hp-shade-info { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.hp-shade-info ha-icon { --mdc-icon-size: 14px; opacity: .85; }
.hp-shade-info[hidden] { display: none; }

/* summary cards */
.hp-card-label { font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; display: flex; align-items: center; gap: 8px; color: var(--hp-sub); }
.hp-card.lit .hp-card-label { color: var(--hp-lit-sub); }
.hp-card-label .hp-tile-icon { width: 30px; height: 30px; }
.hp-card-big { font-size: 22px; font-weight: 400; line-height: 1.2; margin-top: auto; }
.hp-sumcard { display: flex; flex-direction: column; cursor: pointer; }
.hp-sumcard .hp-sub { margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sumcard.climate .hp-card-big { font-size: 26px; }
.hp-sumcard.climate .hp-tile-icon { background: #57c27a; color: #fff; border-radius: 50%; }
.hp-sumcard.media .hp-card-label { color: var(--hp-green); }
.hp-sumcard.media .hp-media-title { font-size: 15px; font-weight: 500; margin-top: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sumcard.media .hp-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,.2); margin: 8px 0 6px; overflow: hidden; }
.hp-sumcard.media .hp-bar i { display: block; height: 100%; background: #f7f1ea; }
.hp-sumcard.media .hp-media-btns { display: flex; justify-content: center; align-items: center; gap: 14px; }
.hp-sumcard.media .hp-media-btns button { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; }
.hp-sumcard.media .hp-media-btns button.main { background: #f7f1ea; color: #2b2125; }
.hp-sumcard.media .hp-media-btns ha-icon { --mdc-icon-size: 17px; }
.hp-sumcard.today .hp-ev, .hp-sumcard.today .hp-item { padding: 3px 0; }
.hp-today-head { font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; display: flex; align-items: center; gap: 8px; color: var(--hp-sub); margin-bottom: 6px; }
.hp-today-head ha-icon { --mdc-icon-size: 16px; color: var(--hp-accent); }
.hp-today-body { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0 16px; overflow: hidden; }
.hp-addcard { border: 1.5px dashed var(--hp-border); border-radius: var(--hp-radius); display: none; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--hp-sub); font-size: 13px; }
.hp-addcard span { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-text); }
.editing .hp-addcard { display: flex; }

/* rooms view */
.hp-rooms { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 22px; align-items: start; }
.hp-room-nav { display: flex; flex-direction: column; gap: 2px; position: sticky; top: 0; }
.hp-nav-item { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 10px 0 6px; border-radius: 12px; font-size: 14px; font-weight: 500; text-align: left; color: var(--hp-text); opacity: .85; }
.hp-nav-item .hp-nav-ic { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass); flex: none; }
.hp-nav-item .hp-nav-ic ha-icon { --mdc-icon-size: 15px; }
.hp-nav-item span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-nav-item b { min-width: 18px; height: 18px; border-radius: 9px; font-size: 11px; font-weight: 600; display: grid; place-items: center; background: var(--hp-accent); color: #2b2125; padding: 0 5px; }
.hp-nav-item.active { background: #f7f1ea; color: #2b2125; opacity: 1; }
.hp-nav-item.active .hp-nav-ic { background: rgba(43,33,37,.08); }

/* list layout */
.hp-list-cols { columns: 2 340px; column-gap: 14px; }
.hp-list-card { break-inside: avoid; margin-bottom: 14px; border-radius: var(--hp-radius); background: var(--hp-glass); border: 1px solid var(--hp-border); padding: 6px; }
.hp-list-head { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 8px; }
.hp-list-head .hp-tile-icon { border-radius: 10px; }
.hp-list-head.on .hp-tile-icon { background: var(--hp-accent); color: #2b2125; }
.hp-list-head > div:not(.hp-tile-icon) { flex: 1; min-width: 0; }
.hp-tile.hp-row[data-domain="binary_sensor"].on { background: transparent; border-color: transparent; }
.hp-list-head b { display: block; font-weight: 500; font-size: 15px; }
.hp-tile.hp-row { flex-direction: row; align-items: center; justify-content: flex-start; gap: 12px; padding: 7px 8px; background: transparent; border-color: transparent; border-radius: 12px; backdrop-filter: none; -webkit-backdrop-filter: none; }
.hp-tile.hp-row .hp-tile-text { margin-top: 0; flex: 1; }
.hp-tile.hp-row.on { background: transparent; color: var(--hp-text); }
.hp-tile.hp-row.on .hp-tile-state { color: var(--hp-sub); }
.hp-tile.hp-row .hp-tile-icon { width: 30px; height: 30px; }
.hp-tile.hp-row .hp-tile-name { font-size: 14px; }
.hp-row-end { margin-left: auto; display: flex; align-items: center; }

.hp-sep { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; color: var(--hp-sub); font-size: 11.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; padding: 8px 2px 0; position: relative; }
.hp-sep::after { content: ""; flex: 1; height: 1px; background: var(--hp-border); }
.hp-items.grid .hp-sep, .hp-items.focus .hp-sep { align-self: end; }

/* ---------- edit mode ---------- */
.hp-edit-minus, .hp-edit-resize { position: absolute; z-index: 3; width: 22px; height: 22px; border-radius: 50%; display: none; place-items: center; }
.hp-edit-minus { top: -6px; left: -6px; background: var(--hp-red); color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.hp-edit-resize { right: 6px; bottom: 6px; background: rgba(43,33,37,.75); color: #fff; }
.hp-edit-minus ha-icon, .hp-edit-resize ha-icon { --mdc-icon-size: 14px; }
.hp-edit-minus.inline { position: static; }
.editing .hp-edit-minus, .editing .hp-edit-resize { display: grid; }
.editing .hp-tile, .editing .hp-card { overflow: visible; }
.hp-tile.hp-row .hp-edit-minus, .hp-tile.hp-row .hp-edit-resize, .hp-sep .hp-edit-minus, .hp-sep .hp-edit-resize { position: static; }
.hp-tile.hp-row .hp-edit-minus { order: -1; }
.editing .hp-tile, .editing .hp-card, .editing .hp-scene, .editing .hp-tab { animation: hp-jiggle .3s ease-in-out infinite alternate; cursor: grab; touch-action: none; }
/* Status chips in edit mode: grabbed with a finger without the page scrolling away, and clearly lifted while dragged */
.editing .hp-cats .hp-cat { animation: hp-jiggle .3s ease-in-out infinite alternate; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.hp-cats.sorting .hp-cat { transition: none; }
.hp-cats .hp-cat.dragging { animation: none; z-index: 5; position: relative; cursor: grabbing; box-shadow: 0 10px 28px rgba(0,0,0,.45); scale: 1.06; }
.hp-cats.sorting .hp-cat:not(.dragging) { opacity: .85; }
.editing .hp-tile:nth-child(2n), .editing .hp-card:nth-child(2n), .editing .hp-scene:nth-child(2n), .editing .hp-tab:nth-child(2n) { animation-delay: -.15s; }
.editing .hp-tile:active { transform: none; }
.dragging { animation: none !important; z-index: 10; opacity: .94; box-shadow: 0 18px 40px rgba(20,8,16,.5) !important; transition: none !important; cursor: grabbing; }
@keyframes hp-jiggle { from { rotate: -.6deg; } to { rotate: .6deg; } }
.hp-edit-tools { display: none; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.editing .hp-edit-tools { display: flex; }
.hp-edit-tools.inline { margin-top: 0; }
.hp-tab .hp-edit-minus { top: -4px; left: -4px; width: 18px; height: 18px; }

/* ---------- chips, inputs, switches ---------- */
.hp-chip { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 13px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); font-size: 13.5px; font-weight: 500; white-space: nowrap; }
.hp-chip ha-icon { --mdc-icon-size: 16px; }
.hp-chip.small { height: 28px; padding: 0 10px; font-size: 12.5px; }
.hp-chip.active { background: #f7f1ea; color: #2b2125; border-color: transparent; }
.hp-round { width: 42px; height: 42px; border-radius: 50%; display: inline-grid; place-items: center; background: var(--hp-glass-2); flex: none; transition: transform .1s, background .2s; }
.hp-round:active { transform: scale(.92); }
.hp-round.ghost { background: transparent; }
.hp-round.main { background: #f7f1ea; color: #2b2125; }
.hp-round.big { width: 60px; height: 60px; }
.hp-round.big ha-icon { --mdc-icon-size: 30px; }
.hp-round.active { color: var(--hp-accent); }
.hp-round.danger { color: var(--hp-red); }
.hp-input, .hp-select { width: 100%; height: 44px; border-radius: 12px; border: 1px solid var(--hp-border); background: rgba(255,255,255,.06); color: var(--hp-text); padding: 0 14px; font: inherit; font-size: 15px; outline: none; user-select: text; -webkit-user-select: text; }
.hp-input:focus, .hp-select:focus { border-color: var(--hp-accent); }
.hp-select { width: auto; max-width: 100%; height: 36px; font-size: 14px; }
.hp-select option { background: #2a2228; }
.hp-switch { width: 44px; height: 26px; border-radius: 13px; background: rgba(255,255,255,.2); position: relative; transition: background .2s; flex: none; }
.hp-switch span { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
.hp-switch.on { background: var(--hp-accent); }
.hp-switch.on span { transform: translateX(18px); }

/* ---------- sliders and controls ---------- */
.hp-controls { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.hp-controls.card { margin-top: auto; padding-top: 8px; }
.hp-slider { position: relative; height: 34px; border-radius: 12px; background: rgba(255,255,255,.12); overflow: hidden; cursor: pointer; touch-action: none; flex: none; }
.hp-tile.on .hp-slider, .hp-card.lit .hp-slider { background: rgba(43,33,37,.1); }
.hp-slider-fill { position: absolute; left: 0; bottom: 0; top: 0; background: var(--hp-accent); border-radius: inherit; }
.hp-slider-knob { position: absolute; top: 7px; bottom: 7px; width: 3px; border-radius: 2px; background: rgba(43,33,37,.55); }
.hp-slider.mini { height: 20px; border-radius: 10px; }
.hp-slider.mini .hp-slider-knob { display: none; }
.hp-slider.kelvin .hp-slider-fill { background: transparent; }
.hp-slider.vertical { width: 58px; height: auto; min-height: 120px; align-self: stretch; border-radius: 16px; }
.hp-slider.vertical .hp-slider-fill { top: auto; right: 0; }
.hp-slider.vertical .hp-slider-knob { top: auto; left: 14px; right: 14px; width: auto; height: 3px; }
.hp-slider.progress { height: 5px; border-radius: 3px; overflow: visible; background: rgba(255,255,255,.18); }
.hp-slider.progress .hp-slider-fill { background: #f7f1ea; }
.hp-slider.progress .hp-slider-knob { top: -5px; bottom: auto; width: 15px; height: 15px; border-radius: 50%; margin-left: -6px; background: #fff; }
.hp-slider.volume { flex: 1; height: 6px; border-radius: 3px; overflow: visible; }
.hp-slider.volume .hp-slider-knob { top: -6px; bottom: auto; width: 18px; height: 18px; border-radius: 50%; margin-left: -8px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
.hp-sheet-big { display: flex; justify-content: center; }
.hp-sheet-big .hp-slider.vertical { width: 104px; min-height: 270px; border-radius: 26px; }
.hp-swatches { display: flex; gap: 7px; flex-wrap: wrap; }
.hp-swatch { width: 26px; height: 26px; border-radius: 50%; border: 0; flex: none; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.hp-swatch.big { width: 34px; height: 34px; }
.hp-swatch.active { box-shadow: 0 0 0 2px var(--hp-sheet), 0 0 0 4px var(--hp-text); }
.hp-swatch.glassy { background: linear-gradient(135deg, rgba(255,255,255,.25), rgba(255,255,255,.05)) !important; }
.hp-cover-row { display: flex; gap: 12px; flex: 1; min-height: 0; justify-content: flex-end; }
.hp-controls.card .hp-cover-row .hp-slider.vertical { min-height: 0; width: 50px; }
.hp-btn-col { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.hp-btn-col .hp-round { width: 34px; height: 34px; }
.hp-controls.sheet .hp-cover-row { justify-content: center; }
.hp-controls.sheet .hp-cover-row .hp-slider.vertical { width: 104px; min-height: 270px; border-radius: 26px; }
.hp-tile.on .hp-round, .hp-card.lit .hp-round { background: rgba(43,33,37,.08); }
.hp-tile.on .hp-round.main { background: #2b2125; color: #f7f1ea; }
.hp-media-row { display: flex; gap: 10px; align-items: center; justify-content: center; }
.hp-vol { display: flex; align-items: center; gap: 10px; }
.hp-controls.card .hp-slider { height: 30px; }
.hp-controls.card .hp-slider.volume { height: 6px; }

.hp-climate { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hp-ring-wrap { display: flex; align-items: center; gap: 6px; }
.hp-ring { position: relative; width: 140px; height: 140px; }
.hp-ring.sheet { width: 230px; height: 230px; }
.hp-controls.card .hp-ring { width: 112px; height: 112px; }
.hp-ring-svg { width: 100%; height: 100%; touch-action: none; cursor: pointer; }
.hp-ring-svg circle { fill: none; stroke-width: 8; stroke-linecap: round; }
.hp-ring-svg .track { stroke: rgba(127,127,127,.22); }
.hp-ring-svg .value { stroke: #f39c3c; transition: stroke-dasharray .15s; }
.hp-ring[data-mode="cool"] .value { stroke: #3d8fe0; }
.hp-ring[data-mode="off"] .value { stroke: rgba(127,127,127,.45); }
.hp-ring-svg .knob { fill: #fff; stroke: rgba(0,0,0,.18); stroke-width: 1; }
.hp-ring-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; pointer-events: none; }
.hp-ring-temp { font-size: 30px; font-weight: 400; font-variant-numeric: tabular-nums; }
.hp-ring.sheet .hp-ring-temp { font-size: 52px; font-weight: 300; }
.hp-ring-sub { font-size: 12px; opacity: .6; }
.hp-modes { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; padding: 3px; border-radius: 999px; background: rgba(127,127,127,.12); }
.hp-modes .hp-chip { border: 0; background: transparent; height: 28px; padding: 0 9px; }
.hp-modes .hp-chip.active { background: #2b2125; color: #f7f1ea; }
.hp-sheet .hp-modes .hp-chip.active { background: #f7f1ea; color: #2b2125; }
.hp-modes-extra { border-radius: 18px; margin-top: 8px; max-width: 100%; }

/* ---------- sidebar layout ---------- */
.hp-layout-sidebar { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 26px; padding-top: 0; overflow: hidden; }
.hp-side-panel { border-radius: 26px; background: var(--hp-glass); border: 1px solid var(--hp-border); padding: 22px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; scrollbar-width: none; margin: 18px 0 96px; }
.hp-side-panel .hp-clock { font-size: 50px; font-weight: 300; }
.hp-side-panel .hp-status-big { font-size: 22px; margin-top: 4px; }
.hp-side-panel .hp-status-btns .hp-btn { flex: 1; justify-content: center; }
.hp-side-panel .hp-status { flex-direction: column; align-items: stretch; gap: 10px; margin: 0; }
.hp-side-panel .hp-status-btns { width: 100%; }
.hp-side-panel .hp-status-btns .hp-btn { padding: 0 10px; }
/* side panel widgets */
.hp-side-wx { cursor: pointer; }
.hp-side-wx-now { display: flex; align-items: center; gap: 12px; }
.hp-side-wx-icon { --mdc-icon-size: 34px; color: var(--hp-accent); }
.hp-side-wx-now b { display: block; font-size: 24px; font-weight: 400; line-height: 1.1; }
.hp-side-wx-now small { color: var(--hp-sub); font-size: 12.5px; }
.hp-side-wx-hl { margin-left: auto; display: flex; flex-direction: column; align-items: flex-end; font-size: 12.5px; color: var(--hp-sub); font-variant-numeric: tabular-nums; }
.hp-side-wx-hours { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-top: 10px; text-align: center; }
.hp-side-wx-hours > div { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.hp-side-wx-hours small { font-size: 11px; color: var(--hp-sub); font-variant-numeric: tabular-nums; }
.hp-side-wx-hours ha-icon { --mdc-icon-size: 18px; }
.hp-side-wx-hours b { font-size: 13px; font-weight: 500; }
.hp-side-agenda { display: flex; flex-direction: column; gap: 4px; cursor: pointer; }
.hp-side-agenda .hp-label { margin-bottom: 2px; }
.hp-side-agenda .hp-label ha-icon { --mdc-icon-size: 14px; }
.hp-side-day { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--hp-sub); margin-top: 6px; }
.hp-side-ev { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 8px; font-size: 13.5px; }
.hp-side-ev i { width: 8px; height: 8px; border-radius: 50%; background: var(--hp-accent); }
.hp-side-ev span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-side-ev small { color: var(--hp-sub); font-size: 12px; font-variant-numeric: tabular-nums; }
.hp-side-ev.todo { grid-template-columns: 14px minmax(0, 1fr); }
.hp-side-ev.todo ha-icon { --mdc-icon-size: 14px; color: var(--hp-sub); }
.hp-side-sep { height: 1px; background: var(--hp-border); margin: 4px 0; }
.hp-side-main { overflow-y: auto; padding: 14px 0 110px; scrollbar-width: none; }
.hp-side-title { font-size: 32px; font-weight: 400; margin: 6px 0 16px; }

/* ---------- focus layout ---------- */
.hp-layout-focus { display: flex; flex-direction: column; overflow: hidden; padding-left: 0; padding-right: 0; padding-bottom: 76px; }
.hp-focus-track { flex: 1; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; min-height: 0; }
.hp-focus-track::-webkit-scrollbar { display: none; }
.hp-focus-slide { flex: 0 0 100%; scroll-snap-align: start; overflow-y: auto; padding: 0 28px 20px; scrollbar-width: none; }
.hp-focus-slide .hp-room-title { font-size: clamp(36px, 6cqw, 60px); font-weight: 300; }
.hp-focus-home { display: flex; flex-direction: column; justify-content: center; min-height: 100%; padding-top: 10px; }
.hp-focus-clock { font-size: clamp(90px, 17cqw, 230px); font-weight: 200; line-height: .95; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; margin: 8px 0 14px -4px; }
.hp-focus-line { display: flex; align-items: center; gap: 18px; font-size: 17px; margin-bottom: 18px; flex-wrap: wrap; }
.hp-focus-rooms { display: flex; flex-wrap: wrap; gap: 8px; }
.hp-room-pill { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 13px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); font-size: 13.5px; font-weight: 500; }
.hp-room-pill ha-icon { --mdc-icon-size: 16px; }
.hp-room-pill.lit { background: var(--hp-lit); color: var(--hp-lit-text); border-color: transparent; }
.hp-room-pill b { min-width: 18px; height: 18px; border-radius: 9px; font-size: 11px; display: grid; place-items: center; background: var(--hp-accent); color: #2b2125; }
.hp-room-pill:not(.lit) { padding-right: 13px; }
.hp-focus-nav { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 8px 0 4px; }
.hp-focus-nav .hp-round { width: 30px; height: 30px; background: var(--hp-glass); }
.hp-focus-dots { display: flex; gap: 5px; }
.hp-dot { width: 6px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.3); transition: width .2s, background .2s; }
.hp-dot.active { width: 20px; background: #f7f1ea; }

/* ---------- agenda ---------- */
.hp-ev, .hp-item { display: flex; align-items: center; gap: 12px; padding: 8px 2px; min-width: 0; }
.hp-ev-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.hp-ev-text { min-width: 0; flex: 1; }
.hp-ev-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ev-text small { color: var(--hp-sub); }
.hp-card.lit .hp-ev-text small { color: var(--hp-lit-sub); }
.hp-check { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--hp-faint); display: grid; place-items: center; flex: none; }
.hp-check ha-icon { --mdc-icon-size: 15px; opacity: 0; }
.hp-check:hover ha-icon { opacity: .5; }
.hp-item.overdue .hp-check { border-color: var(--hp-red); }
.hp-item.overdue small { color: var(--hp-red) !important; }
.hp-item.done { opacity: .4; transition: opacity .3s; }
.hp-item.done .hp-check { background: var(--hp-accent); border-color: var(--hp-accent); color: #2b2125; }
.hp-item.done .hp-check ha-icon { opacity: 1; }
.hp-item.done .hp-ev-title { text-decoration: line-through; }
.hp-add-reminder { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.hp-cal-layout { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: 24px; height: 100%; }
.hp-month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; align-content: start; }
.hp-wd { text-align: center; font-size: 11px; color: var(--hp-sub); text-transform: uppercase; letter-spacing: .1em; padding: 4px 0; }
.hp-day { aspect-ratio: 1.2; border-radius: 12px; background: rgba(255,255,255,.04); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-weight: 500; font-variant-numeric: tabular-nums; }
.hp-day.other { opacity: .3; }
.hp-day.today span { background: var(--hp-accent); color: #2b2125; border-radius: 999px; padding: 1px 8px; }
.hp-day.sel { background: rgba(255,255,255,.12); }
.hp-day .hp-dots i { width: 5px; height: 5px; }
.hp-day-head { font-size: 20px; font-weight: 400; margin-bottom: 8px; }
.hp-day-list { overflow-y: auto; }
.hp-month-nav { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.hp-month-title { min-width: 150px; text-align: center; font-weight: 500; text-transform: capitalize; }

/* ---------- weather ---------- */
.hp-wx-now { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
ha-icon.hp-wx-big { --mdc-icon-size: 54px; color: var(--hp-accent); }
.hp-wx-temp { font-size: 50px; font-weight: 300; line-height: 1; }
.hp-wx-label { font-size: 17px; font-weight: 500; }
.hp-wx-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 4px 0 18px; }
.hp-wx-stat { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.06); }
.hp-wx-stat ha-icon { --mdc-icon-size: 20px; color: var(--hp-sub); flex: none; }
.hp-wx-stat > div { display: flex; flex-direction: column; min-width: 0; }
.hp-wx-stat small { color: var(--hp-sub); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-wx-stat b { font-size: 15px; font-weight: 600; white-space: nowrap; }
.hp-wx-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.hp-wx-chips span { font-size: 12.5px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,.08); }
.hp-wx-hours { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
.hp-wx-hour { flex: none; width: 58px; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 9px 0; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.06); }
.hp-wx-hour small { color: var(--hp-sub); font-size: 11.5px; }
.hp-wx-hour b { font-weight: 500; }
.hp-wx-hour small.rain { color: #6cb8f0; }
.hp-wx-days { display: flex; flex-direction: column; }
.hp-wx-day { display: grid; grid-template-columns: 64px 26px 40px 1fr 40px; align-items: center; gap: 10px; padding: 7px 2px; font-variant-numeric: tabular-nums; font-size: 14px; }
.hp-wx-dname { font-weight: 500; text-transform: capitalize; }
.hp-wx-rain { color: #6cb8f0; font-size: 12px; }
.hp-wx-lo { color: var(--hp-sub); text-align: right; }
.hp-wx-hi { font-weight: 600; }
.hp-wx-range { position: relative; height: 4px; border-radius: 2px; background: rgba(255,255,255,.1); }
.hp-wx-range i { position: absolute; top: 0; bottom: 0; border-radius: 2px; background: linear-gradient(90deg, #6cb8f0, #f4c244, #f39c3c); }

/* ---------- player ---------- */
.hp-player { display: grid; grid-template-columns: minmax(180px, 300px) 1fr; gap: 24px; align-items: center; }
.hp-player.compact { grid-template-columns: 110px 1fr; gap: 18px; }
.hp-player-art { aspect-ratio: 1; border-radius: 16px; background: rgba(255,255,255,.08) center / cover; display: grid; place-items: center; box-shadow: 0 16px 40px rgba(20,8,16,.4); }
.hp-player-art.has-art .hp-player-noart { display: none; }
ha-icon.hp-player-noart { --mdc-icon-size: 44px; opacity: .4; }
.hp-player-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.hp-player-title { font-size: 22px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-player.compact .hp-player-title { font-size: 18px; }
.hp-player-artist { color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-player-times { display: flex; justify-content: space-between; color: var(--hp-sub); margin-top: 6px; font-size: 12px; font-variant-numeric: tabular-nums; }
.hp-player-btns { display: flex; align-items: center; justify-content: center; gap: 10px; }
.hp-player-source { display: flex; align-items: center; gap: 8px; color: var(--hp-sub); }
.hp-player.compact .hp-player-source, .hp-player.compact .hp-vol .hp-round:last-child { display: none; }
.hp-browse { grid-column: 1 / -1; }
.hp-browse-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; }
.hp-browse-item { display: flex; flex-direction: column; gap: 6px; text-align: left; font-size: 13px; font-weight: 500; }
.hp-browse-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-browse-thumb { aspect-ratio: 1; border-radius: 12px; background: rgba(255,255,255,.07) center / cover; display: grid; place-items: center; }
.hp-player-card { position: relative; }
.hp-player-card > .hp-round { position: absolute; top: 10px; right: 10px; }
.hp-player-pick { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 12px 0 4px; }
.hp-top { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
.hp-top:empty { display: none; }
.hp-sec-summary { display: flex; align-items: center; gap: 14px; }
.hp-sec-summary.tappable { cursor: pointer; }
.hp-sec-summary.tappable::after { content: ""; margin-left: auto; width: 9px; height: 9px; border-right: 2px solid var(--hp-sub); border-top: 2px solid var(--hp-sub); transform: rotate(45deg); flex: none; margin-right: 6px; }
.hp-sec-recent { grid-template-columns: repeat(2, 1fr); margin-top: 4px; }
.hp-sec-recent-box[hidden] { display: none; }
.hp-sec-summary ha-icon.hp-sec-icon { --mdc-icon-size: 32px; color: var(--hp-red); }
.hp-sec-summary.ok .hp-sec-icon { color: var(--hp-green); }
.hp-sec-summary b { display: block; font-size: 18px; font-weight: 500; }
.hp-sec-summary small { color: var(--hp-sub); }

/* ---------- sheets ---------- */
.hp-layer { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
.hp-backdrop { position: absolute; inset: 0; background: rgba(20,10,18,.5); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; transition: opacity .2s; pointer-events: auto; }
.hp-backdrop.open { opacity: 1; }
.hp-sheet { width: min(520px, 100%); max-height: calc(100% - 20px); display: flex; flex-direction: column; background: var(--hp-sheet); color: #f7efe9; border: 1px solid rgba(255,255,255,.08);
  border-radius: 24px; box-shadow: 0 30px 80px rgba(10,4,8,.55); transform: translateY(14px) scale(.985); transition: transform .22s ease; overflow: hidden; }
.hp-backdrop.open .hp-sheet { transform: none; }
.hp-sheet.small { width: min(420px, 100%); }
.hp-sheet.tall { height: min(760px, 100%); width: min(620px, 100%); }
.hp-sheet.full { width: 100%; height: 100%; max-height: 100%; }
.hp-sheet.player { width: min(860px, 100%); }
.hp-sheet-head { display: flex; align-items: center; gap: 12px; padding: 18px 18px 6px 22px; flex-wrap: wrap; }
.hp-sheet-titles { min-width: 0; flex: 1; }
.hp-sheet-title { font-size: 20px; font-weight: 500; }
.hp-sheet-sub { color: rgba(247,239,233,.6); font-size: 13.5px; }
.hp-sheet-head > .hp-round:last-child { width: 36px; height: 36px; background: rgba(255,255,255,.08); }
.hp-sheet-body { padding: 8px 22px 22px; overflow-y: auto; flex: 1; min-height: 0; overscroll-behavior: contain; }
.hp-backdrop { overscroll-behavior: contain; }
/* A small grab bar on phones: popups can be pulled down to close. */
.hp-root.layout-phone .hp-sheet { position: relative; }
.hp-root.layout-phone .hp-sheet::before { content: ""; position: absolute; left: 50%; top: 7px; width: 38px; height: 5px; margin-left: -19px; border-radius: 3px; background: rgba(255,255,255,.22); z-index: 2; }
.hp-sheet-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; flex-wrap: wrap; }
.hp-confirm-text { font-size: 15px; line-height: 1.45; color: rgba(247,239,233,.7); margin: 6px 0 0; }
.hp-details-head { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.hp-details-state { font-size: 24px; font-weight: 400; }
.hp-sheet .hp-controls { gap: 16px; }
.hp-sheet .hp-tile-icon { background: var(--hp-accent); color: #2b2125; border-radius: 14px; }
.hp-sheet .hp-slider { background: rgba(255,255,255,.1); }
.hp-sheet .hp-slider-knob { background: rgba(43,33,37,.6); }
.hp-add-list { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.hp-add-group { font-size: 11.5px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: rgba(247,239,233,.55); margin: 14px 4px 6px; }
.hp-add-row { display: flex; align-items: center; gap: 12px; padding: 7px 10px; border-radius: 12px; text-align: left; }
.hp-add-row:hover { background: rgba(255,255,255,.05); }
.hp-add-row .hp-tile-icon { width: 34px; height: 34px; background: rgba(255,255,255,.1); color: inherit; border-radius: 50%; }
.hp-add-row > ha-icon:last-child { color: var(--hp-accent); }
.hp-add-row.there { opacity: .45; cursor: default; }
.hp-add-text { flex: 1; min-width: 0; }
.hp-add-text small { display: block; color: rgba(247,239,233,.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-toast { position: absolute; left: 50%; bottom: 90px; transform: translate(-50%, 20px); background: var(--hp-sheet); color: #f7efe9; padding: 11px 18px; border-radius: 999px; opacity: 0; transition: .25s; pointer-events: none; font-weight: 500; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
.hp-toast.show { opacity: 1; transform: translate(-50%, 0); }

/* ---------- settings (full screen with a side menu) ---------- */
.hp-sheet.settings { width: 100%; height: 100%; max-height: 100%; border-radius: 0; background: transparent; border: 0; box-shadow: none; color: var(--hp-text); }
.hp-backdrop:has(.hp-sheet.settings) { padding: 0; background: rgba(30,15,25,.35); backdrop-filter: blur(24px) saturate(1.2); -webkit-backdrop-filter: blur(24px) saturate(1.2); }
.hp-sheet.settings .hp-sheet-head { padding: 26px 28px 10px; }
.hp-sheet.settings .hp-sheet-title { font-size: 34px; font-weight: 400; }
.hp-sheet.settings .hp-sheet-sub { color: var(--hp-sub); }
.hp-sheet.settings .hp-sheet-body { padding: 10px 28px 28px; display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 24px; overflow: hidden; }
.hp-set-nav { display: flex; flex-direction: column; gap: 2px; }
.hp-set-pane { overflow-y: auto; scrollbar-width: none; padding-bottom: 30px; }
.hp-set-section { border-radius: 22px; background: var(--hp-glass); border: 1px solid var(--hp-border); padding: 18px 20px; margin-bottom: 14px; }
.hp-set-section > .hp-group-label:first-child { margin-top: 0; }
.hp-set-row { display: flex; align-items: center; gap: 12px; min-height: 46px; justify-content: space-between; }
.hp-set-label { display: flex; flex-direction: column; min-width: 0; }
.hp-set-label > span { font-weight: 500; display: flex; align-items: center; gap: 6px; }
.hp-set-label small { color: var(--hp-sub); font-size: 12.5px; }
.hp-set-row > .hp-select { flex: 0 1 auto; min-width: 0; text-overflow: ellipsis; }
.hp-set-row.stack { flex-direction: column; align-items: stretch; gap: 6px; padding: 10px 0; }
.hp-set-row.stack > .hp-select { width: 100%; }
.hp-set-more { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; min-height: 44px; color: var(--hp-accent); font-size: 14px; font-weight: 500; border-top: 1px solid rgba(255,255,255,.07); }
.hp-set-more ha-icon { --mdc-icon-size: 18px; }
.hp-input { width: 100%; box-sizing: border-box; height: 42px; border-radius: 14px; border: 1px solid var(--hp-border); background: var(--hp-glass-2); color: inherit; font: inherit; padding: 0 14px; margin: 6px 0 8px; outline: none; }
.hp-input:focus { border-color: var(--hp-accent); }
.hp-pat-add { display: flex; gap: 8px; align-items: center; }
.hp-pat-add .hp-input { flex: 1; }
.hp-toggle.locked, .locked { opacity: .45; pointer-events: none; }
.hp-set-title { font-weight: 500; font-size: 15px; margin: 14px 0 2px; }
.hp-set-title + small { display: block; color: var(--hp-sub); font-size: 12.5px; margin-bottom: 10px; }
.hp-preview { display: flex; justify-content: center; padding: 6px 0 14px; }
.hp-preview .hp-tile { width: 170px; height: 128px; cursor: default; }
.hp-layout-pick { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.hp-layout-opt { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 14px; border-radius: 16px; background: var(--hp-glass); border: 1.5px solid var(--hp-border); }
.hp-layout-opt small { color: var(--hp-sub); font-size: 12px; line-height: 1.3; }
.hp-layout-opt.active { border-color: #f7f1ea; background: var(--hp-glass-2); }
.hp-swatch-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.hp-bg-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; }
.hp-bg-opt { height: 66px; border-radius: 14px; display: flex; align-items: flex-end; padding: 8px 10px; font-size: 12px; font-weight: 500; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.5); border: 2px solid transparent; }
.hp-bg-opt.active { border-color: #f7f1ea; }
.hp-seg { display: inline-flex; background: rgba(255,255,255,.08); border-radius: 999px; padding: 3px; flex-wrap: wrap; }
.hp-seg button { height: 30px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--hp-sub); }
.hp-seg button.active { background: #f7f1ea; color: #2b2125; }
.hp-row-btns { display: flex; gap: 2px; }


/* ---------- smaller screens ---------- */
.hp-side-panel .hp-room-nav { flex-direction: column !important; overflow: visible !important; }
.hp-side-panel .hp-nav-item { height: 40px !important; border-radius: 12px !important; background: transparent; border: 0 !important; }
.hp-side-panel .hp-nav-item.active { background: #f7f1ea; }
@container (max-width: 980px) { .hp-pill small { display: none; } }
@container (max-width: 860px) {
  .hp-rooms { grid-template-columns: 1fr; }
  .hp-room-nav { flex-direction: row; overflow-x: auto; scrollbar-width: none; position: static; gap: 6px; }
  .hp-nav-item { flex: none; height: 36px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); padding: 0 10px 0 4px; }
  .hp-nav-item.active { border-color: transparent; }
  .hp-rooms .hp-room-nav .hp-nav-floor { display: none; }
  .hp-layout-sidebar { grid-template-columns: 250px minmax(0, 1fr); gap: 18px; }
  .hp-sheet.settings .hp-sheet-body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .hp-set-nav { flex-direction: row; overflow-x: auto; scrollbar-width: none; }
  .hp-cal-layout { grid-template-columns: 1fr; }
}
@container (max-width: 640px) {
  .hp-header { padding: max(14px, env(safe-area-inset-top)) 16px 4px; flex-wrap: wrap; row-gap: 8px; }
  .hp-head-left { width: 100%; }
  .hp-head-right { margin-left: 0; padding-top: 0; order: 2; }
  .hp-clock { font-size: 38px; }
  .hp-layout { padding: 4px 16px 100px; }
  .hp-overview, .hp-items.grid { --hp-tile-min: 130px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hp-status { margin-top: 4px; }
  .hp-status-big { font-size: 24px; }
  .hp-status-btns { width: 100%; }
  .hp-status-btns .hp-btn { flex: 1; justify-content: center; }
  .hp-dock { left: 16px; transform: none; max-width: calc(100% - 84px); }
  .hp-tab { padding: 0 12px; }
  .hp-tab span { display: none; }
  .hp-tab.active > span:not(.hp-edit-minus) { display: inline; }
  .hp-fab { right: 16px; width: 44px; padding: 0; justify-content: center; }
  .hp-fab span { display: none; }
  .hp-layout-sidebar { grid-template-columns: 1fr; }
  .hp-side-panel { display: none; }
  .hp-list-cols { columns: 1; }
  .hp-player, .hp-player.compact { grid-template-columns: 84px 1fr; }
  .hp-sheet.player .hp-player { grid-template-columns: 1fr; }
  .hp-backdrop { padding: 10px; align-items: flex-end; }
  .hp-focus-slide { padding: 0 16px 20px; }
  .hp-wx-day { grid-template-columns: 50px 24px 36px 1fr 36px; gap: 6px; }
  .hp-wx-stats { grid-template-columns: repeat(2, 1fr); }
}
/* ---------- wall tablets in landscape: less chrome, grid fitted by fit.js ---------- */
@media (min-width: 700px) and (max-height: 860px) and (orientation: landscape) {
  .hp-header { padding-top: max(12px, env(safe-area-inset-top)); padding-bottom: 2px; }
  .hp-clock { font-size: 38px; }
  .hp-head-right { padding-top: 8px; }
  .hp-layout { padding-bottom: 72px; }
  .hp-layout-home { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 28px; align-content: start; }
  .hp-layout-home > * { grid-column: 1 / -1; min-width: 0; }
  .hp-layout-home > .hp-status { grid-column: 1; margin: 2px 0 12px; }
  .hp-layout-home > .hp-scenes-block { grid-column: 2; align-self: end; margin-bottom: 12px; }
  .hp-layout-home > .hp-scenes-block .hp-label { margin-bottom: 6px; }
  .hp-status-big { font-size: 23px; margin-top: 2px; }
  .hp-room-head { margin: 0 0 10px; }
  .hp-room-title { font-size: 25px; }
  .hp-room-view .hp-scenes-block { margin-bottom: 10px; }
  /* the room list scrolls on its own, the page does not */
  .hp-layout-rooms { padding-bottom: 0; }
  .hp-layout-rooms .hp-room-view { padding-bottom: 72px; }
  .hp-rooms .hp-room-nav { height: calc(var(--hp-avail, 100dvh) - 8px); max-height: none; overflow-y: auto; scrollbar-width: none; overscroll-behavior: contain;
    -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(180deg, #000 calc(100% - 28px), transparent); padding-bottom: 28px; }
  .hp-rooms .hp-room-nav::-webkit-scrollbar { display: none; }
  .hp-rooms .hp-nav-item { height: 34px; }
  /* Sidebar layout: compact panel whose room list scrolls, main side fitted */
  .hp-layout-sidebar { grid-template-columns: 250px minmax(0, 1fr); gap: 18px; }
  .hp-side-main { padding: 8px 0 72px; display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 24px; align-content: start; }
  .hp-side-main > * { grid-column: 1 / -1; min-width: 0; }
  .hp-side-main > .hp-label { display: none; }
  .hp-side-main > .hp-side-title { grid-column: 1; font-size: 26px; margin: 0 0 12px; align-self: end; }
  .hp-side-main > .hp-scenes-block { grid-column: 2; align-self: end; margin-bottom: 12px; }
  .hp-side-main > .hp-scenes-block .hp-label { display: none; }
  /* Sidebar layout: the header buttons float top right, so the panel runs from top to bottom */
  .layout-sidebar .hp-header { position: absolute; top: 0; right: 0; z-index: 4; }
  /* Rooms tab: the room name and its on/off buttons stay clear of the weather and settings in the corner. */
  .layout-sidebar .hp-side-main .hp-room-head { padding-right: 250px; flex-wrap: nowrap; align-items: flex-end; }
  .layout-sidebar .hp-header .hp-pill small { display: none; }
  /* Rooms tab: the clock stays, the room list scrolls on its own. */
  .hp-side-panel.rooms { overflow: hidden; }
  .hp-side-panel.rooms > .hp-room-nav { flex: 1 1 auto; min-height: 0; overflow-y: auto !important; scrollbar-width: none; overscroll-behavior: contain;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 10px, #000 calc(100% - 14px), transparent 100%); mask-image: linear-gradient(to bottom, transparent 0, #000 10px, #000 calc(100% - 14px), transparent 100%); padding: 6px 0 10px; }
  .hp-side-panel.rooms > .hp-room-nav::-webkit-scrollbar { display: none; }
  .layout-sidebar .hp-side-main .hp-room-head .hp-btn { width: 38px; height: 38px; padding: 0; gap: 0; justify-content: center; font-size: 0; }
  .layout-sidebar .hp-side-main .hp-room-head .hp-btn ha-icon { --mdc-icon-size: 18px; }
  .layout-sidebar .hp-side-main { padding-top: 18px; }
  .layout-sidebar .hp-side-main > .hp-scenes-block { margin-right: 270px; }
  .hp-side-panel { margin: 14px 0; padding: 16px 16px; gap: 10px; overflow-y: auto; }
  .hp-side-panel > * { flex: none; }
  .hp-side-panel .hp-clock { font-size: 40px; }

  .hp-side-panel .hp-nav-item { height: 36px !important; }
  /* security: summary and status pills on one line, then the camera wall */
  .hp-secview { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px 14px; align-items: center; }
  .hp-secview > * { grid-column: 1 / -1; min-width: 0; }
  .hp-secview > .hp-sec-summary { grid-column: 1; padding: 10px 16px; }
  .hp-secview > .hp-spill-row { grid-column: 2; }
  .hp-secview-label { margin-top: 0; }
}
.hp-fit.tight .hp-card, .hp-fit.tight .hp-tile { padding: 10px 11px 9px; }
.hp-fit.tight .hp-power, .hp-fit.tight .hp-tile-icon { width: 30px; height: 30px; }
.hp-fit.tight .hp-power ha-icon, .hp-fit.tight .hp-tile-icon ha-icon { --mdc-icon-size: 16px; }
.hp-fit.tight .hp-roomcard-name, .hp-fit.tight .hp-tile-name { font-size: 14px; }
.hp-fit.tight .hp-roomcard-foot { margin-top: 4px; }
.hp-fit.tight .hp-card-big { font-size: 19px; }
.hp-fit.tight .hp-today-body { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.hp-fit.tight .hp-today-head { margin-bottom: 2px; }
.hp-fit .hp-today-body { -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); }
.hp-fit.tighter .hp-roomcard .hp-sub { display: none; }
.roomy .hp-tile-icon, .roomy .hp-power { width: 42px; height: 42px; }
.roomy .hp-tile-icon ha-icon, .roomy .hp-power ha-icon { --mdc-icon-size: 22px; }
.roomy .hp-roomcard-name, .roomy .hp-tile-name { font-size: 17px; }
.roomy .hp-tile-state, .roomy .hp-sub, .roomy .hp-roomcard-temp { font-size: 13.5px; }
.roomy .hp-card, .roomy .hp-tile { padding: 16px 16px 15px; }
/* lights and sockets: the icon switches, the tile opens the popup */
.hp-tile-icon.hp-quick { position: relative; cursor: pointer; }
.hp-tile-icon.hp-quick::after { content: ""; position: absolute; inset: -10px; border-radius: 50%; }
.hp-tile-icon.hp-quick:active { transform: scale(.88); }
.hp-power-row { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 2px 0 18px; }
.hp-power-big { height: 48px; padding: 0 22px 0 16px; border-radius: 999px; display: inline-flex; align-items: center; gap: 10px; background: var(--hp-glass-2); border: 1px solid var(--hp-border); color: var(--hp-text); font-size: 15px; font-weight: 500; transition: background .2s, color .2s; }
.hp-power-big ha-icon { --mdc-icon-size: 20px; }
.hp-power-big.on { background: var(--hp-accent); color: #2b2125; border-color: transparent; }
.hp-readings { display: flex; gap: 6px; flex-wrap: wrap; }
.hp-readings:empty { display: none; }
/* Security edit mode: cameras to drag into order */
.hp-sec-edit { display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
.hp-cam-edit .hp-muted { margin: 0 0 4px; }
.hp-camwall.edit { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
.hp-camwall.edit .hp-camcard { overflow: visible; }
.hp-camwall.edit .hp-camcard-view { border-radius: inherit; overflow: hidden; }
.hp-camwall.edit .hp-camcard-name { border-radius: 0 0 var(--hp-radius, 18px) var(--hp-radius, 18px); }
.editing .hp-camwall.edit .hp-camcard { animation: hp-jiggle .3s ease-in-out infinite alternate; cursor: grab; touch-action: none; }
.editing .hp-camwall.edit .hp-camcard:nth-child(2n) { animation-delay: -.15s; }
.editing .hp-camwall.edit .hp-edit-minus { display: grid; }
.hp-fit.tighter .hp-tile .hp-mini { margin-top: 6px; }
/* ---------- iPhone layout: top bar with back button, fixed tab bar at the bottom ---------- */
.hp-root.layout-phone .hp-header { display: block; padding: max(10px, env(safe-area-inset-top)) 16px 4px; position: relative; top: auto; right: auto; }
.hp-ph-bar { display: flex; align-items: center; gap: 8px; min-height: 40px; }
.hp-ph-right { margin-left: auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
.hp-ph-right .hp-pill { height: 36px; padding: 0 12px 0 9px; }
.hp-ph-right .hp-pill small { display: none; }
.hp-ph-back { display: inline-flex; align-items: center; gap: 0; height: 38px; padding: 0 14px 0 4px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border);
  font-size: 15px; font-weight: 500; max-width: 55%; min-width: 0; }
.hp-ph-back ha-icon { --mdc-icon-size: 24px; }
.hp-ph-back span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ph-back:active, .hp-ph-room:active { transform: scale(.97); }
.hp-ph-edit.on { background: #f7f1ea; color: #2b2125; border-color: transparent; }
.hp-ph-title { display: flex; align-items: flex-end; gap: 10px; margin-top: 8px; min-height: 44px; }
.hp-ph-title h1 { margin: 0; flex: 1; min-width: 0; font-size: 32px; font-weight: 400; letter-spacing: -.01em; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ph-home { flex: 1; min-width: 0; }
.hp-root.layout-phone .hp-clock { font-size: 40px; }
.hp-ph-title .hp-persons { padding-bottom: 4px; }
.hp-ph-title .hp-person { width: 32px; height: 32px; }
.hp-root.layout-phone .hp-edit-hint { margin-top: 6px; }
.hp-root.layout-phone .hp-layout { padding: 6px 16px calc(66px + env(safe-area-inset-bottom)); }
.hp-root.layout-phone .hp-layout-home > .hp-status { margin-top: 2px; }
.hp-root.layout-phone .hp-room-head { margin-top: 0; }
.hp-root.layout-phone .hp-room-title:empty { display: none; }
.hp-root.layout-phone .hp-room-title { font-size: 0; margin-top: 6px; }
.hp-root.layout-phone .hp-room-title:not(:has(.hp-room-chip)) { display: none; }
.hp-root.layout-phone .hp-fab { display: none; }
.hp-root.layout-phone .hp-dock { left: 0; right: 0; bottom: 0; transform: none; max-width: none; justify-content: center; gap: 6px;
  padding: 3px 8px max(6px, calc(env(safe-area-inset-bottom) - 14px)); background: rgba(38,24,34,.78); border-top: 1px solid var(--hp-border);
  backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); }
.hp-root.layout-phone.light-bg .hp-dock { background: rgba(255,255,255,.75); }
.hp-root.layout-phone .hp-dock-tabs { flex: 1; max-width: 560px; justify-content: space-around; gap: 0; padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }
.hp-root.layout-phone .hp-tab { flex: 1 1 0; min-width: 58px; flex-direction: column; justify-content: center; gap: 2px; height: 44px; padding: 2px; border-radius: 14px;
  font-size: 10.5px; font-weight: 500; opacity: .6; background: none; color: var(--hp-text); }
.hp-root.layout-phone .hp-tab > span:not(.hp-edit-minus) { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.hp-root.layout-phone .hp-tab ha-icon { --mdc-icon-size: 22px; }
.hp-root.layout-phone .hp-tab.active { background: none; color: var(--hp-accent); opacity: 1; }
.hp-root.layout-phone .hp-tab .hp-edit-minus { top: 0; left: 6px; }
.hp-ph-rooms { display: flex; flex-direction: column; gap: 8px; }
.hp-ph-room { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 12px; min-height: 62px; cursor: pointer; }
.hp-ph-room .hp-tile-icon { width: 40px; height: 40px; }
.hp-ph-room .hp-tile-icon ha-icon { --mdc-icon-size: 21px; }
.hp-ph-room-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.hp-ph-room-text b { font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ph-room-text small { font-size: 13px; color: var(--hp-sub); font-variant-numeric: tabular-nums; }
.hp-ph-room.lit .hp-ph-room-text small { color: var(--hp-lit-sub); }
.hp-ph-chev { opacity: .45; --mdc-icon-size: 22px; }
@media (orientation: landscape) and (max-height: 500px) {
  .hp-ph-title { margin-top: 2px; min-height: 0; }
  .hp-ph-title h1 { font-size: 24px; }
  .hp-root.layout-phone .hp-clock { font-size: 28px; }
  .hp-root.layout-phone .hp-date { display: none; }
  .hp-root.layout-phone .hp-tab { height: 40px; flex-direction: row; gap: 6px; font-size: 12px; }
  .hp-root.layout-phone .hp-tab ha-icon { --mdc-icon-size: 20px; }
  .hp-root.layout-phone .hp-layout { padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); padding-bottom: calc(70px + env(safe-area-inset-bottom)); }
  .hp-root.layout-phone .hp-header { padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); }
}

/* ---------- floors in room lists ---------- */
.hp-nav-floor { display: flex; align-items: center; gap: 6px; padding: 14px 8px 4px; font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-faint); }
.hp-nav-floor:first-child { padding-top: 2px; }
.hp-nav-floor ha-icon { --mdc-icon-size: 14px; }
.hp-side-panel.rooms .hp-room-nav { gap: 1px; }
.hp-ph-views { display: none; justify-content: flex-end; gap: 4px; margin: -4px 0 8px; }
.editing .hp-ph-views { display: flex; }
.hp-ph-view { width: 34px; height: 34px; border-radius: 10px; border: 0; background: transparent; color: var(--hp-sub); display: grid; place-items: center; cursor: pointer; }
.hp-ph-view.active { background: var(--hp-glass-2); color: var(--hp-text); }
.hp-ph-view ha-icon { --mdc-icon-size: 19px; }
.hp-ph-rooms.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hp-ph-rooms.grid .hp-ph-floor { grid-column: 1 / -1; }
.hp-ph-room.small { flex-direction: column; align-items: stretch; gap: 8px; padding: 10px 10px 11px 12px; min-height: 0; }
.hp-ph-room-top { display: flex; align-items: center; justify-content: space-between; min-height: 40px; }
.hp-ph-room.small .hp-power { width: 36px; height: 36px; }
.hp-ph-room.small .hp-ph-room-text b { font-size: 15px; }
.hp-ph-room.small .hp-ph-room-text small { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ph-room.mini { gap: 8px; padding: 8px 6px 8px 8px; min-height: 58px; }
.hp-ph-room.mini .hp-tile-icon { width: 34px; height: 34px; border-radius: 11px; }
.hp-ph-room.mini .hp-tile-icon ha-icon { --mdc-icon-size: 18px; }
.hp-ph-room.mini .hp-power { width: 32px; height: 32px; }
.hp-ph-room.mini .hp-power ha-icon { --mdc-icon-size: 17px; }
.hp-ph-room.mini .hp-ph-room-text b { font-size: 14px; line-height: 1.2; }
.hp-ph-room.mini { height: 58px; }
.hp-ph-room.small .hp-ph-room-text b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.hp-ph-room.mini .hp-ph-room-text small { font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Rooms tab on tablet and desktop: every room, by floor (cards, rows or compact) */
.hp-layout-roomsall { display: flex; flex-direction: column; gap: 6px; }
.hp-rooms-views { display: flex; justify-content: flex-end; gap: 4px; }
.hp-rooms-all { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.hp-rooms-all.rows { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.hp-rooms-all.compact { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
.hp-rooms-all > .hp-roomcard { min-height: 150px; }
.hp-rooms-floor { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; margin: 12px 2px 0; color: var(--hp-sub); font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; --mdc-icon-size: 18px; }
.hp-rooms-floor:first-child { margin-top: 0; }
.hp-rooms-all .hp-ph-room-text b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sec-recent > .hp-qempty { grid-column: 1 / -1; }
.hp-set-sub { padding: 12px 14px 2px; font-size: 12px; font-weight: 600; color: var(--hp-sub); letter-spacing: .04em; text-transform: uppercase; }
.hp-set-own { display: inline-block; margin-left: 4px; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--hp-accent, #6cc7b2) 22%, transparent); color: var(--hp-text); font-size: 11px; font-weight: 600; vertical-align: 1px; }
.hp-sec-recent-head { display: flex; align-items: center; justify-content: space-between; }
.hp-sec-recent-head .hp-sec-recent-pick { width: 32px; height: 32px; --mdc-icon-size: 17px; opacity: .7; margin: -6px 0; }
.hp-ph-floor { display: flex; align-items: center; gap: 8px; padding: 16px 4px 2px; font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); }
.hp-ph-floor:first-child { padding-top: 0; }
.hp-ph-floor ha-icon { --mdc-icon-size: 15px; }
.hp-ph-floor::after { content: ""; flex: 1; height: 1px; background: var(--hp-border); }

/* ---------- Security tablet layout: slim header, pages of live cameras, page bar at the bottom ---------- */
.hp-root.layout-security .hp-header { position: relative; top: auto; right: auto; align-items: center; padding: max(10px, env(safe-area-inset-top)) 18px 8px; }
.hp-sec-head { display: flex; align-items: center; gap: 14px; min-width: 0; flex-wrap: nowrap; }
.hp-root.layout-security .hp-clock { font-size: 30px; }
.hp-root.layout-security .hp-head-left { display: none; }
.hp-root.layout-security .hp-head-right { padding-top: 0; }
.hp-root.layout-security .hp-pill small { display: none; }
.hp-sec-state { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px 0 12px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border);
  font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.hp-sec-state ha-icon { --mdc-icon-size: 20px; }
.hp-sec-state.ok ha-icon { color: var(--hp-green); }
.hp-sec-state.alert { background: rgba(239,95,103,.22); border-color: rgba(239,95,103,.55); }
.hp-sec-state.alert ha-icon { color: var(--hp-red); }
.hp-root.layout-security .hp-layout { padding: 2px 18px calc(66px + env(safe-area-inset-bottom)); }
.hp-layout-secpanel.cams { display: flex; flex-direction: column; overflow: hidden; }
.hp-secpage-cams { flex: 1; min-height: 0; display: grid; gap: 10px; grid-template-columns: repeat(var(--c), minmax(0, 1fr)); grid-template-rows: repeat(var(--r), minmax(0, 1fr)); }
.hp-camcell { container-type: size; min-width: 0; min-height: 0; display: grid; place-items: center; }
.hp-secpage-cams .hp-camcard { width: min(100cqw, calc(100cqh * var(--ar))); height: auto; aspect-ratio: var(--ar); border-radius: 16px; }
.hp-secpage-cams .hp-camcard-view .hp-cam-still, .hp-secpage-cams .hp-camcard-view .hp-cam-live { object-fit: contain; }
.hp-camcard.live-sized .hp-cam-still { opacity: 0; }
.hp-secpage-cams .hp-camcard-name { padding: 18px 10px 7px; font-size: 12.5px; }
.hp-layout-secpanel.status .hp-spill-row { margin-bottom: 16px; flex-wrap: wrap; overflow: visible; }
/* Rooms flow side by side, each as wide as its tiles, so a room with one lock does not take a whole row. */
.hp-layout-secpanel.status .hp-groups { flex-direction: row; flex-wrap: wrap; gap: 16px 26px; align-items: flex-start; }
.hp-layout-secpanel.status .hp-group { flex: 0 1 auto; max-width: 100%; }
.hp-layout-secpanel.status .hp-group-head { margin: 0 2px 8px; }
.hp-layout-secpanel.status .hp-group-title { font-size: 15px; font-weight: 500; color: var(--hp-sub); }
.hp-layout-secpanel.status .hp-items.grid { display: flex; flex-wrap: wrap; gap: 10px; }
.hp-layout-secpanel.status .hp-items.grid > .hp-tile { width: 150px; height: 104px; flex: none; }
.hp-layout-secpanel.status .hp-items.grid > .hp-tile.wide, .hp-layout-secpanel.status .hp-items.grid > .hp-tile.size2 { width: 310px; }
.hp-root.layout-security .hp-dock { bottom: max(10px, env(safe-area-inset-bottom)); max-width: calc(100% - 200px); }
.hp-root.layout-security .hp-tab { height: 38px; padding: 0 18px; }
.hp-root.layout-security .hp-fab { bottom: max(10px, env(safe-area-inset-bottom)); height: 42px; }

/* ---------- iPhone Home: slim home status with a small "all off", security at a glance ---------- */
.hp-root.layout-phone .hp-layout-home > .hp-status { flex-wrap: nowrap; align-items: center; gap: 10px; margin: 2px 0 12px; }
.hp-root.layout-phone .hp-layout-home > .hp-status .hp-status-big { font-size: 21px; margin-top: 3px; }
.hp-root.layout-phone .hp-layout-home > .hp-status .hp-status-btns { width: auto; flex: none; }
.hp-root.layout-phone .hp-layout-home > .hp-status .hp-btn { flex: none; height: 32px; padding: 0 12px; font-size: 12.5px; gap: 5px; }
.hp-home-sec { margin: 0 0 14px; }
.hp-home-sec .hp-edit-tools { margin-top: 8px; }
.hp-spill-row.compact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; overflow: visible; margin: 0; padding: 0; }
.hp-spill-row.compact .hp-spill { position: relative; }
.editing .hp-spill-row.compact .hp-spill { animation: hp-jiggle .3s ease-in-out infinite alternate; cursor: grab; touch-action: none; }
.editing .hp-spill-row.compact .hp-spill:nth-child(2n) { animation-delay: -.15s; }
.hp-spill-row.compact .hp-spill { max-width: none; padding: 5px 10px 5px 5px; gap: 8px; border-radius: 14px; }
.hp-spill-row.compact .hp-spill-icon { width: 28px; height: 28px; }
.hp-spill-row.compact .hp-spill-icon ha-icon { --mdc-icon-size: 16px; }
.hp-spill-row.compact .hp-spill-text b { font-size: 12.5px; }
.hp-spill-row.compact .hp-spill-text small { font-size: 11px; }

/* ---------- Energy page ---------- */
.hp-energy { display: flex; flex-direction: column; gap: 14px; }
.hp-en-bar-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: space-between; }
.hp-en-nav { display: flex; align-items: center; gap: 8px; }
.hp-en-nav .hp-round { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-en-nav .hp-round:disabled { opacity: .3; }
.hp-en-title { font-size: 15px; font-weight: 500; min-width: 120px; text-align: center; }
.hp-overview.hp-favgrid { grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); grid-auto-rows: calc((var(--hp-tile-h) - var(--hp-gap)) / 2); }
.hp-favgrid > .fs-2x2 { grid-column: span 2; grid-row: span 2; }
.hp-favgrid > .fs-2x1 { grid-column: span 2; grid-row: span 1; }
.hp-favgrid > .fs-4x1 { grid-column: span 4; grid-row: span 1; }
.hp-favgrid > .fs-4x2 { grid-column: span 4; grid-row: span 2; }
.hp-favgrid > .hp-addcard { grid-column: span 2; grid-row: span 2; }
.hp-fav-size { width: auto !important; min-width: 30px; padding: 0 6px; border-radius: 11px !important; font-size: 11px; font-weight: 600; }
/* Half-height favourites: one line, icon left, buttons right. */
.hp-favgrid > .short { flex-direction: row; align-items: center; gap: 10px; padding: 8px 10px 8px 9px; }
.hp-favgrid > .short .hp-tile-icon, .hp-favgrid > .short .hp-power { width: 34px; height: 34px; flex: none; }
.hp-favgrid > .short .hp-tile-icon ha-icon, .hp-favgrid > .short .hp-power ha-icon { --mdc-icon-size: 18px; }
.hp-favgrid > .hp-roomcard.short .hp-roomcard-top { flex: none; }
.hp-favgrid > .hp-roomcard.short .hp-roomcard-temp { display: none; }
.hp-favgrid > .hp-roomcard.short .hp-roomcard-bottom { margin-top: 0; flex: 1; min-width: 0; align-items: center; }
.hp-favgrid > .hp-roomcard.short .hp-roomcard-info { flex: 1; min-width: 0; }
.hp-favgrid > .hp-roomcard.short .hp-roomcard-name { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-favgrid > .short .hp-sub, .hp-favgrid > .short .hp-tile-state { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-favgrid > .short .hp-dots, .hp-favgrid > .short .hp-cover-bar, .hp-favgrid > .short .hp-slider.mini { display: none; }
.hp-favgrid > .hp-tile.short .hp-tile-top { flex: none; }
.hp-favgrid > .hp-tile.short .hp-tile-text { margin-top: 0; flex: 1; }
.hp-favgrid > .hp-tile.short .hp-tile-name { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-fav-roomrow { display: flex; align-items: center; gap: 6px; }
.hp-fav-roomrow > .hp-add-row { flex: 1; min-width: 0; }
.hp-fav-devs { display: flex; flex-direction: column; gap: 2px; margin: 0 0 8px 22px; padding-left: 10px; border-left: 2px solid var(--hp-border); }
.hp-cat.shades .hp-cat-ic { background: #8fb3d9; color: #14202c; }
.hp-cat.shades:not(.active) .hp-cat-ic { background: var(--hp-glass-2); color: var(--hp-text); }
.hp-favgrid > .hp-tile .hp-tile-state[data-room]::before { content: attr(data-room) " · "; }
.hp-home-fav { display: flex; flex-direction: column; gap: 10px; }
.hp-home-label { display: flex; align-items: center; gap: 8px; margin: 6px 2px 0; }
.hp-onnow-sec { display: flex; flex-direction: column; gap: 10px; }
.hp-onnow { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.hp-root.layout-phone .hp-onnow { grid-template-columns: 1fr 1fr; }
.hp-onpill { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 10px 6px 6px; min-height: 46px; border-radius: 14px; background: var(--hp-glass); border: 1px solid var(--hp-border); cursor: pointer; }
.hp-onpill-ic { width: 32px; height: 32px; border-radius: 10px; border: 0; flex: none; display: grid; place-items: center; background: var(--hp-glass-2); color: inherit; cursor: pointer; }
.hp-onpill.on .hp-onpill-ic { background: #f6c945; color: #3a2a12; }
.hp-onpill.appliance .hp-onpill-ic { background: #7fc8f8; color: #10222f; }
/* Appliance popup */
.hp-sheet.appliance { width: min(520px, 96vw); }
.hp-app-hero { --c: #7fc8f8; --c2: #3d8fd6; display: flex; align-items: center; gap: 20px; padding: 18px; border-radius: 24px;
  background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%), var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-app-hero.dryer { --c: #ffb26b; --c2: #e0703a; }
.hp-app-hero.dish { --c: #8fe0d0; --c2: #2fa58f; }
.hp-app-dial { position: relative; width: 168px; height: 168px; flex: none; display: grid; place-items: center; }
.hp-app-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.hp-app-ring circle { fill: none; stroke-width: 7; stroke-linecap: round; }
.hp-app-ring .track { stroke: color-mix(in srgb, var(--hp-text) 10%, transparent); }
.hp-app-ring .bar { stroke: var(--c); stroke-dasharray: 0 100; transition: stroke-dasharray .8s ease; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 60%, transparent)); }
.hp-app-ring.idle .bar { stroke: transparent; }
.hp-app-ring.spin { animation: hp-app-spin 2.4s linear infinite; }
@keyframes hp-app-spin { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
.hp-app-drum { position: absolute; inset: 20px; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 40%, #2a2630, #141217 75%);
  box-shadow: inset 0 0 0 6px color-mix(in srgb, var(--hp-text) 9%, transparent), inset 0 8px 24px rgba(0,0,0,.55); }
.hp-app-drum.dish { border-radius: 26px; }
.hp-app-glass { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(140deg, rgba(255,255,255,.16), transparent 42%); pointer-events: none; }
.hp-app-water { position: absolute; left: -40%; width: 180%; height: 180%; top: 62%; border-radius: 42%; background: color-mix(in srgb, var(--c) 55%, transparent); opacity: .0; transition: opacity .6s, top .6s; }
.hp-app-water.two { border-radius: 38%; background: color-mix(in srgb, var(--c2) 60%, transparent); top: 68%; }
.hp-app-tumble { position: absolute; inset: 10%; border-radius: 50%; }
.hp-app-tumble b { position: absolute; width: 34%; height: 26%; border-radius: 45% 55% 50% 40%; background: color-mix(in srgb, var(--c) 70%, #fff 10%); opacity: 0; transition: opacity .6s; }
.hp-app-tumble b:nth-child(1) { left: 12%; top: 52%; }
.hp-app-tumble b:nth-child(2) { left: 52%; top: 58%; background: color-mix(in srgb, var(--c2) 80%, #fff 10%); }
.hp-app-tumble b:nth-child(3) { left: 34%; top: 14%; width: 28%; }
.hp-app-heat { position: absolute; inset: 0; background: radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--c2) 55%, transparent), transparent 60%); opacity: 0; transition: opacity .8s; }
.hp-app-rack { position: absolute; inset: 22% 14% 18%; border: 2px solid color-mix(in srgb, var(--hp-text) 18%, transparent); border-top: 0; border-radius: 0 0 10px 10px;
  background: repeating-linear-gradient(90deg, transparent 0 10px, color-mix(in srgb, var(--hp-text) 14%, transparent) 10px 12px); }
.hp-app-bubble { position: absolute; bottom: -12px; left: calc(12% + var(--i) * 14%); width: 10px; height: 10px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--c) 80%, #fff 20%); opacity: 0; }
.hp-app-hero.active .hp-app-water { opacity: .85; top: 55%; animation: hp-app-wave 5s linear infinite; }
.hp-app-hero.active .hp-app-water.two { top: 60%; animation-duration: 7s; animation-direction: reverse; }
.hp-app-hero.active .hp-app-tumble { animation: hp-app-tumble 2.2s cubic-bezier(.45,.05,.55,.95) infinite; }
.hp-app-hero.active .hp-app-tumble b { opacity: .5; }
.hp-app-drum::after { content: ""; position: absolute; inset: 22%; border-radius: 50%; background: radial-gradient(circle, rgba(14,12,16,.62), transparent 72%); pointer-events: none; }
.hp-app-hero.active .hp-app-heat { opacity: 1; animation: hp-app-glow 3s ease-in-out infinite; }
.hp-app-hero.active .hp-app-bubble { animation: hp-app-rise calc(2.4s + var(--i) * .35s) ease-in infinite; animation-delay: calc(var(--i) * -.6s); }
.hp-app-hero.dryer.active .hp-app-tumble { animation-duration: 3s; }
.hp-app-hero.paused .hp-app-drum *, .hp-app-hero.paused .hp-app-ring { animation-play-state: paused !important; }
@keyframes hp-app-wave { to { transform: rotate(360deg); } }
@keyframes hp-app-tumble { 0% { transform: rotate(0); } 60% { transform: rotate(250deg); } 100% { transform: rotate(360deg); } }
@keyframes hp-app-glow { 50% { opacity: .55; } }
@keyframes hp-app-rise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 20% { opacity: .9; } 100% { transform: translateY(-150px) scale(1.2); opacity: 0; } }
.hp-app-center { position: relative; display: flex; flex-direction: column; align-items: center; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
.hp-app-center b { font-size: 40px; font-weight: 600; letter-spacing: -.02em; }
.hp-app-center small { font-size: 12px; color: var(--hp-sub); margin-top: 4px; }
.hp-app-center.empty { display: none; }
.hp-app-info { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hp-app-status { align-self: flex-start; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; background: var(--hp-glass-2); color: var(--hp-sub); }
.hp-app-status[data-phase="run"] { background: var(--c); color: #10222f; }
.hp-app-status[data-phase="pause"] { background: #f6c945; color: #3a2a12; }
.hp-app-status[data-phase="done"] { background: var(--hp-green); color: #10251a; }
.hp-app-prog { font-size: 19px; font-weight: 600; display: flex; flex-direction: column; gap: 2px; }
.hp-app-prog .step { font-size: 14px; font-weight: 400; color: var(--hp-sub); }
.hp-app-eta { font-size: 14px; color: var(--hp-sub); }
.hp-app-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.hp-app-stat { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 16px; background: var(--hp-glass); }
.hp-app-stat ha-icon { color: var(--hp-sub); }
.hp-app-stat div { display: flex; flex-direction: column; min-width: 0; }
.hp-app-stat b { font-size: 16px; font-weight: 600; white-space: nowrap; }
.hp-app-stat small { font-size: 11.5px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-app-chart { margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: var(--hp-glass); }
.hp-app-chart-head { display: flex; justify-content: space-between; color: var(--hp-sub); margin-bottom: 6px; }
.hp-app-plot svg { width: 100%; height: 72px; display: block; }
.hp-app-plot .area { fill: color-mix(in srgb, #7fc8f8 22%, transparent); }
.hp-app-plot .line { fill: none; stroke: #7fc8f8; stroke-width: 1.6; vector-effect: non-scaling-stroke; }
.hp-sheet.appliance:has(.hp-app-hero.dryer) .hp-app-plot .area { fill: color-mix(in srgb, #ffb26b 22%, transparent); }
.hp-sheet.appliance:has(.hp-app-hero.dryer) .hp-app-plot .line { stroke: #ffb26b; }
.hp-sheet.appliance:has(.hp-app-hero.dish) .hp-app-plot .area { fill: color-mix(in srgb, #8fe0d0 22%, transparent); }
.hp-sheet.appliance:has(.hp-app-hero.dish) .hp-app-plot .line { stroke: #8fe0d0; }
.hp-app-hints { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.hp-app-hint { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: color-mix(in srgb, #f6c945 14%, transparent); border: 1px solid color-mix(in srgb, #f6c945 30%, transparent); font-size: 14px; }
.hp-app-hint ha-icon { color: #f6c945; }
.hp-app-runs:not(:empty) { margin-top: 14px; }
.hp-app-run { display: grid; grid-template-columns: 92px 1fr auto; gap: 10px; padding: 9px 2px; border-bottom: 1px solid var(--hp-border); font-size: 14px; }
.hp-app-run:last-child { border-bottom: 0; }
.hp-app-run .when, .hp-app-run .dur { color: var(--hp-sub); }
.hp-app-run .what { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-sheet-actions.hp-app-foot { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
@container (max-width: 520px) {
  .hp-app-hero { flex-direction: column; text-align: center; gap: 14px; }
  .hp-app-info { align-items: center; }
  .hp-app-status { align-self: center; }
}
@media (max-width: 520px) {
  .hp-app-stat { padding: 10px; gap: 0; }
  .hp-pr-stats .hp-app-stat { gap: 10px; padding: 10px 12px; }
  .hp-app-stats:not(.hp-pr-stats) .hp-app-stat ha-icon { display: none; }
  .hp-app-hero { flex-direction: column; text-align: center; gap: 14px; }
  .hp-app-info { align-items: center; }
  .hp-app-status { align-self: center; }
}
@media (prefers-reduced-motion: reduce) { .hp-app-drum *, .hp-app-ring { animation: none !important; } }
/* Printer popup */
.hp-sheet.printer { --c: #b59cff; --c2: #7a5cf0; }
.hp-onpill.printer .hp-onpill-ic { background: #b59cff; color: #1d1433; }
.hp-notices { margin-bottom: 18px; gap: 8px; }
.hp-parcels .hp-onnow { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.hp-root.layout-phone .hp-parcels .hp-onnow, .hp-side-onnow .hp-parcels .hp-onnow { grid-template-columns: 1fr; }
.hp-onpill.parcel .hp-onpill-ic { background: #c9a27a; color: #2e1d0e; }
.hp-onpill.parcel.problem .hp-onpill-ic { background: var(--hp-red); color: #fff; }
a.hp-onpill { color: inherit; text-decoration: none; }
.hp-onpill.notice .hp-onpill-ic { background: #ffb259; color: #3a1f05; }
.hp-notice-ctl { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hp-notice-ctl > .hp-input, .hp-notice-ctl > .hp-select { flex: 1; min-width: 0; }
.hp-notice-ctl > .hp-muted { flex: 1; }
.hp-pr-media { position: relative; border-radius: 20px; overflow: hidden; aspect-ratio: 16 / 9; background: #0e0c10; margin-bottom: 12px; cursor: pointer; }
.hp-pr-media .hp-live-wrap, .hp-pr-media .hp-cam-live { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hp-pr-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 10%; }
.hp-pr-media.live .hp-pr-cover { display: none; }
.hp-pr-badge { position: absolute; left: 10px; top: 10px; display: none; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(0,0,0,.5); color: #fff; z-index: 1; }
.hp-pr-badge i { width: 8px; height: 8px; border-radius: 50%; background: var(--hp-red); animation: hp-en-pulse 1.6s ease-in-out infinite; }
.hp-pr-media.live .hp-pr-badge { display: inline-flex; }
/* The red dot only pulses while frames really arrive. */
.hp-pr-media:not(:has(.hp-live-wrap.playing)) .hp-pr-badge i { background: rgba(255,255,255,.45); animation: none; }
.hp-pr-hero { display: flex; align-items: center; gap: 18px; padding: 16px; border-radius: 22px; background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--c) 20%, transparent), transparent 70%), var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-pr-dial { position: relative; width: 116px; height: 116px; flex: none; display: grid; place-items: center; }
.hp-pr-dial .hp-app-center b { font-size: 34px; }
.hp-pr-dial .hp-app-center b span { font-size: 16px; font-weight: 500; margin-left: 1px; }
.hp-pr-left { font-size: 22px; font-weight: 600; }
.hp-app-status[data-phase="fail"] { background: var(--hp-red); color: #2a0f12; }
.hp-pr-stats { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.hp-pr-stats .hp-app-stat { min-width: 0; }
.hp-pr-stats .hp-app-stat > div { flex: 1; }
.hp-pr-fil { margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: var(--hp-glass); }
.hp-pr-fil-head { display: flex; justify-content: space-between; gap: 10px; color: var(--hp-sub); margin-bottom: 10px; }
.hp-pr-spools { display: flex; gap: 14px; flex-wrap: wrap; }
.hp-pr-spool { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.hp-pr-spool i { width: 30px; height: 30px; border-radius: 50%; box-shadow: inset 0 0 0 7px rgba(0,0,0,.25), 0 0 0 2px var(--hp-border); }
.hp-pr-spool.on i { box-shadow: inset 0 0 0 7px rgba(0,0,0,.25), 0 0 0 2px var(--hp-sheet), 0 0 0 4px var(--c); }
.hp-pr-spool.empty i { box-shadow: inset 0 0 0 2px var(--hp-border); }
.hp-pr-spool small { font-size: 11px; color: var(--hp-sub); }
.hp-app-hint.bad { background: color-mix(in srgb, var(--hp-red) 14%, transparent); border-color: color-mix(in srgb, var(--hp-red) 32%, transparent); }
.hp-app-hint.bad ha-icon { color: var(--hp-red); }
.hp-pr-foot .hp-btn.lit { background: color-mix(in srgb, #f6c945 22%, transparent); }
.hp-pr-foot .hp-btn.armed { background: var(--hp-red); color: #fff; }
.hp-pr-foot .hp-btn[hidden] { display: none; }
.hp-sheet-actions.hp-pr-foot { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.hp-app-foot .hp-btn { min-width: 0; overflow: hidden; }
.hp-app-foot .hp-btn > span, .hp-app-foot .hp-btn { text-overflow: ellipsis; }
.hp-pr-hero .hp-app-info { align-items: flex-start; text-align: left; flex: 1; }
.hp-pr-hero .hp-app-status { align-self: flex-start; }
.hp-pr-hero .hp-app-prog { font-size: 17px; line-height: 1.25; overflow-wrap: anywhere; }
.hp-pr-left { font-size: 20px; }
.hp-app-foot .hp-btn { justify-content: center; height: 42px; }
.hp-pr-foot .hp-btn.danger:not(.armed) { background: color-mix(in srgb, var(--hp-red) 16%, transparent); color: var(--hp-red); border-color: color-mix(in srgb, var(--hp-red) 35%, transparent); }
@media (max-width: 520px) { .hp-pr-hero { gap: 14px; padding: 14px; } .hp-pr-dial { width: 96px; height: 96px; } .hp-pr-dial .hp-app-center b { font-size: 28px; } }
.hp-onpill-ic ha-icon { --mdc-icon-size: 18px; }
.hp-onpill-text { display: flex; flex-direction: column; min-width: 0; }
.hp-onpill-text b { font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-onpill-text small { font-size: 11.5px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-onnow-more { align-self: flex-start; }
.hp-onnow-more[hidden] { display: none; }
.editing .hp-onnow .hp-edit-minus, .editing .hp-onnow .hp-edit-resize, .editing .hp-onnow .hp-edit-meter { display: none; }
.hp-onnow-empty { padding: 2px 4px; }
.hp-fav-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 16px; border: 1.5px dashed var(--hp-border); border-radius: var(--hp-radius); color: var(--hp-sub); text-align: center; font-size: 14px; }
.hp-fav-empty > ha-icon { --mdc-icon-size: 28px; }
.hp-home-styles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hp-home-style { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px; border-radius: 16px; border: 1px solid var(--hp-border); background: var(--hp-glass); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.hp-home-style small { color: var(--hp-sub); font-size: 12px; line-height: 1.3; }
.hp-home-style.active { border-color: var(--hp-accent); box-shadow: inset 0 0 0 1px var(--hp-accent); }
.hp-home-style.active ha-icon { color: var(--hp-accent); }
.hp-en-live-sec { display: flex; flex-direction: column; gap: 8px; }
.hp-en-live-head { display: flex; align-items: center; gap: 8px; padding: 0 4px; font-size: 11.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); }
.hp-en-live-head small { font-size: 11.5px; font-weight: 400; letter-spacing: 0; text-transform: none; opacity: .8; }
.hp-en-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--hp-green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--hp-green) 25%, transparent); animation: hp-en-pulse 2s ease-in-out infinite; }
@keyframes hp-en-pulse { 50% { opacity: .35; } }
.hp-en-bar-top.after-live { margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--hp-border); }
.hp-energy.fit .hp-en-bar-top.after-live { margin-top: 0; padding-top: 8px; }
.hp-en-now { display: flex; gap: 10px; flex-wrap: wrap; }
.hp-en-now-item { display: flex; align-items: center; gap: 10px; padding: 8px 16px 8px 12px; border-radius: 999px; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-en-now-item ha-icon { --mdc-icon-size: 20px; color: var(--hp-sub); }
.hp-en-now-item.active ha-icon { color: var(--hp-accent); }
.hp-en-now-item.solar.active ha-icon { color: var(--hp-green); }
.hp-en-now-item small { display: block; font-size: 11px; color: var(--hp-sub); }
.hp-en-now-item b { font-size: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.hp-en-body { display: flex; flex-direction: column; gap: 14px; transition: opacity .2s; }
.hp-en-body.loading { opacity: .45; }
.hp-en-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 10px; }
.hp-en-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.hp-en-card .hp-card-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--hp-sub); }
.hp-en-card .hp-tile-icon { width: 28px; height: 28px; }
.hp-en-card .hp-tile-icon ha-icon { --mdc-icon-size: 16px; }
.hp-en-big { font-size: 25px; font-weight: 400; letter-spacing: -.01em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hp-en-card.cost .hp-tile-icon { background: var(--hp-accent); color: #2b2125; }
.hp-en-card.solar .hp-tile-icon, .hp-en-card.auto .hp-tile-icon { background: rgba(92,200,121,.22); color: #7fd99a; }
.hp-en-chart { padding: 14px 16px 10px; }
.hp-en-chart-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.hp-en-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--hp-sub); }
.hp-en-legend span { display: inline-flex; align-items: center; gap: 6px; }
.hp-en-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.hp-en-info { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 13px; font-variant-numeric: tabular-nums; }
.hp-en-info small { color: var(--hp-sub); font-size: 12px; }
.hp-en-bars { display: flex; align-items: flex-end; gap: 3px; height: 190px; padding-top: 6px; }
.hp-en-col { flex: 1 1 0; min-width: 0; height: 100%; display: flex; align-items: flex-end; justify-content: center; cursor: pointer; }
.hp-en-stack { width: 72%; max-width: 34px; display: flex; flex-direction: column-reverse; gap: 2px; min-height: 0; transition: opacity .2s; }
.hp-en-stack i { display: block; min-height: 2px; border-radius: 4px; }
.hp-en-bars:hover .hp-en-col:not(.active) .hp-en-stack { opacity: .75; }
.hp-en-col.active .hp-en-stack { filter: brightness(1.12); }
.hp-en-axis { display: flex; gap: 3px; margin-top: 6px; }
.hp-en-axis span { flex: 1 1 0; min-width: 0; text-align: center; font-size: 11.5px; color: var(--hp-faint); white-space: nowrap; overflow: visible; font-variant-numeric: tabular-nums; }
.hp-en-list { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.hp-en-row { display: flex; flex-direction: column; gap: 5px; }
.hp-en-row-top { display: flex; align-items: baseline; gap: 10px; font-size: 14px; }
.hp-en-row-top b { font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-en-row-top span { font-variant-numeric: tabular-nums; }
.hp-en-row-top small { color: var(--hp-sub); font-size: 12px; font-variant-numeric: tabular-nums; min-width: 52px; text-align: right; }
.hp-en-row-top .hp-en-live { min-width: 0; color: var(--hp-accent); }
.hp-en-bar { height: 6px; border-radius: 3px; background: var(--hp-glass-2); overflow: hidden; }
.hp-en-bar i { display: block; height: 100%; border-radius: 3px; background: var(--hp-accent); }
.hp-en-rest { display: flex; justify-content: space-between; font-size: 13px; color: var(--hp-sub); padding-top: 4px; border-top: 1px solid var(--hp-border); }
@container (max-width: 640px) {
  .hp-en-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hp-en-big { font-size: 21px; }
  .hp-en-bar-top { flex-direction: column; align-items: stretch; }
  .hp-en-bar-top .hp-seg { display: flex; } .hp-en-bar-top .hp-seg button { flex: 1; }
  .hp-en-nav { justify-content: space-between; }
  .hp-en-bars { height: 150px; gap: 2px; }
  .hp-en-axis { gap: 2px; }
  .hp-en-now-item { flex: 1 1 140px; }
}

/* ---------- gate / garage popup ---------- */
.hp-gate-row { display: flex; gap: 10px; margin-top: 6px; }
.hp-gate-btn { flex: 1; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px; font-weight: 500;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: #f7efe9; transition: transform .1s, opacity .2s, background .2s; }
.hp-gate-btn ha-icon { --mdc-icon-size: 24px; }
.hp-gate-btn:active { transform: scale(.97); }
.hp-gate-btn.open { background: var(--hp-accent); color: #2b2125; border-color: transparent; }
.hp-gate-btn.close { background: #f7f1ea; color: #2b2125; border-color: transparent; }
.hp-gate-btn:disabled { opacity: .35; cursor: default; }
.hp-gate-btn.active { animation: hp-pulse 1.2s ease-in-out infinite; }
@keyframes hp-pulse { 50% { opacity: .6; } }

/* ---------- meter-only sockets and the usage block ---------- */
.hp-tile.hp-meter.on { background: var(--hp-glass); color: var(--hp-text); border-color: var(--hp-border); }
.hp-tile.hp-meter.on .hp-tile-state { color: var(--hp-accent); }
.hp-tile.hp-meter.on .hp-tile-icon { background: var(--hp-accent); color: #2b2125; border-radius: 50%; }
.hp-tile.hp-meter.running .hp-tile-icon { animation: hp-pulse 1.6s ease-in-out infinite; }
.hp-tile.hp-meter .hp-tile-state { font-variant-numeric: tabular-nums; }
.hp-usage { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
.hp-usage-now { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 16px; background: rgba(255,255,255,.06); }
.hp-usage-now ha-icon { --mdc-icon-size: 22px; color: var(--hp-accent); }
.hp-usage-now small { display: block; font-size: 12px; opacity: .6; }
.hp-usage-now b { font-size: 22px; font-weight: 500; font-variant-numeric: tabular-nums; }
.hp-usage-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.hp-usage-card { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,.06); display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hp-usage-card small { font-size: 11.5px; opacity: .6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-usage-card b { font-size: 16px; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hp-usage-card span { font-size: 12px; opacity: .7; font-variant-numeric: tabular-nums; }
.hp-usage-chart { padding: 10px 12px 8px; border-radius: 14px; background: rgba(255,255,255,.06); }
.hp-usage-chart:empty { display: none; }
.hp-usage-chart-head, .hp-usage-axis { display: flex; justify-content: space-between; font-size: 11.5px; opacity: .6; }
.hp-usage-bars { display: flex; align-items: flex-end; gap: 2px; height: 64px; margin: 6px 0 2px; }
.hp-usage-bars i { flex: 1 1 0; display: block; border-radius: 3px; background: var(--hp-accent); min-height: 1px; }

/* edit mode: switchable / meter only */
.hp-edit-meter { position: absolute; z-index: 3; top: -8px; right: -6px; height: 22px; padding: 0 8px 0 5px; border-radius: 11px; display: none; align-items: center; gap: 3px;
  font-size: 10.5px; font-weight: 600; background: rgba(43,33,37,.85); color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.hp-edit-meter ha-icon { --mdc-icon-size: 13px; }
.hp-edit-meter.active { background: var(--hp-accent); color: #2b2125; }
.editing .hp-edit-meter { display: inline-flex; }

/* side panel: home status with the security chips under it */
.hp-side-status .hp-status.compact { flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 10px; margin: 0; }
.hp-side-status .hp-status.compact .hp-status-text { flex: 1; min-width: 0; }
.hp-side-status .hp-status.compact .hp-status-big { font-size: 17px; line-height: 1.25; }
.hp-side-status .hp-status.compact .hp-status-btns { width: auto; flex: none; }
.hp-side-status .hp-status.compact .hp-btn { width: 40px; height: 40px; padding: 0; justify-content: center; gap: 0; font-size: 0; border-radius: 50%; }
.hp-side-status .hp-status.compact .hp-btn ha-icon { --mdc-icon-size: 19px; }
.hp-side-status { display: flex; flex-direction: column; gap: 10px; }
.hp-side-status .hp-home-sec { margin: 0; }
.hp-side-panel .hp-spill-row.compact { gap: 5px; }
.hp-side-panel .hp-spill-row.compact .hp-spill { padding: 4px 8px 4px 4px; gap: 6px; border-radius: 12px; }
.hp-side-panel .hp-spill-row.compact .hp-spill-icon { width: 24px; height: 24px; }
.hp-side-panel .hp-spill-row.compact .hp-spill-icon ha-icon { --mdc-icon-size: 14px; }
.hp-side-panel .hp-spill-row.compact .hp-spill-text b { font-size: 11.5px; }
.hp-side-panel .hp-spill-row.compact .hp-spill-text small { font-size: 10.5px; }

/* heating / cooling right now */
.hp-tile-top .hp-act { margin-left: auto; align-self: flex-start; display: inline-flex; color: #f39c3c; animation: hp-glow-flame 2.4s ease-in-out infinite; }
.hp-tile-top .hp-act ha-icon { --mdc-icon-size: 17px; }
.hp-act.cool { color: #6cc2f0; animation: none; }
.hp-act.small { display: inline-flex; color: #f39c3c; margin-right: 2px; animation: hp-glow-flame 2.4s ease-in-out infinite; }
.hp-act.small ha-icon { --mdc-icon-size: 13px; }
.hp-act[hidden] { display: none !important; }
.hp-tile.on .hp-tile-top .hp-act, .hp-card.lit .hp-act.small { color: #e0731c; }
@keyframes hp-glow-flame { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }

/* heating and air conditioning never glow like a lamp: glass tile, accent icon while on, warm or cool icon while working */
.hp-tile[data-domain="climate"].on, .hp-tile[data-domain="water_heater"].on { background: var(--hp-glass); color: var(--hp-text); border-color: var(--hp-border); }
.hp-tile[data-domain="climate"].on .hp-tile-state, .hp-tile[data-domain="water_heater"].on .hp-tile-state { color: var(--hp-sub); }
.hp-tile[data-domain="climate"].on .hp-tile-icon, .hp-tile[data-domain="water_heater"].on .hp-tile-icon { background: var(--hp-glass-2); color: var(--hp-accent); border-radius: 50%; }
.hp-tile[data-domain="climate"].heating .hp-tile-icon, .hp-tile[data-domain="water_heater"].heating .hp-tile-icon,
.hp-sumcard.climate.heating .hp-tile-icon { background: #f39c3c; color: #2b2125; }
.hp-tile.heating .hp-tile-state, .hp-sumcard.climate.heating .hp-sub { color: #f39c3c; }
.hp-tile[data-domain="climate"].cooling .hp-tile-icon, .hp-sumcard.climate.cooling .hp-tile-icon { background: #6cc2f0; color: #12222c; }
.hp-tile.cooling .hp-tile-state { color: #6cc2f0; }
.hp-tile.on .hp-tile-top .hp-act { color: #f39c3c; }

/* shades and gates: no lamp glow; icon and a thin position bar say open or closed */
.hp-tile[data-domain="cover"].on { background: var(--hp-glass); color: var(--hp-text); border-color: var(--hp-border); }
.hp-tile[data-domain="cover"].on .hp-tile-state { color: var(--hp-accent); }
.hp-tile[data-domain="cover"].on .hp-tile-icon { background: var(--hp-glass-2); color: var(--hp-accent); border-radius: 50%; }
.hp-tile[data-domain="cover"].closed .hp-tile-icon { color: var(--hp-faint); }
.hp-tile[data-domain="cover"].moving .hp-tile-state { color: var(--hp-accent); }
.hp-cover-bar { height: 4px; border-radius: 2px; background: var(--hp-glass-2); overflow: hidden; margin-top: 9px; flex: none; }
.hp-cover-bar i { display: block; height: 100%; width: 0; border-radius: 2px; background: var(--hp-accent); transition: width .8s ease; }
.hp-tile.moving .hp-cover-bar i { animation: hp-glow-flame 1.2s ease-in-out infinite; }
.hp-tile.hp-row .hp-cover-bar { display: none; }
.hp-devtile { --dc: #7fc8f8; --dc-ink: #10222f; }
.hp-devtile.dryer { --dc: #ffb26b; --dc-ink: #3a1f0c; }
.hp-devtile.dish { --dc: #8fe0d0; --dc-ink: #0f2a25; }
.hp-devtile.printer { --dc: #b59cff; --dc-ink: #1d1433; }
.hp-devtile.on .hp-tile-icon { background: var(--dc); color: var(--dc-ink); }
.hp-devtile .hp-cover-bar i { background: var(--dc); }
.hp-devtile .hp-cover-bar[hidden] { display: block; visibility: hidden; }

/* heating / cooling right now: a warm (or cool) wash over the tile, clearly visible but not a lamp */
.hp-tile[data-domain].heating { background: linear-gradient(140deg, rgba(243,156,60,.34), rgba(243,120,60,.10) 70%); border-color: rgba(243,156,60,.55); }
.hp-tile[data-domain].cooling { background: linear-gradient(140deg, rgba(108,194,240,.30), rgba(108,194,240,.08) 70%); border-color: rgba(108,194,240,.5); }
.hp-tile[data-domain].heating .hp-tile-state { color: #f6a957; font-weight: 500; }
.hp-tile[data-domain].cooling .hp-tile-state { color: #8fd0f3; font-weight: 500; }
.hp-tile.heating .hp-tile-top .hp-act ha-icon, .hp-tile.cooling .hp-tile-top .hp-act ha-icon { --mdc-icon-size: 21px; }
.hp-tile.heating .hp-tile-top .hp-act { color: #f6a957; opacity: 1; }

/* =====================================================================
   HausPanel look: slate, white-glowing cards, sea green, Apple-Home-like navigation
   ===================================================================== */
.hp-tab.active, .hp-btn.solid, .editing .hp-fab, .hp-side-panel .hp-nav-item.active, .hp-seg button.active { background: #ffffff; color: #1e2833; }
/* dock: icon over label */
.hp-dock-tabs { background: rgba(30,42,58,.72); border-radius: 22px; padding: 5px 8px; }
.hp-tab { flex-direction: column; justify-content: center; height: auto; min-width: 70px; padding: 6px 12px; gap: 3px; border-radius: 15px; font-size: 11px; }
.hp-tab ha-icon { --mdc-icon-size: 21px; }
.hp-tab.active { background: rgba(108,199,178,.18); color: var(--hp-accent); }
.hp-root.layout-security .hp-tab { flex-direction: row; height: 38px; font-size: 13.5px; padding: 0 16px; gap: 7px; }
/* room cards: icon + temperature on top, name/state/bars and buttons below */
.hp-roomcard-top { justify-content: space-between; align-items: flex-start; }
.hp-roomcard-top .hp-roomcard-temp { padding-top: 6px; }
.hp-roomcard-bottom { margin-top: auto; display: flex; align-items: flex-end; gap: 8px; }
.hp-roomcard-info { flex: 1; min-width: 0; }
.hp-roomcard-info .hp-roomcard-name { margin-top: 0; }
.hp-roomcard-btns { flex: none; }
.hp-dots { margin-top: 6px; gap: 4px; min-height: 5px; }
.hp-dots i, .hp-card.lit .hp-dots i { width: 16px; height: 5px; border-radius: 3px; }
.hp-card.lit .hp-dots i.on { background: #2e8c76 !important; }
.hp-roomcard .hp-tile-icon { border-radius: 50%; }
.hp-card.lit.hp-roomcard .hp-tile-icon { background: #ffd34e; color: #1c1c1e; border-radius: 50%; }
.hp-card.lit.hp-roomcard .hp-sub { color: #2e8c76; }
/* home at a glance: round category chips */
.hp-cats { display: flex; flex-wrap: wrap; gap: 9px; margin: 2px 0 16px; }
.hp-cat { display: flex; align-items: center; gap: 9px; padding: 5px 15px 5px 5px; border-radius: 24px; background: var(--hp-glass); border: 1px solid var(--hp-border); color: var(--hp-text); text-align: left; }
.hp-cat[role="button"] { cursor: pointer; }
.hp-cat-ic { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--hp-glass-2); }
.hp-cat-ic ha-icon { --mdc-icon-size: 17px; }
.hp-cat-text { display: flex; flex-direction: column; line-height: 1.2; }
.hp-cat b { font-size: 12.5px; font-weight: 600; }
.hp-cat small { font-size: 11.5px; color: var(--hp-sub); font-variant-numeric: tabular-nums; }
.hp-cat-text { min-width: 0; }
.hp-cat b, .hp-cat small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-root.layout-phone .hp-cat { min-width: 0; }
.hp-cat.light.active .hp-cat-ic { background: #ffd34e; color: #1c1c1e; }
.hp-cat.climate .hp-cat-ic { background: #7fc8f8; color: #10222f; }
.hp-cat.climate.active .hp-cat-ic { background: #f39c3c; color: #2a1606; }
.hp-cat.security.ok .hp-cat-ic { background: #5bd18b; color: #0e2a19; }
.hp-cat.security.alert .hp-cat-ic { background: #ff6b6b; color: #fff; }
.hp-cat.maint .hp-cat-ic { background: #f6b04d; color: #2a1a04; }
.hp-set-row-end { display: flex; justify-content: flex-end; padding-top: 8px; }
.hp-qrow .hp-round.small { width: 34px; height: 34px; flex: none; margin-left: 2px; --mdc-icon-size: 17px; opacity: .65; }
.hp-qval { font-size: 13px; opacity: .7; white-space: nowrap; }
.hp-qval.warn { color: #ffb15c; opacity: 1; font-weight: 600; }
.hp-cat.energy .hp-cat-ic { background: #f5c451; color: #2e2408; }
.hp-cat.today .hp-cat-ic { background: #ff8a8a; color: #2e0f0f; }
.hp-cat.off-all { margin-left: auto; background: #ffffff; color: #1e2833; border-color: transparent; padding-right: 16px; }
.hp-cat.off-all .hp-cat-ic { background: rgba(30,40,51,.08); }
.hp-cat.off-all b { font-size: 13px; }
/* scenes as landscape tiles */
.hp-scenes-wrap { align-items: stretch; }
.hp-scenes { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; overflow: visible; padding: 0; }
.hp-scene { height: 50px; border-radius: 15px; padding: 0 12px 0 9px; gap: 10px; font-size: 14px; font-weight: 500; }
.hp-scene ha-icon { width: 30px; height: 30px; border-radius: 50%; background: var(--hp-glass-2); display: grid; place-items: center; --mdc-icon-size: 16px; opacity: 1; flex: none; }
.hp-rooms-label { margin: 4px 0 10px; }
/* Panel layout: the bar at the bottom navigates; edit and settings sit top right */
.hp-head-edit { display: none; }
.hp-head-edit.on { background: #ffffff; color: #1e2833; }
.layout-sidebar .hp-head-edit { display: inline-grid; }
.layout-sidebar .hp-fab, .layout-sidebar .hp-header .hp-pill, .layout-sidebar .hp-head-right .hp-head-row { display: none !important; }
.layout-sidebar .hp-side-main { display: block !important; padding-bottom: 96px !important; }
.layout-sidebar .hp-dock { left: 50%; }
.hp-side-main > .hp-side-title { font-size: 30px; font-weight: 600; letter-spacing: -.01em; margin: 0 0 12px; }
.layout-sidebar .hp-side-main > .hp-scenes-block { margin-right: 0 !important; }
.layout-sidebar .hp-side-main > .hp-scenes-block .hp-label { display: flex !important; }
.hp-page-nav { display: flex; flex-direction: column; gap: 2px; }
.hp-page-item { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 10px; border-radius: 12px; font-size: 15px; color: var(--hp-text); opacity: .86; text-align: left; flex: none; }
.hp-page-item ha-icon { --mdc-icon-size: 20px; }
.hp-page-item.active { background: rgba(255,255,255,.14); font-weight: 600; opacity: 1; }
.hp-page-item[data-page="security"] ha-icon { color: #5bd18b; }
.hp-page-item[data-page="energy"] ha-icon { color: #f5c451; }
.hp-page-item[data-page="media"] ha-icon { color: #c7a6ff; }
.hp-page-item[data-page="page"] ha-icon { color: var(--hp-accent); }
.hp-side-panel .hp-clock { font-size: 40px; }
@media (min-width: 700px) and (max-height: 860px) and (orientation: landscape) {
  .hp-page-item { height: 36px; }
  .hp-side-panel { gap: 9px; }
  .layout-sidebar .hp-side-main { padding-top: 14px !important; }
}
/* iPhone: categories in two columns */
.hp-root.layout-phone .hp-cats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.hp-root.layout-phone .hp-cat { border-radius: 16px; }
.hp-root.layout-phone .hp-cat.off-all { grid-column: 1 / -1; margin-left: 0; justify-content: center; }
.hp-root.layout-phone .hp-scenes { grid-template-columns: 1fr 1fr; }
/* Edit mode on narrow screens: "Add scenes" goes below the scenes instead of over them. */
.hp-root.layout-phone .hp-scenes-wrap { flex-direction: column; align-items: stretch; }
.hp-root.layout-phone .hp-scenes-wrap > .hp-edit-tools.inline { align-self: flex-start; }
@container (max-width: 600px) { .hp-scenes-wrap { flex-direction: column; align-items: stretch; } .hp-scenes-wrap > .hp-edit-tools.inline { align-self: flex-start; } }

/* ---------- settings: a window with tabs on top and grouped lists ---------- */
.hp-backdrop:has(.hp-sheet.settings) { padding: 24px; background: rgba(8,12,18,.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.hp-sheet.settings { width: min(940px, 100%); height: min(700px, 100%); max-height: 100%; border-radius: 30px; background: linear-gradient(180deg, #223042, #19222f); border: 1px solid rgba(255,255,255,.1); box-shadow: 0 30px 80px rgba(0,0,0,.5); color: #eef2f6; }
.hp-sheet.settings .hp-sheet-head { padding: 22px 22px 4px 28px; }
.hp-sheet.settings .hp-sheet-title { font-size: 26px; font-weight: 600; letter-spacing: -.01em; }
.hp-sheet.settings .hp-sheet-sub { color: rgba(238,242,246,.55); font-size: 13px; }
.hp-sheet.settings .hp-sheet-body { padding: 0; display: flex; flex-direction: column; overflow: hidden; }
.hp-set-nav { display: flex; flex-direction: row; gap: 4px; padding: 10px 22px 12px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid rgba(255,255,255,.07); flex: none; }
.hp-set-tab { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1 1 0; min-width: 78px; padding: 8px 6px 7px; border-radius: 16px; color: rgba(238,242,246,.7); font-size: 12px; font-weight: 500; flex: none; }
.hp-set-tab-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--c); transition: .15s; }
.hp-set-tab-ic ha-icon { --mdc-icon-size: 20px; }
.hp-set-tab-label { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-set-tab.active { background: rgba(255,255,255,.07); color: #fff; }
.hp-set-tab.active .hp-set-tab-ic { background: var(--c); color: #fff; box-shadow: 0 6px 16px color-mix(in srgb, var(--c) 45%, transparent); }
.hp-set-pane { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; padding: 6px 28px 36px; }
.hp-set-pane > * { max-width: 760px; margin-left: auto; margin-right: auto; }
.hp-set-block { margin-top: 18px; }
.hp-set-scope { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 12px; background: var(--hp-glass); color: var(--hp-sub); font-size: 12.5px; line-height: 1.35; }
.hp-set-scope ha-icon { --mdc-icon-size: 17px; flex: none; }
.hp-set-head { font-size: 15px; font-weight: 600; margin: 0 4px 2px; }
.hp-set-hint { color: rgba(238,242,246,.55); font-size: 12.5px; margin: 0 4px 8px; line-height: 1.4; }
.hp-set-head + .hp-set-section { margin-top: 8px; }
.hp-sheet.settings .hp-set-section { border-radius: 18px; background: rgba(255,255,255,.055); border: 0; padding: 4px 16px; margin: 0; }
.hp-sheet.settings .hp-set-section:has(> .hp-preview, > .hp-layout-pick, > .hp-bg-row, > .hp-swatch-row) { padding: 14px 16px; }
.hp-sheet.settings .hp-set-row + .hp-set-row, .hp-sheet.settings .hp-set-section > * + .hp-set-row { border-top: 1px solid rgba(255,255,255,.07); }
.hp-sheet.settings .hp-set-row { min-height: 52px; padding-top: 8px; padding-bottom: 8px; }
.hp-sheet.settings .hp-set-section > .hp-muted { padding: 8px 0; margin: 0; }
.hp-sheet.settings .hp-set-label small { color: rgba(238,242,246,.5); }
.hp-sheet.settings .hp-layout-opt { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.08); }
.hp-sheet.settings .hp-layout-opt.active, .hp-sheet.settings .hp-bg-opt.active { border-color: #fff; }
.hp-sheet.settings .hp-set-nav { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
.hp-sheet.settings .hp-set-tab { min-width: 0; }
.hp-sheet.settings .hp-set-tab-label { white-space: normal; text-align: center; line-height: 1.2; }
.hp-cardpick { display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: 8px; margin: 6px 0 4px; }
.hp-cardpick-opt { height: 40px; border-radius: 11px; position: relative; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); transition: transform .12s; }
.hp-cardpick-dot { position: absolute; left: 7px; top: 7px; width: 10px; height: 10px; border-radius: 4px; background: var(--hp-accent); }
.hp-cardpick-line { position: absolute; left: 7px; right: 12px; bottom: 8px; height: 4px; border-radius: 2px; background: rgba(30,40,51,.22); }
.hp-cardpick-opt.active { box-shadow: 0 0 0 2px #19222f, 0 0 0 4px #fff; transform: translateY(-2px); }
.hp-accentpick { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 4px; }
.hp-accentpick-opt { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.hp-accentpick-opt ha-icon { --mdc-icon-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
.hp-accentpick-opt.active { box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 0%, rgba(255,255,255,.25)); transform: scale(1.12); }
/* Big screens: a bigger window, and the tabs as a list on the left. */
@container (min-width: 1100px) {
  .hp-backdrop:has(.hp-sheet.settings) { padding: 40px; }
  .hp-sheet.settings { width: min(1240px, 100%); height: min(940px, 100%); }
  .hp-sheet.settings .hp-sheet-body { flex-direction: row; }
  .hp-sheet.settings .hp-set-nav { display: flex; flex-direction: column; gap: 2px; width: 230px; padding: 12px 12px 20px 18px; overflow-y: auto; overflow-x: hidden; border-bottom: 0; border-right: 1px solid rgba(255,255,255,.07); }
  .hp-sheet.settings .hp-set-tab { flex-direction: row; justify-content: flex-start; gap: 12px; padding: 7px 10px; font-size: 14px; border-radius: 14px; }
  .hp-sheet.settings .hp-set-tab-ic { width: 34px; height: 34px; border-radius: 11px; flex: none; }
  .hp-sheet.settings .hp-set-tab-label { text-align: left; white-space: normal; line-height: 1.25; }
  .hp-set-pane { padding: 14px 40px 44px; }
  .hp-set-pane > * { max-width: 860px; }
}
@container (max-width: 640px) {
  .hp-backdrop:has(.hp-sheet.settings) { padding: 0; }
  .hp-sheet.settings { width: 100%; height: 100%; border-radius: 0; border: 0; }
  .hp-sheet.settings .hp-sheet-head { padding: max(18px, env(safe-area-inset-top)) 16px 4px 20px; }
  .hp-set-nav { padding: 8px 12px 10px; }
  .hp-sheet.settings .hp-set-nav { grid-auto-columns: 76px; }
  .hp-set-pane { padding: 4px 16px 40px; }
  /* A choice of two or three buttons goes below its label, in full width. */
  .hp-set-row:has(> .hp-seg) { flex-direction: column; align-items: stretch; gap: 8px; }
  .hp-set-row > .hp-seg { align-self: stretch; display: flex; flex-wrap: nowrap; }
  .hp-set-row > .hp-seg > button { flex: 1; }
}
/* ---------- popups behind the status chips ---------- */
.hp-sheet.qsheet { width: min(520px, 100%); }
.hp-qlist { display: flex; flex-direction: column; border-radius: 18px; background: rgba(255,255,255,.055); padding: 2px 14px; }
.hp-qrow { display: flex; align-items: center; gap: 12px; min-height: 56px; cursor: pointer; }
.hp-qrow + .hp-qrow { border-top: 1px solid rgba(255,255,255,.07); }
.hp-qrow-ic { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; background: rgba(255,255,255,.08); flex: none; }
.hp-qrow-ic ha-icon { --mdc-icon-size: 19px; }
.hp-qrow.on .hp-qrow-ic { background: #ffd34e; color: #1e2833; }
.hp-qrow.heating .hp-qrow-ic { background: #f39c3c; color: #fff; }
.hp-qrow.cooling .hp-qrow-ic { background: #4ea5f5; color: #fff; }
.hp-qrow-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hp-qrow-text b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-qrow-text small { color: rgba(247,239,233,.55); font-size: 12.5px; }
.hp-qrow-val { font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hp-qempty { padding: 18px 2px; color: rgba(247,239,233,.6); text-align: center; }
.hp-qbig { display: flex; flex-direction: column; align-items: center; padding: 8px 0 16px; }
.hp-qbig small { color: rgba(247,239,233,.6); }
.hp-qbig b { font-size: 40px; font-weight: 300; font-variant-numeric: tabular-nums; }
.hp-sheet.qsheet .hp-label { margin: 4px 2px 8px; }

/* ---------- scenes in the left panel ---------- */
.hp-side-scenes .hp-scenes-block { margin: 0; }
.hp-side-scenes .hp-label { margin: 0 2px 8px; font-size: 11px; }
.hp-side-scenes .hp-scenes { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.hp-side-onnow .hp-onnow-sec { gap: 8px; }
.hp-side-onnow .hp-label { margin: 0 2px; font-size: 11px; }
.hp-side-onnow .hp-onnow { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
.hp-side-onnow .hp-onnow > * { min-width: 0; }
.hp-side-scenes .hp-scene { height: 32px; border-radius: 12px; padding: 0 8px 0 6px; gap: 7px; font-size: 12.5px; min-width: 0; }
.hp-side-scenes .hp-scene ha-icon { width: 24px; height: 24px; --mdc-icon-size: 14px; }
.hp-side-scenes .hp-scene > span, .hp-side-scenes .hp-scene { overflow: hidden; text-overflow: ellipsis; }
.hp-side-scenes .hp-scenes-wrap { flex-direction: column; align-items: stretch; }

/* ---------- energy page fitted to a tablet ---------- */
.hp-energy.fit { gap: 10px; overflow: hidden; }
.hp-energy.fit .hp-en-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(250px, 38%); grid-template-rows: auto minmax(0, 1fr); gap: 10px; }
.hp-energy.fit .hp-en-cards { grid-column: 1 / -1; grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 6px; }
.hp-energy.fit .hp-en-card { padding: 8px 10px; gap: 2px; min-width: 0; }
.hp-energy.fit .hp-en-card .hp-card-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: .02em; }
.hp-energy.fit .hp-en-card .hp-card-label .hp-tile-icon { display: none; }
.hp-energy.fit .hp-en-row-top > small:not(.hp-en-live) { display: none; }
.hp-energy.fit .hp-en-row-top .hp-en-live { flex: none; }
.hp-energy.fit .hp-en-card .hp-card-label { font-size: 11.5px; gap: 6px; }
.hp-energy.fit .hp-en-card .hp-tile-icon { width: 22px; height: 22px; }
.hp-energy.fit .hp-en-card .hp-tile-icon ha-icon { --mdc-icon-size: 13px; }
.hp-energy.fit .hp-en-big { font-size: 17px; }
.hp-energy.fit .hp-en-card .hp-sub { font-size: 11.5px; }
.hp-energy.fit .hp-en-chart { display: flex; flex-direction: column; min-height: 0; }
.hp-energy.fit .hp-en-bars { flex: 1; height: auto; min-height: 60px; }
.hp-energy.fit .hp-en-list { min-height: 0; overflow-y: auto; scrollbar-width: none; gap: 8px; }
.hp-energy.fit .hp-en-now-item { padding: 6px 14px 6px 10px; }
.hp-energy.fit .hp-en-now-item b { font-size: 15px; }
.hp-camwall { width: 100%; justify-self: center; margin-left: auto; margin-right: auto; }
/* Security page: every camera in the same 16:9 frame (filled, not letterboxed), so the wall stays even. */
.hp-camwall .hp-camcard { aspect-ratio: 16 / 9; }
.hp-camwall .hp-camcard-view .hp-cam-still, .hp-camwall .hp-camcard-view .hp-cam-live { object-fit: cover; }

/* ---------- playlists in the player ---------- */
.hp-pl-block { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.hp-pl-head { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.hp-pl-head .hp-label { margin: 0; }
.hp-pl-search { width: 220px; height: 36px; margin: 0; }
.hp-pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; scrollbar-width: none; }
.hp-pl { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,.06); text-align: left; color: inherit; min-width: 0; }
.hp-pl-ic { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: rgba(255,255,255,.08); flex: none; }
.hp-pl-ic ha-icon { --mdc-icon-size: 18px; }
.hp-pl-name { font-size: 13.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-pl.playing { background: #fff; color: #1e2833; }
.hp-pl.playing .hp-pl-ic { background: #1db954; color: #fff; }
@container (max-width: 640px) { .hp-pl-search { width: 140px; } .hp-pl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; } }


/* Scene armed for its second tap: wins over every layout's pill style. */
.hp-scene.armed.armed { background: var(--hp-accent); color: #2b2125; border-color: transparent; animation: hp-armed 1s ease-in-out infinite alternate; }
.hp-scene.armed.armed ha-icon { background: rgba(0,0,0,.12); }
/* Names and "Tap to confirm" stay inside the pill: long names end in …, the confirm text may take two lines. */
.hp-scene { min-width: 0; }
.hp-scene > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.hp-scene.armed.armed > span { white-space: normal; line-height: 1.15; font-size: .9em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.hp-side-scenes .hp-scene.armed.armed > span { font-size: 10.5px; line-height: 1.1; }
.hp-shadegroup-n { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; background: var(--hp-glass-2); color: var(--hp-sub); }
.hp-row .hp-shadegroup-n { margin-left: auto; }
/* ---- shared popup parts */
.hp-pk-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.hp-pk-chips .hp-chip { display: inline-flex; align-items: center; gap: 6px; }
.hp-app-stat.warn b { color: #f6c945; }
.hp-pk-levels { margin-top: 14px; display: grid; gap: 10px; }
.hp-pk-level-head { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; margin-bottom: 5px; }
.hp-pk-level-head span { display: inline-flex; align-items: center; gap: 8px; color: var(--hp-sub); }
.hp-pk-level-head ha-icon { --mdc-icon-size: 18px; }
.hp-pk-level-bar { height: 7px; border-radius: 99px; background: var(--hp-glass-2); overflow: hidden; }
.hp-pk-level-bar i { display: block; height: 100%; border-radius: inherit; background: var(--hp-green); transition: width .6s; }
.hp-pk-level[data-tone="warn"] .hp-pk-level-bar i { background: #f6c945; }
.hp-pk-level[data-tone="bad"] .hp-pk-level-bar i { background: var(--hp-red); }
.hp-pk-chart .area { fill: color-mix(in srgb, #ffb26b 18%, transparent); }
.hp-pk-chart .line { fill: none; stroke-width: 1.8; vector-effect: non-scaling-stroke; }
.hp-pk-chart .line.now { stroke: #ffb26b; }
.hp-pk-chart .line.target { stroke: color-mix(in srgb, var(--hp-text) 45%, transparent); stroke-dasharray: 4 4; }
.hp-app-foot .hp-btn[hidden] { display: none; }
.hp-app-foot .hp-btn.lit { background: color-mix(in srgb, #7fc8f8 24%, transparent); border-color: color-mix(in srgb, #7fc8f8 45%, transparent); }
.hp-app-foot .hp-btn.armed { background: var(--hp-red); color: #fff; }
.hp-sheet.appliance .hp-app-stats .hp-app-stat b { overflow: hidden; text-overflow: ellipsis; }

/* ---- vacuum */
.hp-vac-hero { --c: #9be7c4; --c2: #3fae86; align-items: center; }
.hp-vac-floor { position: relative; width: 168px; height: 168px; flex: none; border-radius: 26px; overflow: hidden;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 20px, transparent 20px 42px), linear-gradient(160deg, #3a2f2a, #231d1b); border: 1px solid var(--hp-border); }
.hp-vac-dock { position: absolute; left: 50%; bottom: 0; width: 46px; height: 16px; margin-left: -23px; border-radius: 8px 8px 0 0; background: #e9e4de; box-shadow: 0 0 0 2px rgba(0,0,0,.2); }
.hp-vac-robot { position: absolute; left: 50%; bottom: 14px; width: 48px; height: 48px; margin-left: -24px; border-radius: 50%; background: radial-gradient(circle at 50% 40%, #fafafa, #cfcfd4 70%); box-shadow: 0 6px 14px rgba(0,0,0,.45); transition: bottom .8s; }
.hp-vac-robot .eye { position: absolute; left: 50%; top: 9px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: #2b2b33; box-shadow: inset 0 0 0 3px #4a4a55; }
.hp-vac-robot .brush { position: absolute; inset: -5px; border-radius: 50%; border: 2px dashed transparent; }
.hp-vac-trail { position: absolute; inset: 0; opacity: 0; transition: opacity 1s;
  background: repeating-linear-gradient(0deg, color-mix(in srgb, var(--c) 16%, transparent) 0 18px, transparent 18px 36px); }
.hp-vac-hero[data-phase="run"] .hp-vac-trail { opacity: 1; animation: hp-vac-trail 6s linear infinite; }
.hp-vac-hero[data-phase="run"] .hp-vac-robot { animation: hp-vac-drive 9s ease-in-out infinite; }
.hp-vac-hero[data-phase="run"] .hp-vac-robot .brush { border-color: color-mix(in srgb, var(--c) 70%, transparent); animation: hp-app-wave 1.2s linear infinite; }
.hp-vac-hero[data-phase="home"] .hp-vac-robot { animation: hp-vac-home 3s ease-in-out infinite alternate; }
.hp-vac-hero.charging .hp-vac-robot .eye { background: var(--c); box-shadow: 0 0 10px var(--c); animation: hp-app-glow 2s ease-in-out infinite; }
.hp-vac-hero[data-phase="pause"] .hp-vac-robot { left: 30%; bottom: 60%; }
@keyframes hp-vac-drive { 0% { left: 50%; bottom: 14px; } 15% { left: 22%; bottom: 60%; } 32% { left: 22%; bottom: 112px; } 48% { left: 78%; bottom: 112px; } 64% { left: 78%; bottom: 48px; } 80% { left: 40%; bottom: 80px; } 100% { left: 50%; bottom: 14px; } }
@keyframes hp-vac-home { from { bottom: 70px; } to { bottom: 24px; } }
@keyframes hp-vac-trail { to { background-position: 0 72px; } }
.hp-vac-batt { position: relative; height: 26px; width: 150px; max-width: 100%; border-radius: 9px; background: var(--hp-glass-2); overflow: hidden; }
.hp-vac-batt i { position: absolute; inset: 0 auto 0 0; background: var(--hp-green); opacity: .55; transition: width .6s; }
.hp-vac-batt[data-tone="warn"] i { background: #f6c945; }
.hp-vac-batt[data-tone="bad"] i { background: var(--hp-red); }
.hp-vac-batt span { position: relative; display: block; font-size: 13px; font-weight: 600; line-height: 26px; padding: 0 10px; }

/* ---- thermostat */
.hp-th-hero { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 0 4px; }
.hp-th-dial { position: relative; width: min(260px, 64vw); aspect-ratio: 1; }
.hp-th-svg { width: 100%; height: 100%; touch-action: none; cursor: pointer; }
.hp-th-svg .track { fill: none; stroke: var(--hp-glass-2); stroke-width: 16; stroke-linecap: round; }
.hp-th-svg .fill { fill: none; stroke: url(#hpThGrad); stroke-width: 16; stroke-linecap: round; filter: drop-shadow(0 0 8px rgba(255,150,80,.35)); transition: d .3s; }
.hp-th-svg .ticks line { stroke: color-mix(in srgb, var(--hp-text) 22%, transparent); stroke-width: 1.4; }
.hp-th-svg .knob { fill: #fff; stroke: rgba(0,0,0,.25); stroke-width: 2; filter: drop-shadow(0 2px 6px rgba(0,0,0,.5)); }
.hp-th-svg .cur { fill: var(--hp-text); opacity: .85; }
.hp-th-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.hp-th-center b { font-size: 52px; font-weight: 600; letter-spacing: -.03em; line-height: 1; }
.hp-th-center small { color: var(--hp-sub); font-size: 14px; margin-top: 6px; }
.hp-th-action { font-size: 12.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--hp-sub); min-height: 16px; margin-bottom: 4px; }
.hp-th-hero[data-action="heat"] .hp-th-action { color: #ff9a57; }
.hp-th-hero[data-action="cool"] .hp-th-action { color: #5fb4ff; }
.hp-th-hero.off .hp-th-svg .fill, .hp-th-hero.off .hp-th-svg .knob { opacity: .2; }
.hp-th-step { width: 48px; height: 48px; flex: none; }
.hp-th-modes { justify-content: center; }

/* ---- energy flow */
.hp-ef-stage { position: relative; width: 100%; aspect-ratio: 320 / 200; border-radius: 22px; background: radial-gradient(120% 100% at 100% 50%, rgba(255,192,105,.12), transparent 60%), var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-ef-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.hp-ef-svg .base { fill: none; stroke: var(--hp-glass-2); stroke-width: 6; stroke-linecap: round; }
.hp-ef-svg .flow { fill: none; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 0.1 16; animation: hp-ef-run 2s linear infinite; }
.hp-ef-svg .flow.grid { stroke: #7fc8f8; }
.hp-ef-svg .flow.solar { stroke: #ffd166; }
.hp-ef-svg .flow.export { stroke: var(--hp-green); animation-direction: reverse; }
.hp-ef-svg .flow.off { opacity: 0; }
@keyframes hp-ef-run { to { stroke-dashoffset: -32.2; } }
.hp-ef-svg .node circle { fill: var(--hp-sheet); stroke: var(--hp-border); stroke-width: 1.5; }
.hp-ef-svg .node.home circle { stroke: #ffc069; stroke-width: 2.5; }
.hp-ef-svg .node.solar circle { stroke: #ffd166; }
.hp-ef-svg .node.grid circle { stroke: #7fc8f8; }
.hp-ef-svg text { fill: var(--hp-text); text-anchor: middle; font-family: inherit; }
.hp-ef-svg text.val { font-size: 13px; font-weight: 600; }
.hp-ef-svg text.lab { font-size: 10px; fill: var(--hp-sub); letter-spacing: .08em; text-transform: uppercase; }
.hp-ef-ic { position: absolute; transform: translate(-50%, -50%); pointer-events: none; }
.hp-ef-ic.home { --mdc-icon-size: 28px; color: #ffc069; }
.hp-ef-ic.solar { color: #ffd166; }
.hp-ef-ic.grid { color: #7fc8f8; }
.hp-ef-label { margin-top: 16px; }
.hp-ef-list { display: grid; gap: 4px; margin-top: 8px; }
.hp-ef-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 8px 4px; cursor: pointer; font-size: 14px; }
.hp-ef-row .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ef-row .bar { grid-column: 1 / -1; height: 5px; border-radius: 99px; background: var(--hp-glass); overflow: hidden; }
.hp-ef-row .bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #ffc069, #ff7a45); }

/* ---- player glow and rooms */
.hp-sheet.player.has-glow { position: relative; overflow: hidden; }
.hp-player-glow { position: absolute; inset: -60px; background-size: cover; background-position: center; filter: blur(60px) saturate(1.4); opacity: 0; transition: opacity .8s; pointer-events: none; z-index: 0; }
.hp-player-glow.on { opacity: .45; }
.hp-sheet.player.has-glow > :not(.hp-player-glow) { position: relative; z-index: 1; }
.hp-player-rooms { margin-top: 18px; }
.hp-rooms-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; margin-top: 8px; }
.hp-room-spk { padding: 10px 12px; border-radius: 16px; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-room-spk.joined { border-color: color-mix(in srgb, var(--hp-accent) 60%, transparent); background: color-mix(in srgb, var(--hp-accent) 12%, var(--hp-glass)); }
.hp-room-spk-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.hp-room-spk-top .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hp-room-spk-top small { color: var(--hp-sub); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-room-spk.joined .hp-chip { background: var(--hp-accent); color: #2b2125; }

/* ---- garden */
.hp-gd-sum { display: flex; gap: 8px; flex-wrap: wrap; }
.hp-gd-sum-item { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--hp-glass); font-size: 14px; }
.hp-gd-sum-item.on { background: color-mix(in srgb, #5fb4ff 22%, transparent); }
.hp-gd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 12px; }
.hp-gd-zone { --c: #5fb4ff; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 10px 12px; border-radius: 20px; background: var(--hp-glass); border: 1px solid var(--hp-border); cursor: pointer; text-align: center; transition: transform .1s, background .3s; }
.hp-gd-zone.pressed { transform: scale(.97); }
.hp-gd-zone.on { background: radial-gradient(100% 80% at 50% 0%, color-mix(in srgb, var(--c) 26%, transparent), transparent 75%), var(--hp-glass); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.hp-gd-dial { position: relative; width: 84px; height: 84px; display: grid; place-items: center; }
.hp-gd-ring .bar { stroke: var(--c); }
.hp-gd-ic { color: var(--hp-sub); --mdc-icon-size: 28px; }
.hp-gd-zone.on .hp-gd-ic { color: var(--c); }
.hp-gd-dial > b { position: absolute; bottom: -2px; right: -4px; font-size: 13px; padding: 2px 7px; border-radius: 99px; background: var(--c); color: #0c2236; }
.hp-gd-dial > b:empty { display: none; }
.hp-gd-spray { position: absolute; inset: 0; pointer-events: none; }
.hp-gd-spray i { position: absolute; left: 50%; top: 42%; width: 5px; height: 7px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: var(--c); opacity: 0; }
.hp-gd-zone.on .hp-gd-spray i { animation: hp-gd-drop 1.6s ease-out infinite; animation-delay: calc(var(--i) * .22s); }
@keyframes hp-gd-drop { 0% { transform: translate(-50%, 0) rotate(calc(var(--i) * 30deg - 90deg)) translateY(0); opacity: .9; } 100% { transform: translate(-50%, 0) rotate(calc(var(--i) * 30deg - 90deg)) translateY(-40px); opacity: 0; } }
.hp-gd-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hp-gd-txt .name { font-size: 14px; line-height: 1.2; }
.hp-gd-txt small { color: var(--hp-sub); font-size: 12px; }
.hp-gd-auto { font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--hp-faint); }

/* ---- pool */
.hp-pool-water { position: relative; height: 150px; border-radius: 24px; overflow: hidden; background: linear-gradient(180deg, #1f6fa8, #0d3f66); border: 1px solid var(--hp-border); display: grid; place-items: center; }
.hp-pool-water.warm { background: linear-gradient(180deg, #23a0b8, #0f5a73); }
.hp-pool-water.cold { background: linear-gradient(180deg, #2c5f9e, #13305e); }
.hp-pool-water i { position: absolute; left: -50%; width: 200%; height: 200%; border-radius: 43%; background: rgba(255,255,255,.07); animation: hp-app-wave 9s linear infinite; }
.hp-pool-water .w1 { top: 55%; }
.hp-pool-water .w2 { top: 62%; animation-duration: 13s; animation-direction: reverse; background: rgba(255,255,255,.05); }
.hp-pool-water .w3 { top: -150%; height: 220%; border-radius: 45%; background: radial-gradient(circle at 50% 100%, rgba(255,255,255,.12), transparent 40%); animation-duration: 17s; }
.hp-pool-water.still i { animation-play-state: paused; }
.hp-pool-temp { position: relative; text-align: center; text-shadow: 0 2px 12px rgba(0,0,0,.45); }
.hp-pool-temp b { display: block; font-size: 46px; font-weight: 600; letter-spacing: -.02em; line-height: 1; color: #fff; }
.hp-pool-temp small { color: rgba(255,255,255,.75); }
.hp-pool-scales { display: grid; gap: 12px; margin-top: 12px; padding: 14px; border-radius: 16px; background: var(--hp-glass); }
.hp-pool-scale .head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 8px; }
.hp-pool-scale .head span { display: inline-flex; gap: 8px; align-items: center; color: var(--hp-sub); }
.hp-pool-scale[data-tone="bad"] .head b { color: var(--hp-red); }
.hp-pool-scale .track { position: relative; height: 8px; border-radius: 99px; background: linear-gradient(90deg, #ef5f67 0%, #f6c945 25%, #5cc879 50%, #f6c945 75%, #a77bf3 100%); opacity: .9; }
.hp-pool-scale .good { position: absolute; top: -3px; bottom: -3px; border-radius: 99px; border: 2px solid rgba(255,255,255,.65); }
.hp-pool-scale .tgt { position: absolute; top: -6px; width: 2px; height: 20px; margin-left: -1px; background: #fff; opacity: .8; }
.hp-pool-scale .dot { position: absolute; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.5), inset 0 0 0 4px var(--hp-sheet); transition: left .6s; }
.hp-pool-scale .ends { display: flex; justify-content: space-between; color: var(--hp-faint); font-size: 11px; margin-top: 6px; }
.hp-pool-scale [hidden] { display: none; }

/* ---- car */
.hp-car-stage { position: relative; height: 170px; border-radius: 24px; overflow: hidden; background: radial-gradient(70% 90% at 50% 100%, rgba(255,255,255,.12), transparent 70%), linear-gradient(180deg, #2a2f38, #1a1d23); border: 1px solid var(--hp-border); display: grid; place-items: center; }
.hp-car-floor { position: absolute; left: 12%; right: 12%; bottom: 20px; height: 18px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0,0,0,.6), transparent); }
.hp-car-pic { position: relative; max-width: 92%; max-height: 150px; object-fit: contain; filter: drop-shadow(0 10px 18px rgba(0,0,0,.45)); }
.hp-car-stage.no-pic .hp-car-pic { display: none; }
.hp-car-where { position: absolute; left: 12px; top: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 999px; background: rgba(0,0,0,.45); font-size: 12.5px; font-weight: 600; color: #fff; }
.hp-car-where ha-icon { --mdc-icon-size: 16px; }
.hp-car-hero { --c: #5cc879; display: flex; gap: 18px; align-items: center; margin-top: 12px; padding: 14px; border-radius: 22px; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-car-hero[data-tone="low"] { --c: #ef5f67; }
.hp-car-dial { position: relative; width: 112px; height: 112px; flex: none; display: grid; place-items: center; }
.hp-car-dial .hp-app-center b { font-size: 28px; }
.hp-car-ring .bar { stroke: var(--c); }
.hp-car-bolt { position: absolute; top: 16%; left: 50%; transform: translateX(-50%); color: var(--c); opacity: 0; --mdc-icon-size: 16px; line-height: 0; }
.hp-car-dial .hp-app-center { position: absolute; inset: 0; justify-content: center; }
.hp-car-hero.charging .hp-car-bolt { opacity: 1; animation: hp-app-glow 1.6s ease-in-out infinite; }
.hp-car-side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.hp-car-range .total b { font-size: 30px; font-weight: 600; letter-spacing: -.02em; }
.hp-car-range .total small { margin-left: 4px; color: var(--hp-sub); }
.hp-car-range .split { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; color: var(--hp-sub); }
.hp-car-range .split span { display: inline-flex; align-items: center; gap: 4px; }
.hp-car-range .split ha-icon { --mdc-icon-size: 15px; }
.hp-car-range .split .e ha-icon { color: var(--hp-green); }
.hp-car-fuel .head { display: flex; justify-content: space-between; font-size: 13px; color: var(--hp-sub); margin-bottom: 4px; }
.hp-car-fuel .head span { display: inline-flex; align-items: center; gap: 6px; }
.hp-car-fuel .head ha-icon { --mdc-icon-size: 16px; }
.hp-car-fuel .bar { height: 7px; border-radius: 99px; background: var(--hp-glass-2); overflow: hidden; }
.hp-car-fuel .bar i { display: block; height: 100%; border-radius: inherit; background: #ffb26b; transition: width .6s; }
.hp-car-fuel[data-tone="low"] .bar i { background: var(--hp-red); }
.hp-car-charge { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--hp-sub); }
.hp-car-charge.on { color: var(--hp-green); font-weight: 600; }
.hp-car-charge ha-icon { --mdc-icon-size: 18px; }
.hp-car-trip:not(:empty) { margin-top: 12px; padding: 12px 14px; border-radius: 16px; background: var(--hp-glass); }
.hp-car-trip .row { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 8px; font-size: 14px; }
.hp-car-trip .row span { display: inline-flex; align-items: center; gap: 6px; }
.hp-car-trip ha-icon { --mdc-icon-size: 17px; color: var(--hp-sub); }
.hp-car-updated { display: flex; align-items: center; gap: 6px; color: var(--hp-faint); font-size: 12px; padding: 2px 4px; }
.hp-car-updated ha-icon { --mdc-icon-size: 14px; }

/* ---- door */
.hp-door-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; }
.hp-door-strip:empty { display: none; }
.hp-door-shot { position: relative; border-radius: 16px; overflow: hidden; aspect-ratio: 16 / 10; background: #0e0c10; }
.hp-door-shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hp-door-shot .cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 10px 7px; background: linear-gradient(transparent, rgba(0,0,0,.7)); display: flex; flex-direction: column; color: #fff; }
.hp-door-shot .cap b { font-size: 13px; }
.hp-door-shot .cap small { font-size: 11.5px; opacity: .8; }
.hp-door-rings:not(:empty) { margin-top: 14px; }
.hp-door-times { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.hp-door-times span { padding: 5px 11px; border-radius: 999px; background: var(--hp-glass); font-size: 13px; font-variant-numeric: tabular-nums; }

/* ---- leaving home */
.hp-leave { display: grid; gap: 8px; }
.hp-leave-group { padding: 12px; border-radius: 18px; background: var(--hp-glass); border: 1px solid var(--hp-border); transition: opacity .2s; }
.hp-leave-group.skip { opacity: .5; }
.hp-leave-group.open, .hp-leave-group.locks { border-color: color-mix(in srgb, #f6c945 35%, transparent); }
.hp-leave-group .head { display: flex; align-items: center; gap: 12px; }
.hp-leave-group .head .ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); flex: none; }
.hp-leave-group .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hp-leave-group .txt small { color: var(--hp-sub); font-size: 12.5px; }
.hp-leave-chk { color: var(--hp-sub); --mdc-icon-size: 26px; padding: 4px; }
.hp-leave-chk.on { color: var(--hp-green); }
.hp-leave-group .items { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.hp-leave-group .it { padding: 4px 10px; border-radius: 999px; background: var(--hp-glass-2); font-size: 12.5px; }
.hp-leave-ok { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 10px; color: var(--hp-green); --mdc-icon-size: 44px; }
.hp-leave-ok b { color: var(--hp-text); font-size: 16px; }
.hp-leave-note { margin-top: 12px; font-size: 13px; color: var(--hp-sub); text-align: center; }
.hp-leave-note[hidden] { display: none; }
.hp-devtile.car .hp-tile-icon { color: #7fc8f8; }
.hp-devtile.pool .hp-tile-icon { color: #5fb4ff; }
.hp-devtile.bell { overflow: hidden; }
.hp-devtile.bell .hp-tile-icon { color: #ffc069; }
.hp-bell-pic { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .4s; pointer-events: none; }
.hp-devtile.bell.has-pic .hp-bell-pic { opacity: .5; }
.hp-devtile.bell.has-pic::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65)); pointer-events: none; }
.hp-devtile.bell > :not(.hp-bell-pic) { position: relative; }
.hp-devtile.bell.has-pic, .hp-devtile.bell.has-pic .hp-tile-state { color: #fff; }
.hp-devtile.bell.on { box-shadow: 0 0 0 2px #ffc069; }

@media (max-width: 520px) {
  .hp-vac-floor { width: 140px; height: 140px; }
  .hp-car-hero { gap: 12px; padding: 12px; }
  .hp-car-dial { width: 92px; height: 92px; }
  .hp-th-step { width: 42px; height: 42px; }
  .hp-gd-grid { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) { .hp-vac-hero *, .hp-ef-svg .flow, .hp-gd-spray i, .hp-pool-water i { animation: none !important; } }
/* ---- heat pump */
.hp-hp-scene { --c: #ff9a6b; position: relative; display: flex; flex-direction: column; gap: 16px; padding: 16px; border-radius: 24px; background: radial-gradient(120% 120% at 100% 0%, rgba(255,122,69,.14), transparent 60%), var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-hp-unit { position: relative; width: 92px; height: 84px; border-radius: 12px; background: linear-gradient(160deg, #e9e6e2, #b9b4ae); display: grid; place-items: center; box-shadow: 0 8px 18px rgba(0,0,0,.35); }
.hp-hp-unit .out { position: absolute; bottom: -24px; left: 0; right: 0; text-align: center; color: var(--hp-sub); font-size: 12px; white-space: nowrap; }
.hp-hp-fan { position: relative; width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle, #5b5650 18%, #2d2a27 20%, #2d2a27 64%, #6c6660 66%); }
.hp-hp-fan i { position: absolute; left: 50%; top: 50%; width: 24px; height: 10px; margin: -5px 0 0 0; border-radius: 0 10px 10px 0; background: #8d877f; transform-origin: 0 50%; }
.hp-hp-fan i:nth-child(2) { transform: rotate(120deg); }
.hp-hp-fan i:nth-child(3) { transform: rotate(240deg); }
.hp-hp-fan.spin { animation: hp-app-wave 1s linear infinite; }
.hp-hp-pipes { position: relative; height: 84px; }
.hp-hp-pipes .pipe { position: absolute; left: 0; right: 0; height: 8px; border-radius: 4px; overflow: hidden; background: var(--hp-glass-2); }
.hp-hp-pipes .pipe.hot { top: 22px; }
.hp-hp-pipes .pipe.cold { top: 54px; }
.hp-hp-pipes .pipe i { position: absolute; inset: 0; opacity: .25; background: repeating-linear-gradient(90deg, currentColor 0 10px, transparent 10px 22px); }
.hp-hp-pipes .pipe.hot { color: #ff7a45; }
.hp-hp-pipes .pipe.cold { color: #5fb4ff; }
.hp-hp-scene.run .pipe i { opacity: 1; animation: hp-hp-flow 1s linear infinite; }
.hp-hp-scene.run .pipe.cold i { animation-direction: reverse; }
@keyframes hp-hp-flow { from { background-position: 0 0; } to { background-position: 22px 0; } }
.hp-hp-pipes b { position: absolute; left: 50%; transform: translateX(-50%); font-size: 13px; padding: 1px 8px; border-radius: 99px; background: var(--hp-sheet); }
.hp-hp-pipes b.flow { top: 0; color: #ff9a6b; }
.hp-hp-pipes b.ret { top: 64px; color: #8fc9ff; }
.hp-hp-target { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.hp-hp-tank { position: relative; width: 52px; height: 92px; border-radius: 26px; overflow: hidden; background: var(--hp-glass-2); border: 2px solid var(--hp-border); }
.hp-hp-tank .fill { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(0deg, #ff7a45, #ffc069); transition: height .8s; }
.hp-hp-scene.dhw.run .hp-hp-tank { border-color: #ff9a6b; box-shadow: 0 0 14px rgba(255,122,69,.45); }
.hp-hp-tank .lbl { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
.hp-hp-tank .lbl b { font-size: 15px; }
.hp-hp-tank .lbl small { font-size: 9.5px; opacity: .85; }
.hp-hp-house { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--hp-sub); --mdc-icon-size: 30px; font-size: 11px; }
.hp-hp-scene.run:not(.dhw) .hp-hp-house { color: #ff9a6b; }
.hp-hp-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hp-hp-out { display: inline-flex; align-items: center; gap: 4px; color: var(--hp-sub); font-size: 13px; --mdc-icon-size: 16px; }
.hp-hp-graphic { display: grid; grid-template-columns: 84px 1fr 58px; align-items: center; }
.hp-hp-graphic .hp-hp-unit { width: 100%; height: 76px; }
.hp-hp-graphic .hp-hp-pipes { height: 76px; margin: 0 -2px; }
.hp-hp-graphic .hp-hp-pipes .pipe { border-radius: 0; }
.hp-hp-graphic .hp-hp-pipes .pipe.hot { top: 18px; }
.hp-hp-graphic .hp-hp-pipes .pipe.cold { top: 50px; }
.hp-hp-graphic .hp-hp-pipes b { left: 50%; font-size: 12.5px; line-height: 18px; padding: 0 8px; border: 1px solid var(--hp-border); }
.hp-hp-graphic .hp-hp-pipes b.flow { top: 13px; }
.hp-hp-graphic .hp-hp-pipes b.ret { top: 45px; }
.hp-hp-graphic .hp-hp-tank { width: 100%; height: 96px; }
.hp-hp-parts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; }
.hp-hp-parts .lbl { color: var(--hp-sub); font-size: 12px; margin-right: 4px; }
.hp-hp-scene > .hp-app-status:empty { display: none; }
.hp-hp-part { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--hp-glass); color: var(--hp-sub); font-size: 12.5px; --mdc-icon-size: 16px; }
.hp-hp-part.on { background: color-mix(in srgb, #5cc879 20%, transparent); color: var(--hp-text); }
.hp-hp-part.on ha-icon { color: var(--hp-green); }
.hp-hp-part.rod.on, .hp-hp-part.boost1.on { background: color-mix(in srgb, var(--hp-red) 20%, transparent); }
.hp-sheet.heatpump .hp-pk-chart .line.now { stroke: #ff7a45; }
.hp-sheet.heatpump .hp-pk-chart .area { fill: color-mix(in srgb, #ff7a45 16%, transparent); }

/* ---- gate */
.hp-gate-hero { display: flex; align-items: center; gap: 20px; padding: 16px; border-radius: 22px; background: var(--hp-glass); border: 1px solid var(--hp-border); margin-bottom: 12px; }
.hp-gate-frame { --open: 0; position: relative; width: 150px; height: 110px; flex: none; border-radius: 10px 10px 4px 4px; overflow: hidden; background: #15171b; border: 5px solid #8a8f98; border-bottom-width: 0; }
.hp-gate-frame.gate { width: 170px; height: 90px; border-radius: 4px; }
.hp-gate-inside { position: absolute; inset: 0; display: grid; place-items: center; color: #5fb4ff; --mdc-icon-size: 46px; background: radial-gradient(circle at 50% 100%, rgba(95,180,255,.18), transparent 70%); }
.hp-gate-door { position: absolute; left: 0; right: 0; top: 0; height: 100%; display: flex; flex-direction: column; transform: translateY(calc(var(--open) * -96%)); transition: transform 1.2s ease-in-out; }
.hp-gate-door i { flex: 1; background: linear-gradient(180deg, #d9dbdf, #b4b8be); border-bottom: 2px solid #8a8f98; }
.hp-gate-frame.gate .hp-gate-door { flex-direction: row; transform: translateX(calc(var(--open) * -96%)); }
.hp-gate-frame.gate .hp-gate-door i { border-bottom: 0; border-right: 3px solid #6f747c; background: linear-gradient(90deg, #c8ccd2, #a9aeb5); }
.hp-gate-frame[data-state="opening"] .hp-gate-door, .hp-gate-frame[data-state="closing"] .hp-gate-door { animation: hp-gate-shake .5s ease-in-out infinite; }
@keyframes hp-gate-shake { 50% { filter: brightness(1.15); } }
.hp-gate-frame[data-state="open"] { border-color: #f6c945; }
.hp-sheet-actions.hp-gate-foot { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.hp-gate-foot > .hp-btn.primary, .hp-gate-foot > .hp-btn.danger { grid-column: 1 / -1; height: 48px; font-size: 15px; }
.hp-gate-hero .hp-app-info { gap: 6px; align-items: flex-start; text-align: left; flex: 1; }
.hp-gate-hero .hp-app-status { align-self: flex-start; }
.hp-gate-hero .hp-app-eta { font-size: 15px; }
/* the entry gate as a sliding fence: bars with the drive behind */
.hp-gate-frame.gate { background: linear-gradient(180deg, #1b2230, #2a2f38); border: 0; border-bottom: 4px solid #6f747c; }
.hp-gate-frame.gate .hp-gate-door { justify-content: space-around; border-top: 6px solid #a9aeb5; border-bottom: 6px solid #a9aeb5; box-sizing: border-box; }
.hp-gate-frame.gate .hp-gate-door i { flex: none; width: 6px; border-right: 0; background: linear-gradient(90deg, #d0d4da, #9ea3aa); border-radius: 2px; }
.hp-gate-frame.gate .hp-gate-inside { color: #ffc069; --mdc-icon-size: 40px; }

/* ---- visitors */
.hp-vis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 12px; }
.hp-vis-item { position: relative; border-radius: 16px; overflow: hidden; aspect-ratio: 4 / 3; background: #0e0c10; padding: 0; text-align: left; }
.hp-vis-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hp-vis-item .tag { position: absolute; left: 8px; top: 8px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.55); color: #fff; --mdc-icon-size: 16px; }
.hp-vis-item.known .tag { background: var(--hp-green); color: #10251a; }
.hp-vis-item .cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 9px 6px; background: linear-gradient(transparent, rgba(0,0,0,.75)); color: #fff; display: flex; flex-direction: column; }
.hp-vis-item .cap b { font-size: 13px; }
.hp-vis-item .cap small { font-size: 11px; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-vis-big { position: relative; margin-top: 12px; border-radius: 18px; overflow: hidden; background: #0e0c10; }
.hp-vis-big[hidden] { display: none; }
.hp-vis-big:has(video) .cap { top: 0; bottom: auto; padding: 10px 52px 22px 12px; background: linear-gradient(rgba(0,0,0,.65), transparent); pointer-events: none; }
.hp-vis-big video { width: 100%; display: block; max-height: 60vh; background: #000; }
.hp-vis-item.clip::after { content: ""; position: absolute; right: 8px; top: 10px; border-left: 9px solid rgba(255,255,255,.9); border-top: 6px solid transparent; border-bottom: 6px solid transparent; filter: drop-shadow(0 0 3px rgba(0,0,0,.6)); }
.hp-vis-big img { width: 100%; display: block; }
.hp-vis-big .cap { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 8px; padding: 22px 12px 10px; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.75)); }
.hp-vis-big .cap small { opacity: .8; margin-left: auto; }
.hp-vis-big .hp-round { position: absolute; right: 8px; top: 8px; background: rgba(0,0,0,.5); color: #fff; }

/* ---- baby */
.hp-sheet.baby.night .hp-baby-media .hp-live-wrap, .hp-sheet.baby.night .hp-baby-media .hp-cam-live { filter: brightness(.55) sepia(.35) hue-rotate(-20deg); }
.hp-sheet.baby.night { --hp-sheet: #121014; }
.baby-night .hp-live-wrap, .baby-night .hp-cam-live { filter: brightness(.55) sepia(.35) hue-rotate(-20deg); }
.hp-baby-media.crying { box-shadow: 0 0 0 3px var(--hp-red); animation: hp-baby-cry 1.2s ease-in-out infinite; }
@keyframes hp-baby-cry { 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--hp-red) 40%, transparent); } }
.hp-baby-strip { display: flex; align-items: flex-end; gap: 2px; height: 48px; }
.hp-baby-strip i { flex: 1; border-radius: 3px 3px 0 0; background: var(--hp-glass-2); }
.hp-baby-strip i.on { background: linear-gradient(0deg, #a77bf3, #e0b3ff); }
.hp-baby-axis { position: relative; height: 16px; margin-top: 6px; color: var(--hp-sub); font-size: 12px; }
.hp-baby-axis small { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; font-size: 12px; }
.hp-baby-axis small.now { right: 0; transform: none; }
.hp-baby-strip i { position: relative; }
.hp-baby-times { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; }
.hp-baby-times:empty { display: none; }
.hp-baby-times .lbl { color: var(--hp-sub); font-size: 12.5px; margin-right: 2px; }
.hp-baby-times span { padding: 4px 10px; border-radius: 999px; background: color-mix(in srgb, #a77bf3 22%, transparent); font-size: 13px; font-variant-numeric: tabular-nums; }

/* ---- network */
.hp-net-map { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0; padding: 16px 10px 14px; border-radius: 22px; background: radial-gradient(90% 70% at 50% 0%, rgba(95,180,255,.14), transparent 70%), var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-net-map .dot { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-sheet); border: 2px solid #5fb4ff; color: #5fb4ff; }
.hp-net-cloud, .hp-net-gw { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.hp-net-cloud small, .hp-net-gw small { font-size: 12px; color: var(--hp-sub); }
.hp-net-cloud .lat { color: var(--hp-text); font-weight: 600; }
.hp-net-link { width: 4px; height: 26px; margin: 4px 0; border-radius: 2px; background: repeating-linear-gradient(0deg, #5fb4ff 0 6px, transparent 6px 12px); animation: hp-net-pulse 1s linear infinite; }
@keyframes hp-net-pulse { to { background-position: 0 12px; } }
.hp-net-fan { width: 80%; height: 14px; border: 2px solid color-mix(in srgb, #5fb4ff 50%, transparent); border-bottom: 0; border-radius: 10px 10px 0 0; margin-top: 8px; }
.hp-net-nodes { display: grid; grid-template-columns: repeat(auto-fit, minmax(74px, 1fr)); gap: 8px; width: 100%; }
.hp-net-node { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; }
.hp-net-node .dot { width: 38px; height: 38px; border-color: var(--hp-green); color: var(--hp-green); --mdc-icon-size: 20px; }
.hp-net-node.sw .dot { border-color: #a77bf3; color: #a77bf3; }
.hp-net-node.down .dot { border-color: var(--hp-red); color: var(--hp-red); opacity: .8; }
.hp-net-node .nm { font-size: 11.5px; line-height: 1.15; }
.hp-net-node .cl { font-size: 10.5px; color: var(--hp-faint); }
.hp-net-map.offline .hp-net-link { background: var(--hp-red); animation: none; }
.hp-net-map.offline .hp-net-cloud .dot { border-color: var(--hp-red); color: var(--hp-red); }
.hp-net-wifi { margin-top: 14px; display: grid; gap: 8px; }
.hp-net-ssid { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; font-size: 14px; }
.hp-net-ssid .name { display: inline-flex; align-items: center; gap: 8px; --mdc-icon-size: 17px; color: var(--hp-sub); }
.hp-net-ssid .bar { grid-column: 1 / -1; height: 5px; border-radius: 99px; background: var(--hp-glass); overflow: hidden; }
.hp-net-ssid .bar i { display: block; height: 100%; background: linear-gradient(90deg, #5fb4ff, #a77bf3); border-radius: inherit; }
.hp-sheet.network .hp-pk-chart .line.now { stroke: #5fb4ff; }
.hp-sheet.network .hp-pk-chart .area { fill: color-mix(in srgb, #5fb4ff 16%, transparent); }
.hp-devtile.heatpump .hp-tile-icon { color: #ff9a6b; }
.hp-devtile.network .hp-tile-icon { color: #5fb4ff; }
.hp-devtile.baby .hp-tile-icon { color: #c9a7ff; }
@media (max-width: 520px) {
  .hp-hp-scene { padding: 14px; }
  .hp-hp-graphic { grid-template-columns: 70px 1fr 54px; }
  .hp-hp-unit { width: 76px; height: 72px; }
  .hp-hp-fan { width: 48px; height: 48px; }
  .hp-hp-fan i { width: 20px; }
  .hp-hp-house { display: none; }
  .hp-gate-hero { gap: 14px; }
  .hp-gate-frame { width: 120px; height: 90px; }
  .hp-gate-frame.gate { width: 130px; height: 74px; }
  .hp-vis-grid { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) { .hp-hp-fan, .hp-hp-pipes .pipe i, .hp-net-link { animation: none !important; } }
/* ---- overview popups */
.hp-ov-list { height: 32px; padding: 0 12px; font-size: 13px; margin-right: 6px; }
.hp-ov-label { margin: 16px 2px 8px; justify-content: space-between; }
/* security */
.hp-ov-shield { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 22px; background: radial-gradient(120% 120% at 0 0, rgba(92,200,121,.22), transparent 70%), var(--hp-glass); border: 1px solid rgba(92,200,121,.3); }
.hp-ov-shield .body { fill: rgba(92,200,121,.16); stroke: var(--hp-green); stroke-width: 3; }
.hp-ov-shield .check { fill: none; stroke: var(--hp-green); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 0; animation: hp-ov-check .9s ease-out; }
@keyframes hp-ov-check { from { stroke-dashoffset: 40; } }
.hp-ov-shield .num { font-size: 22px; font-weight: 600; fill: #f6c945; font-family: inherit; }
.hp-ov-shield.alert { background: radial-gradient(120% 120% at 0 0, rgba(246,201,69,.24), transparent 70%), var(--hp-glass); border-color: rgba(246,201,69,.38); }
.hp-ov-shield.alert .body { fill: rgba(246,201,69,.16); stroke: #f6c945; }
.hp-ov-shield.alert .check { display: none; }
.hp-ov-shield-ic { flex: none; }
.hp-ov-shield .txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hp-ov-shield .txt b { font-size: 20px; }
.hp-ov-shield .txt span { color: var(--hp-sub); font-size: 13px; line-height: 1.35; }
.hp-ov-alarm { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 4px 10px; border-radius: 999px; background: var(--hp-glass-2); font-size: 12.5px; --mdc-icon-size: 16px; }
.hp-ov-alarm[hidden] { display: none; }
.hp-ov-plan { position: relative; height: 200px; margin-top: 12px; border-radius: 20px; background: var(--hp-glass); border: 1px solid var(--hp-border); overflow: hidden; }
.hp-ov-plan svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.hp-ov-plan .house path { fill: none; stroke: color-mix(in srgb, var(--hp-text) 22%, transparent); stroke-width: 2; vector-effect: non-scaling-stroke; }
.hp-ov-plan .house path.ground { stroke-dasharray: 4 5; }
.hp-ov-plan .flab { fill: var(--hp-faint); font-size: 9px; letter-spacing: .08em; font-family: inherit; }
.hp-ov-pt { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: 0; padding: 0; color: var(--hp-sub); }
.hp-ov-pt i { width: 14px; height: 14px; border-radius: 50%; background: var(--hp-green); box-shadow: 0 0 10px var(--hp-green); }
.hp-ov-pt small { font-size: 10px; white-space: nowrap; max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
.hp-ov-pt.l { align-items: flex-start; transform: translate(-7px, -50%); }
.hp-ov-pt.r { align-items: flex-end; transform: translate(calc(-100% + 7px), -50%); }
.hp-ov-pt.l small, .hp-ov-pt.r small { max-width: 70px; }
.hp-ov-pt.open i { background: var(--hp-red); animation: hp-ov-pulse 1.4s ease-in-out infinite; }
.hp-ov-pt.open small { color: var(--hp-text); }
@keyframes hp-ov-pulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(239,95,103,.3), 0 0 12px var(--hp-red); } 50% { box-shadow: 0 0 0 9px rgba(239,95,103,.1), 0 0 18px var(--hp-red); } }
.hp-ov-cams { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
.hp-ov-cam { position: relative; flex: none; width: 128px; height: 80px; border-radius: 14px; overflow: hidden; background: #15171b; padding: 0; border: 0; }
.hp-ov-cam img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hp-ov-cam b { position: absolute; left: 7px; top: 7px; width: 7px; height: 7px; border-radius: 50%; background: var(--hp-red); }
.hp-ov-cam small { position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 7px 4px; font-size: 11px; color: #fff; text-align: left; background: linear-gradient(transparent, rgba(0,0,0,.7)); }
.hp-ov-tl { display: grid; }
.hp-ov-ev { display: grid; grid-template-columns: 44px 14px 1fr; align-items: center; gap: 8px; font-size: 14px; padding: 5px 0; }
.hp-ov-ev time { color: var(--hp-sub); font-size: 12.5px; text-align: right; font-variant-numeric: tabular-nums; }
.hp-ov-ev i { width: 10px; height: 10px; border-radius: 50%; background: var(--hp-glass-2); justify-self: center; }
.hp-ov-ev i.r { background: var(--hp-red); } .hp-ov-ev i.g { background: var(--hp-green); } .hp-ov-ev i.b { background: #5fb4ff; }
.hp-ov-ev span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ov-smoke { display: flex; flex-wrap: wrap; gap: 10px; }
.hp-ov-sm { display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: 0; padding: 0; color: var(--hp-sub); font-size: 10.5px; width: 52px; }
.hp-ov-sm i { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--hp-green); display: grid; place-items: center; font-style: normal; font-size: 11px; color: var(--hp-text); }
.hp-ov-sm.low i { border-color: #f6c945; }
.hp-ov-sm.alarm i { border-color: var(--hp-red); background: color-mix(in srgb, var(--hp-red) 30%, transparent); animation: hp-ov-pulse 1s infinite; }
.hp-ov-sm small { max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* light */
.hp-ov-chips { margin: 0 0 12px; justify-content: flex-start; }
.hp-ov-lrooms { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, calc(50% - 5px)), 1fr)); gap: 10px; }
.hp-ov-lr { --a: 0; position: relative; display: flex; flex-direction: column; gap: 2px; min-height: 120px; padding: 12px; border-radius: 20px; background: var(--hp-glass); border: 1px solid var(--hp-border); overflow: hidden; cursor: pointer; transition: background .4s; }
.hp-ov-lr[hidden] { display: none; }
.hp-ov-lr.on { background: radial-gradient(90% 90% at 50% 0%, rgba(255,196,110,var(--a)), transparent 75%), var(--hp-glass); border-color: rgba(255,196,110,.35); }
.hp-ov-lr b { font-size: 15px; }
.hp-ov-lr small { color: var(--hp-sub); font-size: 12px; }
.hp-ov-lr .dots { display: flex; gap: 4px; margin: 4px 0 10px; }
.hp-ov-lr .dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--hp-glass-2); }
.hp-ov-lr .dots i.on { background: #ffc46e; box-shadow: 0 0 6px #ffc46e; }
.hp-ov-lr .hp-ov-bri { margin-top: auto; height: 26px; border-radius: 13px; }
.hp-ov-lr .hp-ov-bri .hp-slider-fill { background: linear-gradient(90deg, #ffb35c, #ffe0a3); }
.hp-ov-kt[hidden] { display: none; }
.hp-ov-kelvin { height: 14px; border-radius: 7px; background: linear-gradient(90deg, #ff9f45, #ffe6c2, #e8f1ff, #9cc4ff) !important; }
.hp-ov-kelvin .hp-slider-fill { background: transparent !important; box-shadow: none; }
/* climate */
.hp-ov-heat { display: grid; grid-auto-flow: dense; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 8px; border-radius: 20px; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-ov-cell { position: relative; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; height: 72px; padding: 8px; border-radius: 13px; border: 0; color: #fff; text-align: left; transition: background .6s; min-width: 0; }
.hp-ov-cell.w2 { grid-column: span 2; }
.hp-ov-cell .nm { padding-right: 16px; font-size: 11px; opacity: .9; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ov-cell b { font-size: 18px; text-shadow: 0 1px 4px rgba(0,0,0,.25); }
.hp-ov-cell .tg { position: absolute; right: 8px; bottom: 9px; font-size: 10.5px; opacity: .9; }
.hp-ov-cell .f { position: absolute; right: 6px; top: 6px; --mdc-icon-size: 15px; color: #fff; filter: drop-shadow(0 0 4px rgba(255,90,40,.9)); }
.hp-ov-cell .f[hidden] { display: none; }
.hp-ov-legend { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--hp-sub); margin-top: 12px; }
.hp-ov-legend i { flex: 1; height: 8px; border-radius: 4px; background: linear-gradient(90deg, rgb(79,143,232), rgb(127,211,192), rgb(228,196,103), rgb(234,128,77)); }
/* shades */
.hp-ov-sun { position: relative; height: 100px; border-radius: 20px; overflow: hidden; border: 1px solid var(--hp-border); background: linear-gradient(180deg, #4d7fbf, #8fb7dd 70%, #e8c79a); transition: background .8s; }
.hp-ov-sun.night { background: linear-gradient(180deg, #1c1f3a, #3b2f52 70%, #6a4a5e); }
.hp-ov-sun svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.hp-ov-sun .arc { fill: none; stroke: rgba(255,255,255,.4); stroke-width: 2; stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.hp-ov-sun .sun { fill: #ffd27a; } .hp-ov-sun .glow { fill: rgba(255,210,122,.28); }
.hp-ov-sun.night .sun, .hp-ov-sun.night .glow { opacity: 0; }
.hp-ov-sun small { position: absolute; left: 12px; top: 10px; font-size: 12px; color: rgba(255,255,255,.9); }
.hp-ov-sun b { position: absolute; right: 12px; top: 10px; font-size: 12px; color: #fff; }
.hp-ov-wins { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(96px, calc(33% - 6px)), 1fr)); gap: 12px 8px; margin-top: 14px; }
.hp-ov-win { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: 0; padding: 0; color: var(--hp-text); min-width: 0; }
.hp-ov-win .frame { position: relative; width: 74px; height: 84px; border-radius: 8px; border: 4px solid #9aa0a8; overflow: hidden; background: linear-gradient(180deg, #6aa7e0, #b7d6f0); }
.hp-ov-sun.night ~ .hp-ov-wins .frame { background: linear-gradient(180deg, #1d2742, #3a4566); }
.hp-ov-win .sl { position: absolute; left: 0; right: 0; top: 0; background: repeating-linear-gradient(180deg, #d8dbe0 0 7px, #a9aeb5 7px 9px); transition: height 1.2s ease-in-out; }
.hp-ov-win .frame.duo { width: 92px; }
.hp-ov-win .mullion { position: absolute; left: 50%; top: 0; bottom: 0; width: 4px; margin-left: -2px; background: #9aa0a8; z-index: 1; }
.hp-ov-win.moving .sl { animation: hp-ov-slats .6s linear infinite; }
@keyframes hp-ov-slats { to { background-position: 0 9px; } }
.hp-ov-win b { font-size: 12.5px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-ov-win small { font-size: 11px; color: var(--hp-sub); }
@media (max-width: 520px) { .hp-ov-list span { display: none; } .hp-ov-list { width: 36px; padding: 0; justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .hp-ov-pt.open i, .hp-ov-win.moving .sl, .hp-ov-shield .check { animation: none !important; } }
/* ---- overview popups, calm version (hero ring + rows) */
.hp-ov-hero { --c: var(--hp-green); }
.hp-ov-hero.alert { --c: var(--hp-red); }
.hp-ov-hero.warm { --c: #ffc069; }
.hp-ov-hero.dark { --c: rgba(255,255,255,.25); }
.hp-ov-ring .bar { stroke: var(--c); }
.hp-ov-mid { color: var(--c); }
.hp-ov-mid > ha-icon { --mdc-icon-size: 46px; }
.hp-ov-mid b { font-size: 30px; color: var(--hp-text); }
.hp-ov-mid small { margin-top: 2px; }
.hp-ov-h1 { font-size: 18px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.hp-ov-h2 { font-size: 13.5px; }
.hp-ov-hx:empty { display: none; }
.hp-ov-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--hp-glass-2); border: 0; color: var(--hp-text); font-size: 12.5px; --mdc-icon-size: 16px; }
.hp-ov-stats .hp-app-stat { cursor: pointer; }
.hp-ov-stats .hp-app-stat[hidden] { display: none; }
.hp-ov-stats .hp-app-stat.warn { background: color-mix(in srgb, var(--hp-red) 14%, var(--hp-glass)); }
.hp-ov-stats .hp-app-stat.warn ha-icon, .hp-ov-stats .hp-app-stat.warn b { color: var(--hp-red); }
.hp-ov-list-rows { display: grid; gap: 8px; }
.hp-ov-list-rows:not(:empty) { margin-top: 12px; }
.hp-ov-row { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; column-gap: 12px; padding: 11px 14px; border-radius: 18px; background: var(--hp-glass); border: 1px solid transparent; cursor: pointer; transition: background .3s, border-color .3s; }
.hp-ov-row[hidden] { display: none; }
.hp-ov-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-sub); --mdc-icon-size: 20px; }
.hp-ov-txt { display: flex; flex-direction: column; min-width: 0; }
.hp-ov-txt b { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ov-txt small { font-size: 12.5px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ov-right { display: flex; align-items: center; gap: 8px; color: var(--hp-sub); }
.hp-ov-row.bad { background: color-mix(in srgb, var(--hp-red) 12%, var(--hp-glass)); border-color: color-mix(in srgb, var(--hp-red) 30%, transparent); }
.hp-ov-row.bad .hp-ov-ic { background: color-mix(in srgb, var(--hp-red) 22%, transparent); color: var(--hp-red); }
/* light rows */
.hp-ov-row > .hp-ov-bri { grid-column: 1 / -1; margin-top: 10px; height: 8px; border-radius: 4px; }
.hp-ov-row > .hp-ov-bri[hidden] { display: none; }
.hp-ov-row > .hp-ov-bri .hp-slider-fill { background: linear-gradient(90deg, #ffb35c, #ffe0a3); }
.hp-ov-row.lit { background: linear-gradient(100deg, rgba(255,192,105,.16), transparent 70%), var(--hp-glass); border-color: rgba(255,192,105,.22); }
.hp-ov-row.lit .hp-ov-ic { background: #ffc46e; color: #3a2a12; box-shadow: 0 0 14px rgba(255,196,110,.45); }
/* climate rows */
.hp-ov-temp { font-size: 20px; font-weight: 600; color: var(--hp-text); font-variant-numeric: tabular-nums; }
.hp-ov-row[data-tone="cool"] .hp-ov-temp { color: #8fbfff; }
.hp-ov-row[data-tone="mild"] .hp-ov-temp { color: #9fd9c8; }
.hp-ov-row[data-tone="even"] .hp-ov-temp { color: #f0d08a; }
.hp-ov-row[data-tone="warm"] .hp-ov-temp { color: #ffb36b; }
.hp-ov-row[data-tone="hot"] .hp-ov-temp { color: #ff8a5c; }
.hp-ov-row.heat .hp-ov-ic { background: color-mix(in srgb, #ff8a4c 22%, transparent); color: #ff9a5a; }
.hp-ov-label .avg { letter-spacing: 0; text-transform: none; font-size: 12px; }
.hp-sheet.ov-clim .hp-ov-label:first-of-type { margin-top: 18px; }
/* ---- security: alarm panel */
.hp-ov-alarm-card { --c: #8fa3c4; display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 22px; background: radial-gradient(120% 140% at 0 0, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%), var(--hp-glass); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.hp-ov-alarm-card[data-tone="on"] { --c: var(--hp-green); }
.hp-ov-alarm-card[data-tone="wait"] { --c: #f6c945; }
.hp-ov-alarm-card[data-tone="alarm"] { --c: var(--hp-red); animation: hp-ov-alarm 1s ease-in-out infinite; }
@keyframes hp-ov-alarm { 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--hp-red) 35%, transparent); } }
.hp-ov-alarm-ic { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; flex: none; background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--c); --mdc-icon-size: 36px; }
.hp-ov-alarm-card[data-tone="wait"] .hp-ov-alarm-ic ha-icon { animation: hp-app-glow 1.2s ease-in-out infinite; }
.hp-ov-alarm-card .txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hp-ov-alarm-card .txt b { font-size: 21px; }
.hp-ov-alarm-card .txt small { color: var(--hp-sub); font-size: 13px; }
.hp-ov-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.hp-ov-mode { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 6px; border-radius: 18px; background: var(--hp-glass); border: 1px solid var(--hp-border); color: var(--hp-sub); font-size: 13.5px; --mdc-icon-size: 26px; transition: background .2s, color .2s; }
.hp-ov-mode.active { background: #f7f1ea; color: #2b2125; border-color: transparent; font-weight: 600; }
.hp-ov-alarm-card[data-tone="on"] ~ .hp-ov-modes .hp-ov-mode.active { background: var(--hp-green); color: #10251a; }
.hp-ov-tag { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.hp-ov-tag.bad { background: color-mix(in srgb, var(--hp-red) 22%, transparent); color: var(--hp-red); }
.hp-ov-tag.warn { background: color-mix(in srgb, #f6c945 22%, transparent); color: #f6c945; }
.hp-ov-tag:not(.ok):not(.bad):not(.warn) { background: var(--hp-glass-2); color: var(--hp-sub); }
.hp-ov-banner { margin-bottom: 12px; }
.hp-ov-banner ~ .hp-ov-alarm-card { margin-top: 0; }
.hp-ov-tag.ok { background: color-mix(in srgb, var(--hp-green) 18%, transparent); color: var(--hp-green); }
.hp-ov-closed { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, calc(50% - 4px)), 1fr)); gap: 8px; }
.hp-ov-ok { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 10px 12px; border-radius: 14px; background: var(--hp-glass); border: 0; color: var(--hp-text); font-size: 13px; text-align: left; --mdc-icon-size: 18px; }
.hp-ov-ok ha-icon { color: var(--hp-green); flex: none; }
.hp-ov-ok span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ov-ok.allowed { flex-wrap: wrap; row-gap: 0; }
.hp-ov-ok.allowed ha-icon { color: var(--hp-sub); }
.hp-ov-ok.allowed small { flex-basis: 100%; padding-left: 26px; font-size: 11.5px; color: var(--hp-sub); }
.hp-se-clock.on { color: var(--hp-accent); }
.hp-set-version a { color: var(--hp-accent); text-decoration: none; }
.hp-set-version a:hover { text-decoration: underline; }
.hp-set-intro { margin: 2px auto 12px; padding: 0 4px; box-sizing: border-box; width: 100%; font-size: 13.5px; line-height: 1.45; color: var(--hp-sub); }
.hp-set-guide { display: inline-flex; align-items: center; gap: 3px; color: var(--hp-accent, #6cc7b2); text-decoration: none; font-weight: 600; white-space: nowrap; --mdc-icon-size: 15px; }
.hp-set-guide:hover { text-decoration: underline; }
/* Rain, storm or frost while windows are open (Leaving home, Good night) */
.hp-wx-warn { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; padding: 10px 14px; border-radius: 16px; background: rgba(78,165,245,.16); border: 1px solid rgba(78,165,245,.35); color: var(--hp-text); font-size: 14px; font-weight: 500; --mdc-icon-size: 20px; }
.hp-wx-warn ha-icon { color: #7cc0ff; flex: none; }
.hp-wx-warn[hidden] { display: none; }
/* Settings: worth a look */
a.hp-hint { color: inherit; text-decoration: none; }
.hp-hint .hp-qrow-ic { color: #f6c945; }
.hp-hint .hp-hint-go { color: var(--hp-sub); --mdc-icon-size: 17px; flex: none; }
/* Clip loading in the security popup */
.hp-vis-big { position: relative; }
.hp-vis-big .hp-round.full { right: 52px; }
.hp-vis-big:fullscreen { display: flex; align-items: center; justify-content: center; background: #000; border-radius: 0; margin: 0; }
.hp-vis-big:fullscreen video, .hp-vis-big:fullscreen img { width: 100%; height: 100%; object-fit: contain; }
.hp-vis-wait { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; display: grid; place-items: center; border-radius: 50%; background: rgba(0,0,0,.55); color: #fff; --mdc-icon-size: 26px; pointer-events: none; }
.hp-vis-wait ha-icon { animation: hp-spin 1s linear infinite; }
@keyframes hp-spin { to { transform: rotate(360deg); } }
/* Waste collection */
.hp-cat.waste.active .hp-cat-ic { background: var(--bin, #f6c945); color: #1d1a16; }
.hp-waste-row { align-items: center; }
.hp-waste-row.soon b { color: var(--hp-text); }
.hp-waste-bins { display: flex; gap: 4px; flex: none; }
.hp-waste-bins .bin { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: color-mix(in srgb, var(--bin) 85%, transparent); color: #1d1a16; --mdc-icon-size: 19px; }
/* Lite mode for slow tablets: no blur, no glow, no endless animations, instant changes */
.hp-root.lite *, .hp-root.lite *::before, .hp-root.lite *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; transition-duration: 0s !important; }
.hp-root.lite *:not(.hp-keep-anim), .hp-root.lite *:not(.hp-keep-anim)::before, .hp-root.lite *:not(.hp-keep-anim)::after { animation-iteration-count: 1 !important; }
.hp-root.lite .hp-bg-glow { display: none; }
.hp-root.lite .hp-backdrop { background: rgba(10,8,12,.72); }
/* Settings → System: back up and take from another panel */
.hp-take-btns { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
/* Someone in the room (presence) on room cards and rows */
.hp-presence { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(92,200,121,.22); color: #8fe0b4; flex: none; --mdc-icon-size: 14px; }
.hp-presence[hidden] { display: none; }
.hp-card.lit .hp-presence { background: rgba(46,140,118,.16); color: #2e8c76; }
.hp-ph-room > .hp-presence, .hp-ph-room-top > .hp-presence { margin-left: auto; }
.hp-ph-room-top > .hp-presence + .hp-power { margin-left: 6px; }
/* Buttons for a whole floor on its heading (room lists) */
.hp-ph-floor.has-ctl::after { display: none; }
.hp-ph-floor.has-ctl .line, .hp-rooms-floor.has-ctl .line { flex: 1; height: 1px; background: var(--hp-border); }
.hp-floor-ctl { display: flex; gap: 6px; flex: none; }
.hp-floor-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--hp-border); background: var(--hp-glass); color: var(--hp-text); display: grid; place-items: center; cursor: pointer; padding: 0; --mdc-icon-size: 17px; }
.hp-floor-btn.on { background: #ffd34e; color: #1c1c1e; border-color: transparent; }
.hp-floor-btn:active { transform: scale(.94); }
/* Welcome window */
.hp-wel-step { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 12px; padding: 12px 4px; }
.hp-wel-step + .hp-wel-step { border-top: 1px solid rgba(255,255,255,.07); }
.hp-wel-n { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-accent, #6cc7b2); color: #17202a; font-weight: 700; font-size: 14px; }
.hp-wel-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hp-wel-body > b { display: flex; align-items: center; gap: 8px; font-size: 15.5px; --mdc-icon-size: 19px; }
.hp-wel-body > p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--hp-sub); }
.hp-wel-facts { display: flex; flex-wrap: wrap; gap: 6px; }
.hp-wel-fact { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12.5px; background: var(--hp-glass-2); --mdc-icon-size: 15px; }
.hp-wel-fact.ok { color: #8fe0b4; }
.hp-wel-fact.warn { color: #f6c945; }
.hp-wel-btns { display: flex; flex-wrap: wrap; gap: 6px; }
.hp-wel-seg { align-self: flex-start; }
.hp-set-section > .hp-qlist { background: transparent; padding: 0 2px; border-radius: 0; }
.hp-allow-body { display: grid; gap: 12px; margin-top: 10px; }
.hp-allow-times { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hp-allow-times label { display: grid; gap: 4px; }
.hp-allow-times small { font-size: 12px; color: var(--hp-sub); padding-left: 4px; }
.hp-allow-times .hp-input { margin: 0; }
.hp-allow-days { display: flex; flex-wrap: wrap; gap: 6px; }
.hp-allow-days .hp-chip { height: 34px; padding: 0 11px; }
.hp-allow-days .hp-chip.on { background: #f7f1ea; color: #2b2125; border-color: transparent; }
.hp-sheet.ov-sec > .hp-sheet-body > .hp-ov-row { margin-top: 10px; }
/* code pad */
.hp-ov-dots { display: flex; justify-content: center; gap: 12px; margin: 6px 0 18px; }
.hp-ov-dots i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--hp-sub); }
.hp-ov-dots i.on { background: var(--hp-text); border-color: var(--hp-text); }
.hp-ov-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.hp-ov-key { height: 58px; border-radius: 18px; background: var(--hp-glass); border: 1px solid var(--hp-border); color: var(--hp-text); font-size: 22px; font-weight: 500; }
.hp-ov-key:active { background: var(--hp-glass-2); }
.hp-ov-key.ok { background: var(--hp-green); color: #10251a; border: 0; }
.hp-ov-key.del { color: var(--hp-sub); }
.hp-sheet.ov-pad.shake { animation: hp-ov-shake .4s; }
@keyframes hp-ov-shake { 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
/* ---- weather sky */
.hp-wx-sky { position: relative; height: 190px; border-radius: 24px; overflow: hidden; margin-bottom: 12px; border: 1px solid var(--hp-border); }
.hp-wx-sky.day { background: linear-gradient(180deg, #3d7fd1, #7db2e6 65%, #b9d5ee); }
.hp-wx-sky.day.cloudy, .hp-wx-sky.day.rain, .hp-wx-sky.day.fog { background: linear-gradient(180deg, #5b6878, #8994a3 70%, #a9b1bb); }
.hp-wx-sky.day.storm { background: linear-gradient(180deg, #343a49, #565d6d); }
.hp-wx-sky.day.snow { background: linear-gradient(180deg, #8ea3ba, #c9d4e0); }
.hp-wx-sky.night { background: linear-gradient(180deg, #0d1130, #1c2350 70%, #2b2d55); }
.hp-wx-sky.night.cloudy, .hp-wx-sky.night.rain, .hp-wx-sky.night.storm, .hp-wx-sky.night.fog { background: linear-gradient(180deg, #15182a, #262b40); }
.hp-wx-sky .stars i { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #fff; opacity: .7; animation: hp-wx-tw 3s ease-in-out infinite; animation-delay: var(--d); }
@keyframes hp-wx-tw { 50% { opacity: .15; } }
.hp-wx-sky .sun { position: absolute; right: 34px; top: 26px; width: 62px; height: 62px; border-radius: 50%; background: radial-gradient(circle, #fff6cf, #ffd25e 60%, #ffb43a); box-shadow: 0 0 40px 14px rgba(255,210,94,.45); animation: hp-wx-pulse 6s ease-in-out infinite; }
@keyframes hp-wx-pulse { 50% { box-shadow: 0 0 52px 20px rgba(255,210,94,.32); } }
.hp-wx-sky .moon { position: absolute; right: 38px; top: 26px; width: 46px; height: 46px; border-radius: 50%; box-shadow: inset -12px -4px 0 0 #f3e9cf; filter: drop-shadow(0 0 10px rgba(243,233,207,.4)); }
.hp-wx-sky .cloud { position: absolute; left: -40%; width: var(--w); height: calc(var(--w) * .32); border-radius: 999px; background: rgba(255,255,255,.85); filter: blur(2px); animation: hp-wx-drift var(--s) linear infinite; animation-delay: var(--o); opacity: .85; }
.hp-wx-sky .cloud::before, .hp-wx-sky .cloud::after { content: ""; position: absolute; border-radius: 50%; background: inherit; }
.hp-wx-sky .cloud::before { width: 46%; height: 140%; left: 16%; top: -55%; }
.hp-wx-sky .cloud::after { width: 34%; height: 110%; left: 50%; top: -38%; }
.hp-wx-sky.night .cloud { background: rgba(140,150,180,.55); }
.hp-wx-sky.rain .cloud, .hp-wx-sky.storm .cloud { background: rgba(70,78,92,.92); }
@keyframes hp-wx-drift { to { transform: translateX(560px); } }
.hp-wx-sky .drops i { position: absolute; top: -20px; width: 1.5px; height: 16px; border-radius: 1px; background: rgba(200,225,255,.7); animation: hp-wx-fall var(--t) linear infinite; animation-delay: var(--d); }
@keyframes hp-wx-fall { to { transform: translateY(230px) translateX(-12px); } }
.hp-wx-sky .flakes i { position: absolute; top: -10px; width: 5px; height: 5px; border-radius: 50%; background: #fff; opacity: .9; animation: hp-wx-snow var(--t) linear infinite; animation-delay: var(--d); }
@keyframes hp-wx-snow { 50% { transform: translate(10px, 110px); } to { transform: translate(-6px, 220px); } }
.hp-wx-sky .flash { position: absolute; inset: 0; background: #fff; opacity: 0; animation: hp-wx-flash 7s infinite; }
@keyframes hp-wx-flash { 0%, 90%, 94%, 100% { opacity: 0; } 91%, 93% { opacity: .5; } }
.hp-wx-sky .fog { position: absolute; left: -20%; right: -20%; height: 40px; bottom: 30%; background: rgba(255,255,255,.25); filter: blur(12px); animation: hp-wx-drift 30s linear infinite alternate; }
.hp-wx-sky .fog.two { bottom: 10%; animation-duration: 44s; }
.hp-wx-sky-text { position: absolute; left: 20px; bottom: 16px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.35); }
.hp-wx-sky-text .hp-wx-temp { font-size: 54px; font-weight: 600; line-height: 1; letter-spacing: -.02em; }
.hp-wx-sky-text .hp-wx-label { font-size: 17px; margin-top: 4px; }
.hp-wx-sky-text .hi { font-size: 13px; opacity: .85; margin-top: 2px; }
.hp-wx-curvebox { position: relative; padding: 10px 6px 64px; border-radius: 18px; background: var(--hp-glass); overflow: hidden; }
.hp-wx-curve { display: block; width: 100%; height: 120px; }
.hp-wx-curve .line { fill: none; stroke: #ffc069; stroke-width: 2.4; vector-effect: non-scaling-stroke; }
.hp-wx-curve .rain { fill: #6fa8ff; opacity: .75; }
.hp-wx-curvelabels { position: absolute; left: 6px; right: 6px; bottom: 6px; height: 58px; }
.hp-wx-curvelabels .lab { position: absolute; bottom: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px; --mdc-icon-size: 18px; }
.hp-wx-curvelabels b { font-size: 13px; }
.hp-wx-curvelabels .lab:first-child { transform: translateX(-12%); }
.hp-wx-curvelabels small { font-size: 10.5px; color: var(--hp-sub); }
@media (prefers-reduced-motion: reduce) { .hp-wx-sky * { animation: none !important; } }
/* ---- wallbox */
.hp-wb-stage { position: relative; height: 150px; border-radius: 22px; background: radial-gradient(90% 120% at 50% 100%, rgba(95,180,255,.14), transparent 70%), var(--hp-glass); border: 1px solid var(--hp-border); overflow: hidden; }
.hp-wb-stage.green { background: radial-gradient(90% 120% at 50% 100%, rgba(92,200,121,.2), transparent 70%), var(--hp-glass); }
.hp-wb-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.hp-wb-svg .cable { fill: none; stroke: rgba(255,255,255,.18); stroke-width: 6; stroke-linecap: round; }
.hp-wb-svg .flow { fill: none; stroke: #5fb4ff; stroke-width: 6; stroke-linecap: round; stroke-dasharray: .1 16; opacity: 0; }
.hp-wb-stage.on .hp-wb-svg .flow { opacity: 1; animation: hp-ef-run 1.2s linear infinite; }
.hp-wb-stage.green .hp-wb-svg .flow { stroke: var(--hp-green); }
.hp-wb-box { position: absolute; left: 18px; top: 34px; width: 64px; height: 82px; border-radius: 14px; background: linear-gradient(160deg, #e6e3df, #b5b0aa); color: #2b2b33; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; --mdc-icon-size: 30px; box-shadow: 0 8px 18px rgba(0,0,0,.35); }
.hp-wb-box small { font-size: 9.5px; color: #4a4a55; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hp-wb-stage.on .hp-wb-box ha-icon { color: #2f8fe0; }
.hp-wb-stage.green .hp-wb-box ha-icon { color: #2fa35a; }
.hp-wb-car { position: absolute; right: 20px; top: 32px; width: 86px; height: 86px; }
.hp-wb-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.hp-wb-ring circle { fill: none; stroke-width: 7; stroke-linecap: round; }
.hp-wb-ring .track { stroke: rgba(255,255,255,.1); }
.hp-wb-ring .bar { stroke: var(--hp-green); transition: stroke-dasharray .8s; }
.hp-wb-car .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hp-wb-car .mid b { font-size: 20px; }
.hp-wb-car .mid small { font-size: 10.5px; color: var(--hp-sub); }
.hp-wb-head { display: flex; align-items: center; gap: 10px; margin: 12px 2px 0; }
.hp-wb-line { font-size: 14px; color: var(--hp-sub); }
/* ---- solar */
.hp-sol-stage { position: relative; height: 200px; border-radius: 22px; overflow: hidden; background: linear-gradient(180deg, #3b6fb8, #7fb0e0 70%, #f1d6a1); border: 1px solid var(--hp-border); }
.hp-sol-stage.night { background: linear-gradient(180deg, #121633, #26284d 70%, #463a5a); }
.hp-sol-svg { position: absolute; left: 0; right: 0; top: 0; height: 172px; width: 100%; }
.hp-sol-svg .arc { fill: none; stroke: rgba(255,255,255,.4); stroke-width: 2; stroke-dasharray: 3 5; vector-effect: non-scaling-stroke; }
.hp-sol-svg .line { fill: none; stroke: #ffd166; stroke-width: 2.5; vector-effect: non-scaling-stroke; }
.hp-sol-svg .yest { fill: none; stroke: rgba(255,255,255,.55); stroke-width: 1.5; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.hp-sol-svg .sun { fill: #ffe07a; filter: drop-shadow(0 0 8px rgba(255,210,94,.9)); }
.hp-sol-svg .peak { fill: #fff; }
.hp-sol-now { position: absolute; left: 16px; top: 12px; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,.35); display: flex; flex-direction: column; }
.hp-sol-now b { font-size: 30px; font-weight: 600; }
.hp-sol-now small { font-size: 12.5px; opacity: .85; }
.hp-sol-axis { position: absolute; left: 0; right: 0; bottom: 6px; height: 16px; }
.hp-sol-axis small { position: absolute; transform: translateX(-50%); font-size: 10.5px; color: rgba(255,255,255,.8); }
/* ---- good night */
.hp-gn-hero { --c: #9aa6ff; }
.hp-gn-hero .hp-app-status[data-phase="pause"] { background: #9aa6ff; color: #16183a; }
.hp-ov-row.ok .hp-ov-ic { background: color-mix(in srgb, var(--hp-green) 18%, transparent); color: var(--hp-green); }
.hp-gn-check { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-green); color: #10251a; --mdc-icon-size: 18px; }
.hp-ov-fix { padding: 7px 14px; border-radius: 999px; background: #f7f1ea; color: #2b2125; border: 0; font-size: 13px; font-weight: 600; }
.hp-ov-fix.armed { background: var(--hp-red); color: #fff; }
/* ---- room popup */
.hp-rp-hero { --glow: rgba(140,150,200,.25); padding: 16px; border-radius: 22px; border: 1px solid var(--hp-border); background: radial-gradient(90% 120% at 15% 0%, color-mix(in srgb, var(--glow) 55%, transparent), transparent 65%), radial-gradient(80% 100% at 100% 100%, rgba(140,120,255,.14), transparent 70%), var(--hp-glass); transition: background .6s; }
.hp-rp-hero .top { display: flex; justify-content: space-between; align-items: flex-start; }
.hp-rp-hero .top b.big { font-size: 38px; font-weight: 600; letter-spacing: -.02em; display: block; line-height: 1.05; }
.hp-rp-hero .top small { display: block; color: var(--hp-sub); font-size: 13px; margin-top: 2px; }
.hp-rp-hero .hum { text-align: right; }
.hp-rp-hero .hum b { font-size: 20px; }
.hp-rp-hero .hum[hidden] { display: none; }
.hp-rp-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.hp-rp-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; background: rgba(0,0,0,.25); font-size: 12.5px; --mdc-icon-size: 16px; }
.hp-rp-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, calc(50% - 4px)), 1fr)); gap: 8px; margin-top: 12px; }
.hp-rp-card { display: flex; flex-direction: column; gap: 6px; padding: 13px; border-radius: 18px; background: var(--hp-glass); border: 1px solid transparent; min-width: 0; }
.hp-rp-card[role="button"] { cursor: pointer; }
.hp-rp-card .t { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hp-rp-card .t b { font-size: 15px; }
.hp-rp-card small { color: var(--hp-sub); font-size: 12px; }
.hp-rp-card .val { font-size: 14px; color: var(--hp-sub); font-weight: 600; }
.hp-rp-card .val.warm { color: #ff9a5a; }
.hp-rp-card .hp-ov-bri, .hp-rp-card .hp-rp-shade { height: 8px; border-radius: 4px; margin-top: 4px; }
.hp-rp-card .hp-ov-bri .hp-slider-fill { background: linear-gradient(90deg, #ffb35c, #ffe0a3); }
.hp-rp-card .hp-rp-shade .hp-slider-fill { background: #9fb4cf; }
.hp-rp-card.lit { background: linear-gradient(100deg, rgba(255,192,105,.16), transparent 70%), var(--hp-glass); border-color: rgba(255,192,105,.22); }
.hp-rp-card.heat { border-color: rgba(255,140,80,.35); }
.hp-rp-heatbar { height: 8px; border-radius: 4px; background: var(--hp-glass-2); margin-top: 4px; overflow: hidden; }
.hp-rp-heatbar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #78c3b4, #e8875a); }
.hp-rp-media { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 18px; margin-top: 8px; background: linear-gradient(110deg, rgba(120,80,160,.3), transparent 70%), var(--hp-glass); cursor: pointer; }
.hp-rp-media .art { width: 52px; height: 52px; border-radius: 12px; flex: none; background: linear-gradient(135deg, #c86b9a, #5b4aa8); background-size: cover; background-position: center; }
.hp-rp-media .txt { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.hp-rp-media .txt b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-media .txt small { font-size: 12px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-media .play { width: 42px; height: 42px; border-radius: 50%; border: 0; background: #f7f1ea; color: #2b2125; display: grid; place-items: center; flex: none; }
.hp-room-title[role="button"] { cursor: pointer; }
/* ---- room popup, usable version */
.hp-rp-hero .tempbox[role="button"] { cursor: pointer; }
.hp-rp-heatctl { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.hp-rp-heatctl:empty { display: none; }
.hp-rp-heatctl small { color: var(--hp-sub); font-size: 13px; margin-right: auto; }
.hp-rp-heatctl b { min-width: 58px; text-align: center; font-size: 18px; }
.hp-rp-heatctl .hp-round { width: 40px; height: 40px; background: rgba(0,0,0,.25); }
.hp-rp-sec { margin-top: 14px; }
.hp-rp-sechead { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 8px; min-height: 30px; }
.hp-rp-sechead > span { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); --mdc-icon-size: 16px; }
.hp-rp-list { display: grid; gap: 6px; }
.hp-rp-shrow { display: grid; grid-template-columns: 24px minmax(64px, 30%) minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 7px 8px 7px 12px; border-radius: 14px; background: rgba(255,255,255,.04); }
.hp-rp-shrow.nopos { grid-template-columns: 24px minmax(0, 1fr) auto; }
.hp-rp-shrow.all { background: color-mix(in srgb, #9fb4cf 16%, var(--hp-glass)); }
.hp-rp-shrow .win { position: relative; width: 24px; height: 28px; border-radius: 4px; border: 2px solid #9aa0a8; box-sizing: border-box; overflow: hidden; background: linear-gradient(180deg, #6aa7e0, #b7d6f0); }
.hp-rp-shrow .win .sl { position: absolute; left: 0; right: 0; top: 0; background: repeating-linear-gradient(180deg, #d8dbe0 0 3px, #a9aeb5 3px 4px); transition: height 1s ease-in-out; }
.hp-rp-shrow.moving .win .sl { animation: hp-ov-slats .6s linear infinite; }
.hp-rp-shrow .txt { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; background: none; border: 0; padding: 0; color: var(--hp-text); text-align: left; cursor: pointer; }
.hp-rp-shrow .txt b { font-size: 14px; font-weight: 600; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-shrow .txt small { font-size: 12px; color: var(--hp-sub); white-space: nowrap; }
.hp-rp-shrow > .hp-rp-shpos { height: 26px; border-radius: 13px; touch-action: none; }
.hp-rp-shrow > .hp-rp-shpos .hp-slider-fill { background: linear-gradient(90deg, #7f95b3, #b9cbe2); }
.hp-rp-shrow .rbtns { display: flex; gap: 4px; }
.hp-rp-shbtn { width: 36px; height: 36px; border-radius: 50%; border: 0; padding: 0; background: var(--hp-glass-2); color: var(--hp-text); display: grid; place-items: center; cursor: pointer; --mdc-icon-size: 18px; transition: background .2s, color .2s; }
.hp-rp-shbtn.active { background: #9fb4cf; color: #1d2633; }
.hp-rp-shbtn.stop { display: none; }
.hp-rp-shrow.moving .hp-rp-shbtn.stop { display: grid; background: var(--hp-accent, #f6c945); color: #2b2125; }
.hp-rp-sec .hp-rp-list > .hp-rp-shrow + .hp-rp-shrow { margin-top: 0; }
.hp-rp-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; column-gap: 12px; row-gap: 8px; padding: 10px 12px; border-radius: 16px; background: var(--hp-glass); transition: background .3s; }
.hp-rp-row .ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-sub); --mdc-icon-size: 20px; transition: background .3s, box-shadow .3s; }
.hp-rp-row.on .ic { color: #2b2125; }
.hp-rp-row .txt { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; background: none; border: 0; padding: 0; color: var(--hp-text); text-align: left; }
.hp-rp-row .txt b { font-size: 14.5px; font-weight: 600; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-row .txt small { font-size: 12px; color: var(--hp-sub); }
.hp-rp-row > .hp-slider { grid-column: 1 / -1; height: 10px; border-radius: 5px; }
.hp-rp-row > .hp-slider[hidden] { display: none; }
.hp-rp-row > .hp-ov-bri .hp-slider-fill { background: linear-gradient(90deg, #ffb35c, #ffe0a3); }
.hp-rp-row.on { background: linear-gradient(100deg, rgba(255,192,105,.12), transparent 70%), var(--hp-glass); }
.hp-rp-row > .hp-rp-shade .hp-slider-fill { background: #9fb4cf; }
.hp-rp-btns { display: flex; gap: 6px; }
.hp-rp-btns .hp-round.small { width: 34px; height: 34px; --mdc-icon-size: 18px; }
.hp-rp-media { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; align-items: center; gap: 8px 12px; padding: 12px; border-radius: 18px; background: linear-gradient(110deg, rgba(120,80,160,.22), transparent 70%), var(--hp-glass); }
.hp-rp-media.on { background: linear-gradient(110deg, rgba(160,100,200,.35), transparent 70%), var(--hp-glass); }
.hp-rp-media .art { width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #6b5a7a, #3c3350); background-size: cover; background-position: center; }
.hp-rp-media .txt { display: flex; flex-direction: column; min-width: 0; background: none; border: 0; padding: 0; color: var(--hp-text); text-align: left; }
.hp-rp-media .txt b { font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-media .txt small { font-size: 12px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-media .play { width: 42px; height: 42px; border-radius: 50%; border: 0; background: #f7f1ea; color: #2b2125; display: grid; place-items: center; }
.hp-rp-media > .hp-slider { grid-column: 1 / -1; height: 8px; border-radius: 4px; }
.hp-rp-media > .hp-slider[hidden] { display: none; }
.hp-rp-devs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(150px, calc(50% - 4px)), 1fr)); gap: 8px; }
.hp-rp-devs .hp-tile { min-height: 104px; }
.hp-rp-devs .hp-edit-minus { display: none; }
.hp-rp-hero[hidden] { display: none; }
.hp-rp-hero[hidden] + .hp-rp-body > .hp-rp-sec:first-child { margin-top: 0; }
/* ---- room popup: tidy sections */
.hp-rp-strip { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 12px -2px 0; padding: 0 2px 2px; }
.hp-rp-strip::-webkit-scrollbar { display: none; }
.hp-rp-strip > .hp-tile { flex: none; width: 210px; min-height: 0; }
.hp-rp-strip .hp-edit-minus { display: none; }
.hp-rp-scenes { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-top: 12px; }
.hp-rp-scenes .hp-chip { flex: none; }
.hp-rp-sec { margin-top: 8px; border-radius: 18px; background: var(--hp-glass); overflow: hidden; }
.hp-rp-body > .hp-rp-sec:first-of-type { margin-top: 12px; }
.hp-rp-sec .hp-rp-sechead { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto 22px; align-items: center; gap: 12px; margin: 0; padding: 11px 12px; cursor: pointer; }
.hp-rp-sec .hp-rp-sechead .ic { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-sub); --mdc-icon-size: 20px; }
.hp-rp-sec .hp-rp-sechead .tt { display: flex; flex-direction: column; min-width: 0; }
.hp-rp-sec .hp-rp-sechead .tt b { font-size: 15px; }
.hp-rp-sec .hp-rp-sechead .tt small { font-size: 12.5px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-sec .hp-rp-sechead .chev { color: var(--hp-sub); --mdc-icon-size: 20px; transition: transform .2s; display: grid; place-items: center; }
.hp-rp-sec.open .hp-rp-sechead .chev { transform: rotate(180deg); }
.hp-rp-sec > .hp-rp-list { display: none; padding: 0 8px 8px; }
.hp-rp-sec.open > .hp-rp-list { display: grid; }
.hp-rp-sec .hp-rp-row, .hp-rp-sec .hp-rp-media { background: rgba(255,255,255,.04); }
.hp-rp-sec .hp-rp-list > .hp-tile { min-height: 0; }
.hp-rp-sec .hp-rp-list .hp-edit-minus { display: none; }
/* ---- room popup v3: glowing hero with ring, control tiles, no sideways scrolling */
.hp-rp-hero2 { --glow: rgba(120,140,220,.5); position: relative; display: grid; grid-template-columns: 150px minmax(0, 1fr); align-items: center; gap: 14px; padding: 14px; border-radius: 26px; overflow: hidden; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-rp-hero2[hidden] { display: none; }
.hp-rp-hero2 .glow { position: absolute; left: -40px; top: -60px; width: 260px; height: 260px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--glow) 55%, transparent), transparent 65%); pointer-events: none; transition: background .8s; }
.hp-rp-hero2.heat .glow { background: radial-gradient(circle, rgba(255,122,69,.45), transparent 65%); animation: hp-rp-breathe 3s ease-in-out infinite; }
.hp-rp-hero2.cool .glow { background: radial-gradient(circle, rgba(95,180,255,.45), transparent 65%); }
@keyframes hp-rp-breathe { 50% { transform: scale(1.08); opacity: .8; } }
.hp-rp-dial { position: relative; width: 150px; height: 150px; }
.hp-rp-dial[role="button"] { cursor: pointer; }
.hp-rp-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.hp-rp-ring .track { fill: none; stroke: rgba(255,255,255,.1); stroke-width: 9; stroke-linecap: round; }
.hp-rp-ring .fill { fill: none; stroke-width: 9; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(255,150,80,.4)); }
.hp-rp-ring .dot { fill: #fff; stroke: rgba(0,0,0,.35); stroke-width: 2; }
.hp-rp-dial .mid { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hp-rp-dial .mid b.big { font-size: 34px; font-weight: 600; letter-spacing: -.02em; line-height: 1; }
.hp-rp-dial .mid small { font-size: 12px; color: var(--hp-sub); margin-top: 4px; }
.hp-rp-hero2 .side { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hp-rp-facts { display: contents; }
.hp-rp-fact { display: flex; align-items: center; gap: 10px; min-width: 0; --mdc-icon-size: 20px; color: var(--hp-sub); }
.hp-rp-fact[hidden] { display: none; }
.hp-rp-fact > div { display: flex; flex-direction: column; min-width: 0; }
.hp-rp-fact b { font-size: 15px; color: var(--hp-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-fact small { font-size: 11.5px; }
.hp-rp-fact.state ha-icon { color: var(--hp-sub); }
.hp-rp-hero2.heat .hp-rp-fact.state ha-icon { color: #ff8a4c; filter: drop-shadow(0 0 6px rgba(255,120,60,.8)); }
.hp-rp-fact.warn ha-icon, .hp-rp-fact.warn b { color: #f6c945; }
.hp-rp-fact.live ha-icon, .hp-rp-fact.live b { color: #8fe0b4; }
.hp-rp-ctl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.hp-rp-ctl[hidden] { display: none; }
.hp-rp-ct { position: relative; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; min-height: 112px; padding: 14px; border-radius: 22px; overflow: hidden; background: var(--hp-glass); background-size: cover; background-position: center; border: 1px solid var(--hp-border); cursor: pointer; transition: transform .1s, background-color .3s; }
.hp-rp-ct:active { transform: scale(.97); }
.hp-rp-ct .ic { position: absolute; left: 14px; top: 14px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-sub); --mdc-icon-size: 22px; transition: background .3s, color .3s, box-shadow .3s; }
.hp-rp-ct b { position: relative; font-size: 15.5px; }
.hp-rp-ct small { position: relative; font-size: 12.5px; color: var(--hp-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-rp-ct .more { position: absolute; right: 8px; top: 8px; width: 34px; height: 34px; border-radius: 50%; border: 0; background: transparent; color: var(--hp-sub); display: grid; place-items: center; --mdc-icon-size: 20px; }
.hp-rp-ct.light.on { background: radial-gradient(120% 100% at 20% 0%, color-mix(in srgb, var(--lc) calc(25% + var(--lv) * 40%), transparent), transparent 75%), var(--hp-glass); border-color: color-mix(in srgb, var(--lc) 40%, transparent); }
.hp-rp-ct.light.on .ic { background: var(--lc); color: #2b2125; box-shadow: 0 0 18px var(--lc); }
.hp-rp-ct.shades .slats { position: absolute; left: 0; right: 0; top: 0; background: repeating-linear-gradient(180deg, rgba(200,206,214,.22) 0 9px, rgba(120,126,136,.22) 9px 11px); transition: height 1s ease-in-out; pointer-events: none; }
.hp-rp-ct.shades.on .ic { background: #9fc3ea; color: #10233a; }
.hp-rp-ct.music.on .ic, .hp-rp-ct.music.art .ic { background: #f7f1ea; color: #2b2125; }
.hp-rp-ct.music.art small, .hp-rp-ct.music.art b { color: #fff; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
.hp-rp-ct.switch.on .ic { background: #f6c945; color: #2b2125; }
.hp-rp-ctl > .hp-rp-ct.wide { grid-column: 1 / -1; min-height: 76px; justify-content: center; padding-left: 70px; }
.hp-rp-ctl > .hp-rp-ct.wide .ic { top: 50%; transform: translateY(-50%); }
.hp-rp-ct.expanded { border-color: color-mix(in srgb, var(--hp-text) 30%, transparent); }
.hp-rp-ct.expanded .more { background: var(--hp-glass-2); color: var(--hp-text); }
.hp-rp-sec.headless { background: transparent; margin-top: 0; }
.hp-rp-sec.headless > .hp-rp-sechead { display: none; }
.hp-rp-sec.headless:not(.open) { display: none; }
.hp-rp-sec.headless.open { margin-top: 10px; }
.hp-rp-ctl > .hp-rp-sec.inline { grid-column: 1 / -1; margin: 0; }
.hp-rp-ctl > .hp-rp-sec.inline.open { animation: hp-rp-drop .25s ease-out; }
@keyframes hp-rp-drop { from { opacity: 0; transform: translateY(-6px); } }
.hp-rp-sec.headless > .hp-rp-list { padding: 0; }
.hp-rp-devgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.hp-rp-devgrid > .hp-tile { min-width: 0; min-height: 0; padding: 12px; border-radius: 18px; background: var(--hp-glass); border: 1px solid var(--hp-border); }
.hp-rp-devgrid > .hp-tile.on { background: linear-gradient(120deg, rgba(255,255,255,.1), transparent 70%), var(--hp-glass); }
.hp-rp-devgrid .hp-edit-minus { display: none; }
.hp-rp-scenes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; overflow: visible; }
.hp-rp-body > .hp-rp-sec:first-of-type { margin-top: 12px; }
@media (max-width: 380px) { .hp-rp-hero2 { grid-template-columns: 128px minmax(0, 1fr); } .hp-rp-dial { width: 128px; height: 128px; } .hp-rp-dial .mid b.big { font-size: 28px; } }
/* room popup v4: quick button, chevron, AC tile, lively device tiles */
.hp-rp-ct .more { display: none; }
.hp-rp-ct .quick { position: absolute; right: 10px; top: 10px; width: 40px; height: 40px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--hp-glass-2); color: var(--hp-text); --mdc-icon-size: 20px; z-index: 1; }
.hp-rp-ct.on .quick { background: rgba(255,255,255,.9); color: #2b2125; }
.hp-rp-ct .chev { position: absolute; right: 12px; bottom: 12px; color: var(--hp-sub); --mdc-icon-size: 20px; transition: transform .2s; }
.hp-rp-ct.expanded .chev { transform: rotate(180deg); }
.hp-rp-ctl > .hp-rp-ct.wide .quick { top: 50%; transform: translateY(-50%); right: 44px; }
.hp-rp-ctl > .hp-rp-ct.wide .chev { bottom: auto; top: 50%; transform: translateY(-50%); }
.hp-rp-ctl > .hp-rp-ct.wide.expanded .chev { transform: translateY(-50%) rotate(180deg); }
.hp-rp-ct.shades.wide b, .hp-rp-ct.shades.wide small { max-width: 92px; }
.hp-rp-ct.shades.wide .hp-rp-ctpos { position: absolute; left: 172px; right: 98px; top: 50%; height: 28px; margin-top: -14px; border-radius: 14px; touch-action: none; z-index: 1; background: rgba(255,255,255,.08); }
.hp-rp-ct.shades.wide .hp-rp-ctpos .hp-slider-fill { background: linear-gradient(90deg, #7f95b3, #b9cbe2); }
.hp-rp-ct.shades.wide:has(.hp-rp-ctpos:active) { transform: none; }
@media (max-width: 520px) {
  .hp-rp-ctl > .hp-rp-ct.shades.wide { justify-content: flex-start; padding-top: 18px; padding-bottom: 54px; }
  .hp-rp-ctl > .hp-rp-ct.shades.wide .ic { top: 14px; transform: none; }
  .hp-rp-ctl > .hp-rp-ct.shades.wide .quick { top: 14px; transform: none; }
  .hp-rp-ctl > .hp-rp-ct.shades.wide .chev { top: 24px; transform: none; }
  .hp-rp-ctl > .hp-rp-ct.shades.wide.expanded .chev { transform: rotate(180deg); }
  .hp-rp-ct.shades.wide b, .hp-rp-ct.shades.wide small { max-width: none; }
  .hp-rp-ct.shades.wide .hp-rp-ctpos { left: 14px; right: 14px; top: auto; bottom: 14px; margin-top: 0; }
}
.hp-rp-ct.ac.on { background: radial-gradient(120% 100% at 20% 0%, rgba(95,180,255,.35), transparent 75%), var(--hp-glass); border-color: rgba(95,180,255,.4); }
.hp-rp-ct.ac.on .ic { background: #5fb4ff; color: #0c2236; box-shadow: 0 0 16px rgba(95,180,255,.6); }
.hp-rp-ct.ac[data-mode="heat"] { background: radial-gradient(120% 100% at 20% 0%, rgba(255,140,80,.35), transparent 75%), var(--hp-glass); border-color: rgba(255,140,80,.4); }
.hp-rp-ct.ac[data-mode="heat"] .ic { background: #ff9a5a; color: #3a1a0c; box-shadow: 0 0 16px rgba(255,140,80,.6); }
.hp-rp-ct.ac.on .ic ha-icon { animation: hp-app-wave 6s linear infinite; }
.hp-rp-ct.ac[data-mode="heat"] .ic ha-icon, .hp-rp-ct.ac[data-mode="dry"] .ic ha-icon { animation: none; }
/* device tiles: like the control tiles, with their colour and progress */
.hp-rp-devgrid > .hp-tile { --dc: #9aa6ff; display: flex; flex-direction: column; justify-content: flex-end; min-height: 112px; padding: 14px; border-radius: 22px; position: relative; overflow: hidden; }
.hp-rp-devgrid > .hp-tile .hp-tile-top { position: absolute; left: 14px; top: 14px; }
.hp-rp-devgrid > .hp-tile .hp-tile-icon { width: 40px; height: 40px; background: color-mix(in srgb, var(--dc) 22%, transparent); color: var(--dc); }
.hp-rp-devgrid > .hp-tile .hp-tile-name { font-size: 15px; font-weight: 600; }
.hp-rp-devgrid > .hp-tile .hp-tile-state { color: var(--hp-sub); }
.hp-rp-devgrid > .hp-tile .hp-cover-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; border-radius: 0; margin: 0; background: rgba(255,255,255,.08); }
.hp-rp-devgrid > .hp-tile .hp-cover-bar i { background: var(--dc); box-shadow: 0 0 10px var(--dc); }
.hp-rp-devgrid > .hp-tile.on { background: radial-gradient(120% 100% at 20% 0%, color-mix(in srgb, var(--dc) 30%, transparent), transparent 75%), var(--hp-glass); border-color: color-mix(in srgb, var(--dc) 40%, transparent); color: var(--hp-text); }
.hp-rp-devgrid > .hp-tile.on .hp-tile-icon { background: var(--dc); color: #1e1a1f; box-shadow: 0 0 18px color-mix(in srgb, var(--dc) 70%, transparent); animation: hp-rp-pulse 2.4s ease-in-out infinite; }
.hp-rp-devgrid > .hp-tile.on .hp-tile-state { color: color-mix(in srgb, var(--dc) 70%, #fff); }
@keyframes hp-rp-pulse { 50% { box-shadow: 0 0 6px color-mix(in srgb, var(--dc) 40%, transparent); } }
.hp-rp-devgrid > .hp-tile:last-child:nth-child(odd) { grid-column: 1 / -1; min-height: 80px; justify-content: center; padding-left: 70px; }
.hp-rp-devgrid > .hp-tile:last-child:nth-child(odd) .hp-tile-top { top: 50%; transform: translateY(-50%); }
.hp-rp-devgrid > .hp-tile.printer { --dc: #b18cff; }
.hp-rp-devgrid > .hp-tile.heatpump { --dc: #ff9a6b; }
.hp-rp-devgrid > .hp-tile.network { --dc: #5fb4ff; }
.hp-rp-devgrid > .hp-tile.washer { --dc: #7fc8f8; }
.hp-rp-devgrid > .hp-tile.dryer { --dc: #ffb26b; }
.hp-rp-devgrid > .hp-tile.dish { --dc: #8fe0d0; }
.hp-rp-devgrid > .hp-tile.car { --dc: #5cc879; }
.hp-rp-devgrid > .hp-tile.wallbox { --dc: #5cc879; }
.hp-rp-devgrid > .hp-tile.pool { --dc: #5fb4ff; }
.hp-rp-devgrid > .hp-tile.bell { --dc: #ffc069; }
.hp-rp-devgrid > .hp-tile.baby { --dc: #c9a7ff; }
/* room popup: gate and lock tiles */
.hp-rp-ct.gate .door { --open: 0; position: absolute; inset: 0; pointer-events: none; transform: translateY(calc(var(--open) * -100%)); transition: transform 1.4s ease-in-out;
  background: repeating-linear-gradient(180deg, rgba(210,214,220,.2) 0 12px, rgba(130,136,146,.2) 12px 14px); }
.hp-rp-ct.gate.fence .door { transform: translateX(calc(var(--open) * -100%)); background: repeating-linear-gradient(90deg, rgba(210,214,220,.22) 0 5px, transparent 5px 20px); border-top: 4px solid rgba(210,214,220,.2); border-bottom: 4px solid rgba(210,214,220,.2); }
.hp-rp-ct.gate.on { border-color: rgba(246,201,69,.5); background: radial-gradient(120% 100% at 20% 0%, rgba(246,201,69,.2), transparent 75%), var(--hp-glass); }
.hp-rp-ct.gate.on .ic { background: #f6c945; color: #2b2125; }
.hp-rp-ct.gate.moving .ic ha-icon { animation: hp-app-glow 1s ease-in-out infinite; }
.hp-rp-ct.lock.locked .ic { background: color-mix(in srgb, var(--hp-green) 22%, transparent); color: var(--hp-green); }
.hp-rp-ct.lock.on { border-color: color-mix(in srgb, var(--hp-red) 45%, transparent); background: radial-gradient(120% 100% at 20% 0%, color-mix(in srgb, var(--hp-red) 22%, transparent), transparent 75%), var(--hp-glass); }
.hp-rp-ct.lock.on .ic { background: var(--hp-red); color: #fff; }
.hp-rp-hero2.noring { grid-template-columns: auto minmax(0, 1fr); }
.hp-rp-hero2.noring .hp-rp-dial { width: auto; height: auto; }
.hp-rp-hero2.noring .hp-rp-ring { display: none; }
.hp-rp-hero2.noring .hp-rp-dial .mid { position: static; align-items: flex-start; }
.hp-rp-hero2.noring .hp-rp-dial .mid b.big { font-size: 40px; }
.hp-rp-hero2.noring .hp-rp-fact.state { display: none; }
.hp-qrow.off { opacity: .55; }
.hp-eye.on { background: var(--hp-glass-2); }
/* Weather popup on one screen: sky with facts, hours card, days card */
.hp-sheet.weather .hp-wx-sky { height: 210px; margin-bottom: 10px; }
.hp-sheet.weather .hp-wx-sky-text { top: 18px; bottom: auto; }
.hp-sheet.weather .hp-wx-sky-text .hp-wx-temp { font-size: 58px; }
.hp-wx-facts { position: absolute; left: 10px; right: 10px; bottom: 10px; z-index: 2; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; padding: 8px 6px; border-radius: 16px; background: rgba(10,12,30,.28); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.14); color: #fff; }
.hp-wx-facts > div { display: flex; flex-direction: column; align-items: center; min-width: 0; gap: 1px; }
.hp-wx-facts ha-icon { --mdc-icon-size: 17px; opacity: .8; }
.hp-wx-facts b { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
.hp-wx-facts small { font-size: 10.5px; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.hp-sheet.weather .hp-wx-sky .sun, .hp-sheet.weather .hp-wx-sky .moon { top: 20px; }
.hp-wx-card { border-radius: 20px; background: var(--hp-glass); border: 1px solid var(--hp-border); padding: 10px 12px 8px; margin-bottom: 10px; }
.hp-wx-cardhead { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--hp-sub); margin: 0 2px 4px; }
.hp-wx-card .hp-wx-curvebox { padding: 0 0 46px; background: none; border-radius: 0; }
.hp-wx-card .hp-wx-curve { height: 74px; }
.hp-wx-now { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px #ffc069, 0 0 12px #ffc069; }
.hp-wx-card .hp-wx-curvelabels { left: 0; right: 0; bottom: 0; height: 46px; }
.hp-wx-card .hp-wx-curvelabels .lab { gap: 0; --mdc-icon-size: 16px; }
.hp-wx-card .hp-wx-curvelabels .lab:first-child { transform: translateX(-50%); }
.hp-wx-card .hp-wx-days { gap: 0; }
.hp-wx-card .hp-wx-day { grid-template-columns: 46px 46px 30px 1fr 30px; gap: 8px; padding: 4px 2px; font-size: 13.5px; }
.hp-wx-card .hp-wx-day + .hp-wx-day { border-top: 1px solid rgba(255,255,255,.05); }
.hp-wx-dic { display: flex; align-items: center; gap: 3px; --mdc-icon-size: 20px; }
.hp-wx-dic small { font-size: 10.5px; color: #6cb8f0; white-space: nowrap; }
.hp-wx-card .hp-wx-range { height: 5px; border-radius: 3px; }

/* Security popup on one screen */
.hp-sheet.ov-sec .hp-ov-banner { padding: 10px 14px; margin-bottom: 8px; gap: 12px; }
.hp-sheet.ov-sec .hp-ov-banner .hp-sec-hero-ic { width: 40px; height: 40px; border-radius: 13px; }
.hp-sheet.ov-sec .hp-ov-banner .hp-sec-hero-ic ha-icon { --mdc-icon-size: 22px; }
.hp-sheet.ov-sec .hp-ov-banner .hp-sec-hero-text b { font-size: 18px; }
.hp-sheet.ov-sec .hp-ov-banner .hp-sec-hero-text small { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-sheet.ov-sec .hp-ov-alarm-card { padding: 10px 14px; gap: 12px; border-radius: 18px; }
.hp-sheet.ov-sec .hp-ov-alarm-ic { width: 40px; height: 40px; border-radius: 13px; --mdc-icon-size: 22px; }
.hp-sheet.ov-sec .hp-ov-alarm-card .txt b { font-size: 17px; }
.hp-sheet.ov-sec .hp-ov-alarm-card .txt small { font-size: 12px; }
.hp-sheet.ov-sec .hp-ov-modes { margin-top: 6px; gap: 6px; }
.hp-sheet.ov-sec .hp-ov-mode { flex-direction: row; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 14px; font-size: 13px; --mdc-icon-size: 18px; }
.hp-sheet.ov-sec .hp-ov-label { margin: 12px 2px 6px; }
.hp-sheet.ov-sec .hp-ov-closed { gap: 6px; }
.hp-sheet.ov-sec .hp-ov-ok { padding: 8px 10px; border-radius: 12px; }
.hp-sheet.ov-sec > .hp-sheet-body > .hp-ov-row.smoke { margin-top: 6px; padding: 6px 10px 6px 8px; border-radius: 12px; grid-template-columns: 26px minmax(0, 1fr) auto; column-gap: 8px; }
.hp-ov-row.smoke .hp-ov-ic { width: 26px; height: 26px; border-radius: 8px; --mdc-icon-size: 16px; }
.hp-ov-row.smoke .hp-ov-txt { flex-direction: row; align-items: baseline; gap: 6px; min-width: 0; }
.hp-ov-row.smoke .hp-ov-txt b { font-size: 13px; font-weight: 500; white-space: nowrap; }
.hp-ov-row.smoke .hp-ov-txt small { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-ov-row.smoke .hp-ov-tag { padding: 2px 8px; font-size: 11px; }
.hp-sheet.ov-sec .hp-sec-recent { grid-template-columns: repeat(3, 1fr); gap: 6px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item { border-radius: 12px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item .tag { left: 5px; top: 5px; width: 20px; height: 20px; --mdc-icon-size: 12px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item.clip::after { right: 6px; top: 8px; border-left-width: 7px; border-top-width: 5px; border-bottom-width: 5px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item .cap { padding: 12px 6px 4px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item .cap b { font-size: 11.5px; }
.hp-sheet.ov-sec .hp-sec-recent .hp-vis-item .cap small { font-size: 10px; }
.hp-sheet.ov-sec .hp-app-foot { margin-top: 10px; }

.hp-se-arrows { display: flex; gap: 4px; }
.hp-se-arrows .hp-round:disabled { opacity: .25; }
.ov-sec-edit .hp-qrow { gap: 8px; }
.ov-sec-edit .hp-qrow.off { opacity: .55; }

`;

/** The font has to be declared on the page itself; shadow roots ignore @font-face. */
export function loadFont(baseUrl) {
  if (document.getElementById("hauspanel-font")) return;
  const style = document.createElement("style");
  style.id = "hauspanel-font";
  // Two parts of the font, each loaded only when a letter from it shows up: the basic Latin letters, and the
  // extended ones (ą, ł, ő, č …) for Polish and other languages.
  const ext = baseUrl.replace("outfit-latin.woff2", "outfit-latin-ext.woff2");
  style.textContent = `@font-face { font-family: "HP Outfit"; font-style: normal; font-weight: 200 700; font-display: swap; src: url("${baseUrl}") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: "HP Outfit"; font-style: normal; font-weight: 200 700; font-display: swap; src: url("${ext}") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
`;
  document.head.append(style);
}
