// Small choices that belong to a person, not to a panel or a screen (show motion in the room popup …).
// Home Assistant keeps them with the signed-in user (frontend user data), so they follow you to every
// screen and every panel, and never change anything for the others.
const KEY = "hauspanel_prefs";

/** Load this user's choices once; {} when there are none or the call fails. */
export async function loadPrefs(hass) {
  try {
    const r = await hass.callWS({ type: "frontend/get_user_data", key: KEY });
    return r?.value && typeof r.value === "object" ? r.value : {};
  } catch {
    return {};
  }
}

/** Change one choice; ctx.prefs is updated right away, the save happens in the background. */
export function setPref(ctx, name, value) {
  ctx.prefs = { ...(ctx.prefs || {}), [name]: value };
  return ctx.hass.callWS({ type: "frontend/set_user_data", key: KEY, value: ctx.prefs }).catch(() => {});
}
