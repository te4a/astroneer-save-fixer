# ASTRONEER Save Fixer

Did you accidentally turn on Creative Mode in ASTRONEER and lose access to missions?

This tool tries to repair that save.

Open the fixer here:

https://te4a.github.io/astroneer-save-fixer/

## What To Do

1. Make a backup of your original save.
2. Open the link above.
3. Choose your `.savegame` file.
4. Click **Fix save**.
5. Download the repaired file.
6. Put the repaired file back into your ASTRONEER save folder.

The file is fixed in your browser. It is not uploaded anywhere.

## Where Saves Usually Are

On Windows, ASTRONEER saves are usually here:

```text
%LOCALAPPDATA%\Astro\Saved\SaveGames
```

You can paste that path into File Explorer.

## Important

Keep a backup. This tool was made from real saves where Creative Mode was turned on by mistake, but save files can be different.

The repaired file keeps the original name as much as possible. If the name contains `$c`, the tool changes it back to `$`, because ASTRONEER uses that marker for Creative Mode saves.

## What It Fixes

It restores the mission list and removes the most common Creative Mode markers from the save.
