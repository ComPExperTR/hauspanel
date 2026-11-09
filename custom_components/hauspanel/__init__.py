"""HausPanel: a dashboard that builds itself from areas, devices and entities."""

from __future__ import annotations

import copy
import hashlib
import inspect
import os
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.dispatcher import (
    async_dispatcher_connect,
    async_dispatcher_send,
)
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType

from .config_flow import ADMIN_ONLY
from .const import (
    DOMAIN,
    PANEL_URL,
    PHONE_PANEL_URL,
    SECURITY_PANEL_URL,
    SIGNAL_SETTINGS_UPDATED,
    STATIC_URL,
    STORAGE_KEY,
    STORAGE_VERSION,
    VERSION,
)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
FRONTEND_DIR = Path(__file__).parent / "frontend"
# HAUSPANEL_DEV=1 serves the frontend without caching, for working on it.
DEV = bool(os.environ.get("HAUSPANEL_DEV"))
# Newer Home Assistant lets a panel draw under the notch and home indicator itself; older versions don't know the option.
SAFE_AREA = (
    {"handle_safe_area": True}
    if "handle_safe_area" in inspect.signature(panel_custom.async_register_panel).parameters
    else {}
)


PANELS = (PANEL_URL, PHONE_PANEL_URL, SECURITY_PANEL_URL)


class SettingsStore:
    """Dashboard settings (arrangement, pages, look) of one panel, kept in .storage.

    Without a user they are shared by everyone; with a user they are that person's own copy.
    """

    def __init__(self, hass: HomeAssistant, panel: str, user_id: str | None = None) -> None:
        self.hass = hass
        self.panel = panel
        self.user_id = user_id
        # HausPanel keeps its original file; MobilePanel and SecurityPanel get their own.
        key = STORAGE_KEY if panel == PANEL_URL else f"{STORAGE_KEY}.{panel}"
        if user_id:
            key = f"{key}.user_{user_id}"
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, key)
        self.data: dict[str, Any] = {}
        self.revision = 0

    async def async_load(self, start_from: dict[str, Any] | None = None) -> None:
        data = await self._store.async_load()
        if data is None and start_from:
            # A new panel starts as a copy of HausPanel and goes its own way from there.
            data = copy.deepcopy(start_from)
            await self._store.async_save(data)
        self.data = data or {}

    async def async_save(self, data: dict[str, Any]) -> None:
        self.data = data
        self.revision += 1
        await self._store.async_save(data)
        async_dispatcher_send(self.hass, SIGNAL_SETTINGS_UPDATED, self.panel, self.user_id, self.revision)

    async def async_remove(self) -> None:
        await self._store.async_remove()


class PanelSettings:
    """The shared settings of every panel, plus each user's own copies (loaded when first asked for)."""

    def __init__(self, shared: dict[str, SettingsStore]) -> None:
        self.shared = shared
        self.personal: dict[tuple[str, str], SettingsStore | None] = {}

    async def async_personal(self, hass: HomeAssistant, panel: str, user_id: str) -> SettingsStore | None:
        key = (panel, user_id)
        if key not in self.personal:
            store = SettingsStore(hass, panel, user_id)
            data = await store._store.async_load()
            if data is None:
                self.personal[key] = None
            else:
                store.data = data
                self.personal[key] = store
        return self.personal[key]

    async def async_for(self, hass: HomeAssistant, panel: str, user_id: str) -> SettingsStore:
        """The settings this user sees on this panel: their own copy if they have one, else the shared ones."""
        return await self.async_personal(hass, panel, user_id) or self.shared[panel]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the websocket API once."""
    websocket_api.async_register_command(hass, ws_settings_get)
    websocket_api.async_register_command(hass, ws_settings_save)
    websocket_api.async_register_command(hass, ws_settings_personal)
    websocket_api.async_register_command(hass, ws_settings_subscribe)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Load settings and add the sidebar panel."""
    main = SettingsStore(hass, PANEL_URL)
    await main.async_load()
    stores = {PANEL_URL: main}
    for panel in PANELS[1:]:
        stores[panel] = SettingsStore(hass, panel)
        await stores[panel].async_load(start_from=main.data)
    hass.data[DOMAIN] = PanelSettings(stores)

    if not hass.data.get(f"{DOMAIN}_static"):
        hass.http.register_view(FrontendView())
        hass.data[f"{DOMAIN}_static"] = True

    module_url = f"{STATIC_URL}/{await hass.async_add_executor_job(_build_id)}/hauspanel.js"
    # Options: panels that only administrators see (Settings → Devices & services → HausPanel → Configure).
    admin = {panel: bool(entry.options.get(key, False)) for panel, key in ADMIN_ONLY.items()}
    entry.async_on_unload(entry.add_update_listener(_options_changed))
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="hauspanel-panel",
        frontend_url_path=PANEL_URL,
        module_url=module_url,
        sidebar_title="HausPanel",
        sidebar_icon="mdi:view-dashboard-variant",
        require_admin=admin[PANEL_URL],
        **SAFE_AREA,
        config={"version": VERSION},
    )
    # The same dashboard, always in the iPhone layout (tab bar at the bottom, Back button).
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="hauspanel-panel",
        frontend_url_path=PHONE_PANEL_URL,
        module_url=module_url,
        sidebar_title="MobilePanel",
        sidebar_icon="mdi:cellphone",
        require_admin=admin[PHONE_PANEL_URL],
        **SAFE_AREA,
        config={"version": VERSION, "phone": True},
    )
    # The same dashboard as a security screen: pages of live cameras, then locks and doors.
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="hauspanel-panel",
        frontend_url_path=SECURITY_PANEL_URL,
        module_url=module_url,
        sidebar_title="SecurityPanel",
        sidebar_icon="mdi:cctv",
        require_admin=admin[SECURITY_PANEL_URL],
        **SAFE_AREA,
        config={"version": VERSION, "layout": "security"},
    )
    return True


