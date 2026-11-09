# Changelog

## Unreleased

- **Waste chip**: with Waste Collection Schedule or a waste calendar (Abfall, Müll, Waste, Trash, Bin …), a chip shows on Home the day before and on the day of a pickup (*Tomorrow: Yellow bin*), coloured by kind of bin; a tap shows the next two weeks.
- **Motion in the room popup**, a personal choice in *Settings → Rooms & devices*: *Motion now* or how long the room has been quiet.
- **Back up and restore** in *Settings → System*: the panel's settings as a file, and loading them back after a confirmation.
- **Take settings from another panel** (same place): from MobilePanel, HausPanel or SecurityPanel, either the house settings (hidden devices, door time windows, Security page cameras, doorbell, baby monitor, calendars, weather …) or everything.
- **Lite mode** in *Settings → This screen → Effects*: no blur, glow or endless animations. *Automatic* turns it on when the screen seems slow.

## 1.3.1

- Last movements: a **full screen** button next to the close button. On the iPhone the clip itself goes full screen.
- Edit mode: the **status chips** on Home can be dragged with a finger (the page no longer scrolls away) and no longer flip back and forth between chips of different widths; tiles sort the same steady way.

## 1.3.0

- **Maintenance** also lists devices that went quiet (a temperature, humidity or battery sensor without news for two days) and consumables that are nearly used up (filters, brushes, mops, dust bags, toner, ink at 10 % or less). Each can be ignored like the others.
- **Worth a look** at the top of the settings: devices without a room, rooms without a floor, cameras that can't be reached, each linking its guide.
- The last movements in the security popup only show when Frigate is there.
- **Clips play on the iPhone**: the last movements load the short clip first and play it from memory, since Home Assistant passes Frigate clips on without the byte ranges iPhones need. A spinner shows while it loads; without a clip yet, the snapshot.
- GitHub: forms for bug reports, ideas and translations; the README explains how to fix a translation and shows a short demo.

## 1.2.0

**New for everyone**
- **Welcome**: the first time you open HausPanel, three short steps: your rooms (how many were found, how many devices have no room), the layout for this screen, and where the settings and guides are. *Settings → System* shows it again.
- **Step by step**: guides in English and German in `docs/`, and a link to the right one on every settings tab.
- **More languages**: French, Dutch, Spanish, Italian, Polish and Swedish, besides English and German. The font now has the extended Latin letters too.

**Rooms**
- **Rooms tab**: on tablet and desktop every room at once, by floor, as cards, rows or compact rows. A tap opens the room popup, holding opens the room page (with *All rooms* to go back).
- **Shades in the room popup**: one wide tile with a slider that sets all shades of the room at once; expanded, one slim line per shade with its own slider, up and down (Stop while moving).
- Settings: *A tap on a room opens* with two clear choices, room at a glance or full room page.

**Security**
- **Cameras** in *Settings → Security*: which ones the Security page shows, and which ones the last movements come from.
- **Last movements** per person: the camera button next to them picks the cameras just for you; Home Assistant keeps the choice with your user.
- **Leaving home** and **Good night** warn when windows are open and rain, a thunderstorm or frost is coming in the next hours.

**Other**
- Status text on room cards stays on one line in every language.
- German texts now say *Sicherheits-Popup* and *Babyphone* throughout.

## 1.1.0

**Settings**
- New **Security** tab: watched doors, gates and locks (order, shown or hidden), when each may be open, the parts of the security popup, good night check, doorbell and baby monitor in one place.
- Every settings tab starts with one line on what it is for.

**Security**
- **May be open**: a time window per door, gate or lock (with weekdays, overnight works) in which it being open is not a warning.
- The Security chip and the security page open a popup: what is open, the alarm with its modes, smoke detectors, the last movements from Frigate with short clips, and Leaving.
- The security popup fits on one screen; a pencil arranges its parts.

**Rooms**
- Room popup with temperature ring, big tiles for light, shades, music and switches; per room you choose which sections are open by default.
- Shades as a draggable window with up, 50 %, down and stop, also for all shades of a room at once.
- Room tiles on the phone all have the same height; long names get a little smaller.

**Popups**
- Weather on one screen: sky for the time of day, feels like, humidity, wind, sunrise or sunset, the next hours and 7 days with rain.
- New or reworked popups for the wallbox, solar, heat pump, car, appliances and the good night check.

**Other**
- Cameras are told apart indoors and outdoors by their room, not by their name.

## 1.0.0

First release.
