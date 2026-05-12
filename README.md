# ASTRONEER Save Fixer

Static browser tool for fixing ASTRONEER `.savegame` files after Creative Mode disables missions.

The save is processed locally in the browser. It is not uploaded to a server.

## What It Changes

- Restores the hidden mission availability flag inside `AstroMissionsManager`.
- Clears common Creative Mode flags such as `bCreativeModeActive`, `bIsIndividualDedicatedServerGame`, and related creative ability toggles.
- Writes a new `.fixed.savegame` file and leaves the original untouched.

## Local Use

Open `index.html` in a browser, choose a `.savegame`, then download the fixed copy.

## Notes

This was tested against saves where missions were disabled after Creative Mode was enabled and then turned off. Always keep a backup of the original save.
