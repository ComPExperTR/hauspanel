<p align="center"><img src="images/icon.png" width="112" alt="HausPanel"></p>

<h1 align="center">HausPanel</h1>

<p align="center"><b>A Home Assistant dashboard that lays itself out from your rooms.</b><br>
For the tablet on the wall, the phone in your pocket and a screen for the cameras.</p>

<p align="center">
  <a href="https://github.com/alpacalabs-de/hauspanel/actions"><img src="https://github.com/alpacalabs-de/hauspanel/actions/workflows/validate.yml/badge.svg" alt="Validate"></a>
  <a href="https://github.com/alpacalabs-de/hauspanel/releases"><img src="https://img.shields.io/github/v/release/alpacalabs-de/hauspanel" alt="Release"></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-2024.7%2B-41BDF5" alt="Home Assistant 2024.7+">
  <a href="https://hacs.xyz"><img src="https://img.shields.io/badge/HACS-custom-orange" alt="HACS custom repository"></a>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
</p>

<p align="center"><img src="images/screenshots/tablet-home.png" alt="HausPanel on a wall tablet" width="900"></p>

Home Assistant already knows your house: which rooms are on which floor, and which lamp, thermostat or lock hangs where. HausPanel takes that map and turns it into screens you can use at a glance, from the hallway as well as from the sofa. When you add a device to a room, it simply turns up in that room. The integration runs on your own Home Assistant and talks to nothing else.

