// Welcome: the first time someone opens HausPanel, three short steps (rooms, this screen, the guides).
// Shown once per Home Assistant user, kept with the user (frontend user data), so a second screen doesn't
// show it again; Settings → System can show it once more.
import { h, icon } from "./util.js";
import { openSheet } from "./dialogs.js";
import { t, currentLang } from "./i18n.js";

const KEY = "hauspanel_welcome";
const GUIDES = "https://github.com/alpacalabs-de/hauspanel/blob/main/docs/";

/** Show the welcome unless this user has seen it. */
export async function maybeWelcome(ctx) {
  try {
    const r = await ctx.hass.callWS({ type: "frontend/get_user_data", key: KEY });
    if (r?.value) return;
  } catch {
    return;
  }
  openWelcome(ctx);
}

/** Open Home Assistant's own pages (areas) from inside the panel. */
function goHa(path) {
  history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
}

export function openWelcome(ctx) {
  const hass = ctx.hass;
  const done = () => hass.callWS({ type: "frontend/set_user_data", key: KEY, value: { seen: Date.now() } }).catch(() => {});
  const sheet = openSheet(ctx, { title: t("wel_title"), subtitle: t("wel_sub"), cls: "welcome", onClose: done });

  const step = (n, ic, title, text, ...extra) => h("div", { class: "hp-wel-step" },
    h("span", { class: "hp-wel-n" }, String(n)),
    h("div", { class: "hp-wel-body" }, h("b", {}, icon(ic), title), h("p", {}, text), ...extra));

  // 1 · Rooms: what HausPanel found, and where to fix it.
  const rooms = ctx.roomList();
  const other = rooms.find((a) => a.id === "_other");
  const named = rooms.filter((a) => a.id !== "_other").length;
  const found = h("div", { class: "hp-wel-facts" },
    h("span", { class: `hp-wel-fact ${named ? "ok" : "warn"}` }, icon(named ? "mdi:check" : "mdi:alert-outline"), t("wel_rooms_n", { n: named })),
    other?.tiles.length ? h("span", { class: "hp-wel-fact warn" }, icon("mdi:help-circle-outline"), t("wel_other_n", { n: other.tiles.length })) : null);
  const areasB = hass.user?.is_admin ? h("button", { class: "hp-chip" }, icon("mdi:sofa-outline"), t("wel_areas_btn")) : null;
  areasB?.addEventListener("click", () => { sheet.close(); goHa("/config/areas/dashboard"); });

  // 2 · This screen: the layout, right here (not on the phone or security panels, which have their own).
  let layoutRow = null;
  if (!ctx._forceLayout && !ctx.isPhone) {
    const cur = ctx.settings.device.layout || "grid";
    layoutRow = h("div", { class: "hp-seg hp-wel-seg" }, [["sidebar", "layout_sidebar"], ["grid", "layout_grid"], ["list", "layout_list"]].map(([id, l]) => {
      const b = h("button", { class: cur === id ? "active" : "" }, t(l));
      b.addEventListener("click", () => {
        ctx.settings.setDevice("layout", id);
        layoutRow.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
        ctx.rerender();
      });
      return b;
    }));
  }

  // 3 · Guides and the settings.
  const guide = h("a", { class: "hp-chip", href: `${GUIDES}${currentLang() === "de" ? "guides.de.md" : "guides.md"}`, target: "_blank", rel: "noopener" }, icon("mdi:book-open-variant"), t("set_guide"));
  const go = h("button", { class: "hp-btn primary" }, icon("mdi:check"), h("span", {}, t("wel_go")));
  go.addEventListener("click", () => sheet.close());

  sheet.body.append(
    step(1, "mdi:floor-plan", t("wel_rooms"), t("wel_rooms_text"), found, areasB ? h("div", { class: "hp-wel-btns" }, areasB) : null),
    ...(layoutRow ? [step(2, "mdi:tablet-dashboard", t("wel_screen"), t("wel_screen_text"), layoutRow)] : []),
    step(layoutRow ? 3 : 2, "mdi:cog-outline", t("wel_more"), t("wel_more_text"), h("div", { class: "hp-wel-btns" }, guide)),
    h("div", { class: "hp-sheet-actions hp-app-foot" }, go));
}
