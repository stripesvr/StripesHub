# stripes.lol

Source for the stripes.lol site, served by GitHub Pages.

## Layout

- `*.html` at the root: the pages. They stay at the root so their URLs don't change.
- `builder.html`: the page builder for making new subpages. It exports a finished page you can save here.
- `assets/css/styles.css`: the one stylesheet for every page.
- `assets/js/`:
  - `site.js`: copy buttons, search, 3D hover, scroll progress.
  - `cursor.js`: the cursor ring and trail.
  - `player.js`: the music, the "Click to Enter" gate, the lightning, and page changes without a reload.
- `assets/audio/`: background tracks. `song.mp3` is the one that plays.
- `assets/img/`: images.
- `downloads/adb/`, `downloads/menus/`, `downloads/bypass/`: files that pages link to.
- `tools/`: `build-pages.py` rebuilds the generated pages. `server.js`, `bypass.ts`, and `stats.txt` are not used by the site.
- `CNAME`: the custom domain. It must stay at the root.

## Rebuilding the generated pages

```
python3 tools/build-pages.py
```

This rewrites `index.html`, `idk.html`, the link pages, the mod-menu pages, and `unreleased.html`. Edit `works.html` and `builder.html` directly, since the script doesn't generate them.

## Adding a download

1. Put the file in the matching `downloads/` folder.
2. Link to it with the full path, for example `downloads/menus/NewMenu.zip`, in the page data in `tools/build-pages.py`. Or add the row with the builder.

## Known gaps

`downloads/menus/PATCHED.zip` and `downloads/menus/UG-Android.zip` are linked from pages but aren't in the repo. Add those files to fix the broken links.
