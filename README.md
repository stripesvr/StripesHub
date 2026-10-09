# stripes.lol

The site behind [stripes.lol](https://stripes.lol). It's a set of link pages, a few downloads, a background track, and a small page builder for making new pages.

---

## What's in here

| Path | What it is |
| --- | --- |
| `*.html` | The pages. They sit at the root so their URLs stay the same. |
| `builder.html` | A page builder. Add a heading and some buttons, then download a finished page. |
| `assets/css/` | The one stylesheet every page uses. |
| `assets/js/` | `site.js` for copy buttons, search, and the 3D hover. `cursor.js` for the cursor ring. `player.js` for the music, the gate, and the lightning. |
| `assets/audio/` | Background tracks. `song.mp3` is the one that plays. |
| `assets/img/` | Images, including the profile picture. |
| `downloads/` | Files the pages link to, sorted into `adb`, `menus`, and `bypass`. |
| `tools/` | `build-pages.py` rebuilds the generated pages. `server.js` and `bypass.ts` aren't used by the site. |
| `old/` | The site as it looked before the redesign. Kept for reference. |
| `CNAME` | The custom domain. Keep it in the root. |

## Viewing it locally

There's no build step for viewing. Serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Rebuilding the generated pages

Most link pages come from the data in `tools/build-pages.py`. After you change that data, run:

```bash
python3 tools/build-pages.py
```

This rebuilds `index.html`, `idk.html`, the link pages, the mod-menu pages, and `unreleased.html`. Edit `works.html` and `builder.html` by hand. The script doesn't touch them.

## Adding a page

The builder is the easiest way:

1. Open `builder.html` in a browser.
2. Set the heading and add your buttons. Each one can be a link, a download, a copy-to-clipboard line, or a download that also copies some text.
3. Download the page and save it in the repo root.
4. To show it on the home list, add an entry to `HOME_ITEMS` in `tools/build-pages.py`, then rebuild.

## Adding a download

1. Put the file in the matching folder under `downloads/`.
2. Link to it by its full path, like `downloads/menus/NewMenu.zip`, in the page data in `tools/build-pages.py`.

## Good to know

- **The gate:** Every full page load shows a "Click to Enter" screen, and clicking it starts the music. Moving between pages on the site keeps the music going without showing the gate again.
- **Search:** On pages with a search box, press `/` to jump to it and `Esc` to clear it.
- **Missing files:** `downloads/menus/PATCHED.zip` and `downloads/menus/UG-Android.zip` are linked from pages but aren't in the repo yet.
