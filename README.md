# ASTRONEER Save Fixer

Creative Mode can disable missions and achievements in an ASTRONEER save.

This tool helps restore them locally in your browser, without uploading your file anywhere.

Open the fixer here:

https://te4a.github.io/astroneer-save-fixer/

## What To Do

1. Make a backup of your original save.
2. Open the link above.
3. Choose the `.savegame` file affected by Creative Mode.
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

Keep a backup. This tool was made from real saves affected by Creative Mode, but save files can be different.

The repaired file keeps the original name as much as possible. If the name contains `$c`, the tool changes it back to `$`, because ASTRONEER uses that marker for Creative Mode saves.

## What It Fixes

It restores missions and achievements, then removes the most common Creative Mode markers from the save.
