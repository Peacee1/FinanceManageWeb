# Peacee1 Tasks web client

Source recovered from the existing production Tasks deployment before the monochrome refresh. Uses the shared authenticated `/api/tasks` backend. No changes to account ownership or task permissions.

Deploy `index.html`, `app.js`, `language.js`, `style.css`, `theme.js`, `calendar.js`, `piano-player.js`, `refinements.css` and the `assets/` files into the existing Nginx Tasks root; preserve all existing assets. The native app is in `../tasks-mobile`.

The compact calendar selects a date and shows its tasks below the fixed month grid. Piano 1 and Piano 2 were extracted from the user's October 25 recordings, removing initial recording silence. Playback fades out during the final two seconds and leaves a two-second silent gap before replay. A separate envelope gain preserves the fade when the volume slider changes.

Quick Focus sends its screen state to the native wrapper, allowing landscape only on that screen. The idle clock repositions on resize. Reminders stay below the clock: the initial one mentions Do Not Disturb and charging; 60 original focus messages follow at five-minute intervals based on active timer progress, preserving progress through pauses. The dial captures its center once per gesture, coalesces pointer moves per animation frame, and ignores center crossings.

Run `node --test test/*.test.cjs` and `node --check app.js` before deployment.
