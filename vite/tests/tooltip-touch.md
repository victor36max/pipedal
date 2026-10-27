# Tooltip and controlled-input touch regression

Run `npm run dev -- --host 127.0.0.1` and open
`http://127.0.0.1:5173/tests/tooltip-touch.html` on the test browser.
For a physical touchscreen, serve a bundled copy locally on that device.
The fixture has no PiPedal model connection and cannot alter audio or presets.

Test native checkbox, plain MUI Switch and MUI Switch inside ToolTipEx:

- Tap each twice: exactly two changes, ending OFF.
- Repeat several times; verify each tap changes once and the ripple clears.
- Hold and release; verify the tooltip clears as expected and no stuck ripple.
- Drag away/cancel; compare with the plain MUI switch's native behavior.
- With keyboard/mouse, verify Tab/Space, click and focus indicators.

The page shows event traces and change counts; the console includes React
onChange events. No synthetic click or touchend activation is installed.

## Physical evidence, 2026-10-27

On the rig's Chromium/Wayland touchscreen, the native checkbox and plain MUI
switch each toggled twice. The original ToolTipEx delivered native click/change
but no React onChange, and the controlled input returned to OFF. Moving the
wrapper's state-reset handler from click capture to bubbling click produced ten
alternating React onChange events. The user confirmed normal toggling and glow
clearing, including the requested hold/release check.

The capture handler updates tooltip state before React's bubbling change-event
processing. Keeping this cleanup in bubbling click avoids that ordering problem.
The former bypass-only synthetic-click workaround and its ripple fix are removed.

A simplified jsdom reproduction passed both before and after, so it is not a
regression proof. Physical Firefox/Safari touch, keyboard/mouse, cancellation and
integration on the actual pedalboard remain to be verified; do not claim broad
cross-browser verification from this fixture alone.
