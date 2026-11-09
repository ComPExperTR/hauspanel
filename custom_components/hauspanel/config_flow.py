"""Config flow for HausPanel: a single entry; the options say which panels only admins see."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback

from .const import DOMAIN, PANEL_URL, PHONE_PANEL_URL, SECURITY_PANEL_URL

# Option key per panel: true = only administrators see it in the sidebar and can open it.
ADMIN_ONLY = {PANEL_URL: "admin_hauspanel", PHONE_PANEL_URL: "admin_mobilepanel", SECURITY_PANEL_URL: "admin_securitypanel"}


class HausPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create the single HausPanel entry."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="HausPanel", data={})
        return self.async_show_form(step_id="user")

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return HausPanelOptionsFlow(config_entry)


class HausPanelOptionsFlow(OptionsFlow):
    """Which panels only administrators see."""

    def __init__(self, entry: ConfigEntry) -> None:
        self._entry = entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = self._entry.options
        schema = vol.Schema(
            {vol.Required(key, default=current.get(key, False)): bool for key in ADMIN_ONLY.values()}
        )
        return self.async_show_form(step_id="init", data_schema=schema)