Free and open source (MIT), made by [Alpaca Labs](https://alpacalabs.de). *Deutsch: [weiter unten](#deutsch).*

**Contents:** [Three panels](#three-panels) · [Features](#features) · [Popups](#popups-for-your-devices) · [Settings](#settings) · [Install](#install) · [First steps](#first-steps) · [FAQ](#good-to-know) · [Development](#development) · [Support](#support)

## Three panels

Installing the integration adds three entries to the Home Assistant sidebar. Each keeps its own settings, so the wall tablet and the phone can show different things.

| Panel | Made for | What you get |
|---|---|---|
| **HausPanel** | Wall tablets, computers | Home with status chips, rooms, media, security, energy and your own pages. Layouts: Panel, Tiles, Rows, Sidebar. |
| **MobilePanel** | Phones | Tab bar at the bottom, rooms by floor, a room opens as a sheet, swipe back. |
| **SecurityPanel** | A small touchscreen, e.g. a Raspberry Pi at 1024×600 | Pages of live cameras, then a status page with locks, doors and alarms. Only the page on screen streams. |

<table>
  <tr>
    <td width="25%"><img src="images/screenshots/phone-home.png" alt="MobilePanel: Home"></td>
    <td width="25%"><img src="images/screenshots/phone-rooms.png" alt="MobilePanel: rooms by floor"></td>
    <td width="25%"><img src="images/screenshots/phone-room.png" alt="MobilePanel: a room"></td>
    <td width="25%"><img src="images/screenshots/phone-security.png" alt="MobilePanel: security"></td>
  </tr>
  <tr>
    <td><sub>Home: chips, scenes, today, rooms</sub></td>
    <td><sub>Rooms by floor, all the same size</sub></td>
    <td><sub>A room as a sheet</sub></td>
    <td><sub>What is open, the alarm, lock all</sub></td>
  </tr>
</table>

## Features

**Builds itself**
- Areas → devices → entities: every room gets its own tiles, sorted: heating, lights, sockets, the rest.
- Floors group the rooms; outdoor areas are recognised.
- Edit mode to move, hide, add, group under headings, make tiles wider or taller, and reset a room to its default order.
- Hide whole device types, integrations, entities by text, or one by one.

**Home screen**
- **Status chips** for light, climate, shades, security, energy, today, maintenance and leaving home. A tap opens a popup with the details. Each chip can be switched off.
- **Scenes ask first**: the first tap arms, the second runs. So *Good night* never starts by accident.
- **Today** card with events from your calendars and to-do lists.
- Two home styles: every room as a card, or *on now + favourites*.

**Rooms**
- A tap on a room opens the **room popup**: a temperature ring, big tiles for light, shades, music and switches, the room's devices and scenes. Under *Customise* you choose which sections open by default.
- Light tiles switch with their icon; a tap on the tile opens brightness and colour.
- Shades as a draggable window with up, 50 %, down and stop, for one shade or all of them in a room.
- Thermostat tiles show a flame only while the room really heats.

**Security**
- The popup behind the Security chip: what is open, the alarm with its modes (asks for the code if needed), smoke detectors, the last movements from Frigate with short clips, and *Leaving*.
- **May be open**: per door, gate or lock, a time window when it may be open without a warning, for example an entry gate during the day. Overnight windows and weekdays work.
- **Good night check** before the night scene: lights, doors, gates, locks, shades and running machines, each fixable with one tap, then the scene and optionally the alarm on *home*.
- **Leaving home**: switches off what is on, pauses music, optionally locks and closes. Home Assistant takes a snapshot first, so *Undo* puts everything back.
- **Doorbell**: when it rings, wall tablets show the door camera full screen with a button to open the door (two taps).
- **Baby monitor**: a camera full screen without a time limit, dimmed for the night, with room climate and movement over the last hours.
- Cameras open full screen with a tap; swipe for the next one.

**Energy and devices**
- **Energy page** from Home Assistant's energy settings: now, day, week, month, year, costs, solar, self-sufficiency, biggest consumers.
- **Sockets that measure power** show watts and usage; set any of them to *meter only* so a fridge can't be switched off by accident.
- **Maintenance** chip appears only when a battery is low or a device is unreachable.

**For everyone in the house**
- Settings are stored in Home Assistant and reach every open screen at once. Layout and tile size are remembered per device.
- *My own settings* gives one person their own arrangement of a panel.
- Any panel can be made visible to administrators only.
- In English, German, French, Dutch, Spanish, Italian, Polish and Swedish, following the language of Home Assistant.

## Popups for your devices

When HausPanel finds the matching integration, it gives the device its own popup instead of the standard one.

| Device | What the popup shows |
|---|---|
| Weather | Sky for the time of day, feels like, humidity, wind, sunrise or sunset, the next hours as a curve, 7 days with rain |
| Thermostat | A dial you can drag, open windows in the room, modes, the last 24 hours |
| Heat pump | Outdoor unit, flow and return, hot water tank, power now, costs today and this month |
| Washer, dryer, dishwasher | Moving drum, progress, time left, when it is done, the last runs (WashData, Home Connect) |
| Car | Battery and range, charging, doors and windows, where it is, last trip, pre-heating |
| Wallbox | Power into the car (green when the sun pays), this charge in kWh and euros, start and stop |
| Solar | Today's production under the sun's arc, yesterday for comparison, saved today, this month, this year |
| Robot vacuum | The robot on a small floor while it cleans, suction, wear of filter and brushes |
| Gate and garage door | A door that moves with the real state, "open for 12 min", the camera of that place, open/close with two taps |
| Front door | Live picture, last ring and motion, open the door with two taps |
| Garden irrigation, pool | Zones with time left and the next run; pool temperature, pH and redox |
| 3D printer | Live view, progress, layers, temperatures, pause and stop |
| Speakers | Player with artwork, volume, speaker choice; Music Assistant playlists and search |
| Network | Internet → gateway → access points as a live map, latency, Wi-Fi clients |

<table>
  <tr>
    <td width="50%"><img src="images/screenshots/tablet-room.png" alt="Room popup"><br><sub>Room popup: temperature ring, light, shades, switches and scenes.</sub></td>
    <td width="50%"><img src="images/screenshots/tablet-security.png" alt="Security popup"><br><sub>Security: what is open, the alarm, smoke detectors, lock all.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="images/screenshots/tablet-light.png" alt="Light overview"><br><sub>A tap on <i>Light</i>: every lamp that is on, by room.</sub></td>
    <td width="50%"><img src="images/screenshots/tablet-climate.png" alt="Climate overview"><br><sub>A tap on <i>Climate</i>: every room's temperature and target.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="images/screenshots/tablet-weather.png" alt="Weather popup"><br><sub>Weather on one screen, no scrolling.</sub></td>
    <td width="50%"><img src="images/screenshots/security.png" alt="SecurityPanel"><br><sub>SecurityPanel: the status page after the camera pages.</sub></td>
  </tr>
</table>

## Settings

The gear at the top right opens the settings. Every tab starts with one line on what it is for, and the note below it says who a change applies to: this screen, you, or everyone.

| Tab | What you set there |
|---|---|
| **Home** | Home style, which status chips show, the cards on Home, date, weather and calendar in the header |
| **Rooms & devices** | What a tap on a room opens (room at a glance or the full page), scenes ask first, one tile for all shades of a room |
| **Security** | Which doors, gates and locks are watched and in which order, when each may be open, the cameras (Security page for everyone, last movements just for you), the parts of the security popup, good night check, doorbell, baby monitor |
| **Look** | Card colour, accent colour, background (it can follow the colour of the lights that are on), corners, glass, classic popups |
| **This screen** | Layout, tile size, side panel, hide the Home Assistant sidebar, cameras per page |
| **Navigation** | Which tabs show in the bar at the bottom, your own pages |
| **Calendar and weather** | Which calendars and lists, which weather source (Open-Meteo when you have none) |
| **Hiding** | Single entities, text rules, device types, integrations |
| **System** | Your own settings for this panel, open HausPanel first when Home Assistant starts |

<table>
  <tr>
    <td width="50%"><img src="images/screenshots/tablet-settings.png" alt="Settings: Security"><br><sub>Settings → Security: watched doors, when they may be open, the popup's parts.</sub></td>
    <td width="50%"><img src="images/screenshots/tablet-settings-look.png" alt="Settings: Look"><br><sub>Settings → Look: colours and background, shown live behind the window.</sub></td>
  </tr>
</table>

**Step by step:** short guides for wall tablets, phones, the gate that may be open during the day, cameras, hiding and more are in [docs/guides.md](docs/guides.md). Every settings tab links to the one that fits.

## Install

### With HACS (recommended)

1. HACS → three dots → **Custom repositories** → add `https://github.com/alpacalabs-de/hauspanel` as type **Integration**.
2. Install **HausPanel** and restart Home Assistant.
3. **Settings → Devices & services → Add integration → HausPanel**.

### By hand

Download the latest [release](https://github.com/alpacalabs-de/hauspanel/releases), copy `custom_components/hauspanel` into the `custom_components` folder of your Home Assistant configuration, restart, then add the integration as above.

Requires Home Assistant 2024.7 or newer (tested with 2026.10 and 2026.11).

## First steps

1. **Rooms and floors**: assign your devices to areas, and areas to floors, under *Settings → Areas, labels & zones*. That is what HausPanel builds from.
2. Open **HausPanel** in the sidebar. On a phone, use **MobilePanel**.
3. Open the **settings** (gear) and go through the tabs from left to right. Start with *This screen* on a wall tablet and switch on *Hide the Home Assistant sidebar*.
4. Something you don't want to see? **Settings → Hiding**, or the pencil (edit mode) and the minus on a tile.
5. Want HausPanel to open first? **Settings → System → Start screen** in HausPanel, for you or (as admin) for everyone.

## Good to know

- **Where are my settings?** In Home Assistant, under `.storage/hauspanel.settings*`. They are part of every Home Assistant backup.
- **Energy page empty?** It uses the sources and price from *Settings → Dashboards → Energy*. Long-term statistics need a few hours after you set them up.
- **Cameras** use Home Assistant's own stream (WebRTC, HLS or MJPEG). The last movements in the security popup need the [Frigate integration](https://github.com/blakeblackshear/frigate-hass-integration).
- **Screen rotation on the iPhone** can't be locked by a web page. Use the orientation lock in Control Center.
- **After an update** the panels load the new version by themselves. If a screen still shows the old one, reload it once.
- Font: Outfit (SIL Open Font License), shipped in `frontend/fonts/`.

## Development

There is no build step: the frontend is plain JavaScript modules in `custom_components/hauspanel/frontend/`.

```bash
python3 -m venv .venv-ha && .venv-ha/bin/pip install homeassistant
HAUSPANEL_DEV=1 .venv-ha/bin/hass -c ha-config
```

`HAUSPANEL_DEV=1` serves the frontend without caching. Without it, a build id (version + file hash) in the path makes browsers load new code after an update. The screenshots come from Home Assistant's demo integration.

- `__init__.py`: the three panels, serving the frontend, the websocket API for settings (per panel, optionally per user)
- `frontend/hauspanel.js`: the panel (header, pages, dock)
- `frontend/lib/`: `model.js` (areas → devices → entities), `domains.js` (what a tap does), `tile.js`, `layouts.js`, `phone.js`, `securitypanel.js`, `roompop.js`, `overviews.js` (the chip popups), `settings.js`, `store.js`, `i18n.js`, `styles.js` and one file per device popup

Bugs and ideas are welcome as [issues](https://github.com/alpacalabs-de/hauspanel/issues).

## Support

HausPanel is free and stays free. If it saves you time, you can buy us a coffee:

<a href="https://ko-fi.com/alpacalabs"><img src="https://img.shields.io/badge/Ko--fi-Buy%20us%20a%20coffee-6cc7b2?logo=kofi&logoColor=white" alt="Buy us a coffee on Ko-fi"></a>

A star on GitHub, a bug report or an idea in the [issues](https://github.com/alpacalabs-de/hauspanel/issues) helps just as much.

## License

MIT © 2026 Alpaca Labs. See [LICENSE](LICENSE).

---

## Deutsch

**Ein Home-Assistant-Dashboard, das sich aus deinen Räumen selbst aufbaut**: für das Tablet an der Wand, das Handy und einen Bildschirm für die Kameras.

Home Assistant kennt dein Haus schon: welche Räume auf welcher Etage liegen und welche Lampe, welches Thermostat oder Schloss wo hängt. HausPanel macht daraus Bildschirme, die man im Vorbeigehen versteht. Ein neues Gerät in einem Raum taucht einfach in diesem Raum auf. Die Integration läuft auf deinem eigenen Home Assistant und spricht mit sonst niemandem.

**Drei Einträge in der Seitenleiste**, jeder mit eigenen Einstellungen:

- **HausPanel** für Wandtablet und Computer (Layouts Panel, Kacheln, Zeilen, Seitenleiste)
- **MobilePanel** fürs Handy (Leiste unten, Räume nach Etagen, Raum als Popup, Wischen zurück)
- **SecurityPanel** für einen kleinen Touchscreen (Seiten mit Live-Kameras, dann Schlösser und Türen)

**Das Wichtigste:**

- **Status-Chips** oben auf der Startseite für Licht, Klima, Rollos, Sicherheit, Energie, Heute, Wartung und Haus verlassen. Ein Tipp öffnet ein Popup mit allen Details.
- **Raum-Popup** mit Temperaturring, großen Kacheln für Licht, Rollos, Musik und Schalter, dazu Szenen. Pro Raum einstellbar, welche Bereiche offen sind.
- **Sicherheit**: was offen ist, Alarm mit Modi, Rauchmelder, die letzten Bewegungen von Frigate mit kurzen Clips. Pro Tür, Tor oder Schloss ein **Zeitraum, in dem es offen sein darf**, z. B. das Einfahrtstor tagsüber.
- **Gute-Nacht-Check**, **Haus verlassen** mit Rückgängig, **Türklingel** mit Kamera im Vollbild, **Babyfon**.
- Eigene Popups für Wetter, Thermostat, Wärmepumpe, Waschmaschine und Trockner, Auto, Wallbox, Solar, Saugroboter, Tore, Haustür, Garten, Pool, 3D-Drucker, Lautsprecher und Netzwerk.
- **Energie-Seite** aus den Energie-Einstellungen von Home Assistant. Steckdosen mit Messung können auf *nur messen* gestellt werden.
- **Einstellungen** in übersichtlichen Tabs: Startseite, Räume & Geräte, Sicherheit, Aussehen, Dieser Bildschirm, Navigation, Kalender und Wetter, Ausblenden, System. Jeder Tab erklärt oben in einem Satz, wofür er da ist.

**Installieren:** In HACS unter „Benutzerdefinierte Repositories“ `https://github.com/alpacalabs-de/hauspanel` als „Integration“ hinzufügen, HausPanel installieren, Home Assistant neu starten, dann **Einstellungen → Geräte & Dienste → Integration hinzufügen → HausPanel**.

**Erste Schritte:** Geräte Räumen zuordnen und Räume Etagen, dann HausPanel öffnen und die Einstellungen von links nach rechts durchgehen.

**Schritt für Schritt:** kurze Anleitungen fürs Wandtablet, das Handy, das Tor, das tagsüber offen sein darf, Kameras, Ausblenden und mehr stehen in [docs/guides.de.md](docs/guides.de.md). Jeder Reiter in den Einstellungen verlinkt die passende.

**Unterstützen:** HausPanel ist kostenlos und bleibt es. Wenn es dir Zeit spart, kannst du uns auf [Ko-fi einen Kaffee spendieren](https://ko-fi.com/alpacalabs). Ein Stern auf GitHub oder eine Idee als Issue hilft genauso.

Kostenlos und quelloffen (MIT), von [Alpaca Labs](https://alpacalabs.de). Fragen und Fehler gern als [Issue](https://github.com/alpacalabs-de/hauspanel/issues).
