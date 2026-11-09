// "Worth a look": things in the house that make HausPanel less useful than it could be, each with the
// guide that explains the fix. Shown at the top of the settings when there is something.
import { domainOf } from "./util.js";

/** [{ key, icon, n, guide }] – key is the text (hint_<key>), guide the anchor in docs/guides.md. */
export function setupHints(ctx) {
  const m = ctx.model;
  const hass = ctx.hass;
  const out = [];
  if (!m.areas.length) out.push({ key: "no_rooms", icon: "mdi:floor-plan", n: 0, guide: "areas" });
  const loose = m.unassigned.tiles.length;
  if (m.areas.length && loose) out.push({ key: "no_room", icon: "mdi:help-circle-outline", n: loose, guide: "areas" });
  // Floors only help when used for all rooms: a mix leaves some rooms under "no floor".
  const withFloor = m.areas.filter((a) => a.floor).length;
  if (withFloor && withFloor < m.areas.length) out.push({ key: "no_floor", icon: "mdi:layers-outline", n: m.areas.length - withFloor, guide: "areas" });
  const cams = m.security.filter((id) => domainOf(id) === "camera" && hass.states[id]?.state === "unavailable").length;
  if (cams) out.push({ key: "cams_down", icon: "mdi:cctv-off", n: cams, guide: "cameras" });
  return out;
}