async def _options_changed(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register the panels again with the new admin-only choices."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel."""
    frontend.async_remove_panel(hass, PANEL_URL)
    frontend.async_remove_panel(hass, PHONE_PANEL_URL)
    frontend.async_remove_panel(hass, SECURITY_PANEL_URL)
    hass.data.pop(DOMAIN, None)
    return True


class FrontendView(HomeAssistantView):
    """Serve the panel's modules under a build id."""

    url = STATIC_URL + "/{build}/{path:.+}"
    name = "hauspanel:frontend"
    requires_auth = False

    async def get(self, request: web.Request, build: str, path: str) -> web.StreamResponse:
        root = FRONTEND_DIR.resolve()
        file = (root / path).resolve()
        if root not in file.parents or not file.is_file() or file.suffix not in (".js", ".css", ".svg", ".png", ".woff2"):
            raise web.HTTPNotFound
        # The build id in the URL changes with every update, so files can be cached for long.
        cache = "no-store" if DEV else "public, max-age=31536000, immutable"
        return web.FileResponse(file, headers={"Cache-Control": cache})


def _build_id() -> str:
    """Version plus a hash of the files, so browsers and the service worker fetch new code after an update."""
    if DEV:
        return "dev"
    digest = hashlib.sha1(VERSION.encode())
    for file in sorted(FRONTEND_DIR.rglob("*.js")):
        stat = file.stat()
        digest.update(f"{file.name}{stat.st_mtime_ns}{stat.st_size}".encode())
    return f"{VERSION}-{digest.hexdigest()[:8]}"


def _settings(hass: HomeAssistant) -> PanelSettings | None:
    return hass.data.get(DOMAIN)


PANEL_FIELD = vol.Optional("panel", default=PANEL_URL)


@websocket_api.websocket_command({vol.Required("type"): "hauspanel/settings/get", PANEL_FIELD: vol.In(PANELS)})
@websocket_api.async_response
async def ws_settings_get(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    ps = _settings(hass)
    if ps is None:
        connection.send_error(msg["id"], "not_loaded", "HausPanel is not set up")
        return
    store = await ps.async_for(hass, msg["panel"], connection.user.id)
    connection.send_result(msg["id"], {"settings": store.data, "revision": store.revision, "personal": store.user_id is not None})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hauspanel/settings/save",
        vol.Required("settings"): dict,
        PANEL_FIELD: vol.In(PANELS),
    }
)
@websocket_api.async_response
async def ws_settings_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    ps = _settings(hass)
    if ps is None:
        connection.send_error(msg["id"], "not_loaded", "HausPanel is not set up")
        return
    store = await ps.async_for(hass, msg["panel"], connection.user.id)
    await store.async_save(msg["settings"])
    connection.send_result(msg["id"], {"revision": store.revision})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hauspanel/settings/personal",
        vol.Required("enabled"): bool,
        PANEL_FIELD: vol.In(PANELS),
    }
)
@websocket_api.async_response
async def ws_settings_personal(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Switch the user's own settings for this panel on (starting from the shared ones) or off (back to shared)."""
    ps = _settings(hass)
    if ps is None:
        connection.send_error(msg["id"], "not_loaded", "HausPanel is not set up")
        return
    panel, user_id = msg["panel"], connection.user.id
    own = await ps.async_personal(hass, panel, user_id)
    if msg["enabled"] and own is None:
        own = SettingsStore(hass, panel, user_id)
        ps.personal[(panel, user_id)] = own
        await own.async_save(copy.deepcopy(ps.shared[panel].data))
    elif not msg["enabled"] and own is not None:
        ps.personal[(panel, user_id)] = None
        await own.async_remove()
    store = await ps.async_for(hass, panel, user_id)
    connection.send_result(msg["id"], {"settings": store.data, "personal": store.user_id is not None})


@websocket_api.websocket_command({vol.Required("type"): "hauspanel/settings/subscribe", PANEL_FIELD: vol.In(PANELS)})
@callback
def ws_settings_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Tell open dashboards when another screen saved new settings."""

    panel = msg["panel"]
    user_id = connection.user.id

    @callback
    def forward(changed: str, owner: str | None, revision: int) -> None:
        ps = _settings(hass)
        if changed != panel or ps is None:
            return
        own = ps.personal.get((panel, user_id))
        # Someone else's own copy, or shared settings while this user has their own: not for this screen.
        if owner is not None and owner != user_id:
            return
        if owner is None and own is not None:
            return
        store = own if owner else ps.shared[panel]
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {"settings": store.data, "revision": revision},
            )
        )

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_SETTINGS_UPDATED, forward
    )
    connection.send_result(msg["id"])
