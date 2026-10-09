#!/usr/bin/env python3
"""Rebuilds the generated stripes.lol pages (home, link pages, mod-menu pages, unreleased).

Run from anywhere: python3 tools/build-pages.py
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def esc(text):
    return html.escape(text, quote=True)


def svg(body):
    return (
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>"
    )


ICON = {
    "chev": svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
    "ext": svg('<path d="M7 17 17 7"/><path d="M8 7h9v9"/>'),
    "dl": svg('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    "copy": svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    "back": svg('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>'),
    "link": svg(
        '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/>'
        '<path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>'
    ),
    "search": svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
}


# Bottom-left dock: music toggle next to the view counter.
EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
DOCK = (
    '    <div class="dock">\n'
    '        <button class="music-toggle" type="button" aria-pressed="false">'
    '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>'
    '<span class="music-label">Music off</span></button>\n'
    '    </div>\n'
)
# Click-to-enter gate for pages outside the swappable content.
GATE = ('    <div class="intro-overlay" id="overlay-screen">\n'
    '        <div class="intro-cta" id="enter-status">Click to Enter...</div>\n'
    '    </div>\n')
SITE_JS = '<script src="site.js" defer></script>\n    <script src="cursor.js" defer></script>\n    <script src="player.js" defer></script>'


def row_html(i, item):
    href = item["href"]
    attrs = item.get("attrs", "")
    if href.startswith("http"):
        icon = "ext"
    elif "download" in attrs:
        icon = "dl"
    else:
        icon = "chev"
    if 'target="_blank"' in attrs and "rel=" not in attrs:
        attrs += ' rel="noopener"'
    badge_html, badge_text = "", ""
    if item.get("badge"):
        text, cls = item["badge"]
        badge_html = f' <span class="badge {cls}">{esc(text)}</span>'
        badge_text = " " + text
    search = esc((item["title"] + " " + item["desc"] + badge_text).lower())
    return (
        f'            <a class="row" href="{esc(href)}" data-search="{search}" style="--i:{i}"{attrs}>\n'
        '                <span class="row-body">\n'
        f'                    <span class="row-title">{esc(item["title"])}{badge_html}</span>\n'
        f'                    <span class="row-desc">{esc(item["desc"])}</span>\n'
        "                </span>\n"
        f'                <span class="row-icon">{ICON[icon]}</span>\n'
        "            </a>\n"
    )


def rowlist(items, list_id=None):
    id_attr = f' id="{list_id}"' if list_id else ""
    return f'        <div class="list"{id_attr}>\n' + "".join(row_html(i, it) for i, it in enumerate(items)) + "        </div>\n"


def cmd(text):
    return (
        '            <div class="cmd">\n'
        f'                <code>{html.escape(text, quote=False)}</code>\n'
        '                <button class="btn btn-copy" type="button" aria-label="Copy command">'
        f'{ICON["copy"]}<span>Copy</span></button>\n'
        "            </div>\n"
    )


def card_html(i, item):
    search = esc((item["title"] + " " + item["desc"] + " " + (item.get("cmd") or "")).lower())
    attrs = item.get("attrs", " download")
    out = (
        f'            <article class="card" data-search="{search}" style="--i:{i}">\n'
        '                <div class="card-head">\n'
        '                    <div class="card-info">\n'
        f'                        <h2 class="card-title">{esc(item["title"])}</h2>\n'
        f'                        <p class="card-desc">{esc(item["desc"])}</p>\n'
        "                    </div>\n"
        f'                    <a class="btn btn-icon" href="{esc(item["href"])}"{attrs} title="{esc(item["dl_title"])}" '
        f'aria-label="{esc(item["dl_title"])}">{ICON["dl"]}</a>\n'
        "                </div>\n"
    )
    if item.get("cmd"):
        out += cmd(item["cmd"])
    return out + "            </article>\n"


def cardlist(items, list_id):
    return f'        <div class="list" id="{list_id}">\n' + "".join(card_html(i, it) for i, it in enumerate(items)) + "        </div>\n"


def search_block(target, label):
    return (
        '        <div class="search">' + ICON["search"] + "\n"
        f'            <input type="search" placeholder="Search {esc(label)}" aria-label="Search {esc(label)}" '
        f'data-filter="{target}" autocomplete="off" spellcheck="false">\n'
        "            <kbd>/</kbd>\n"
        "        </div>\n"
        '        <p class="empty" data-empty>Nothing matches that search.</p>\n'
    )


def label(text):
    return f'        <p class="section-label">{esc(text)}</p>\n'


def head_block(title, desc, extra=""):
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "<head>\n"
        '    <meta charset="UTF-8">\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        '    <meta name="color-scheme" content="dark">\n'
        '    <meta name="theme-color" content="#07070a">\n'
        f'    <meta name="description" content="{esc(desc)}">\n'
        f'    <meta property="og:title" content="{esc(title)}">\n'
        f'    <meta property="og:description" content="{esc(desc)}">\n'
        '    <meta property="og:image" content="https://stripes.lol/151.png">\n'
        f"    <title>{esc(title)}</title>\n"
        '    <link rel="icon" href="151.png">\n'
        '    <link rel="stylesheet" href="styles.css">\n'
        f"{extra}"
        "</head>\n"
    )


def subpage(title, h1, body, *, eyebrow="Downloads", h1_id=None, extra_head="", pre="", scripts=SITE_JS, body_attrs=""):
    id_attr = f' id="{h1_id}"' if h1_id else ""
    eyebrow_html = f'            <p class="eyebrow">{esc(eyebrow)}</p>\n' if eyebrow else ""
    return (
        head_block(title, f"{h1} on stripes.lol", extra_head)
        + f"<body{body_attrs}>\n"
        + '    <canvas id="lightning-canvas" aria-hidden="true"></canvas>\n'
        + '    <audio id="bg-audio" preload="none" crossorigin="anonymous"></audio>\n'
        + DOCK
        + GATE
        + '    <div id="app">\n'
        + pre
        + '    <div class="progress" aria-hidden="true"></div>\n'
        + '    <div class="page">\n'
        + '        <nav class="topbar">\n'
        + f'            <a class="back" href="index.html">{ICON["back"]}Home</a>\n'
        + '            <div class="topbar-right">\n'
        + f'                <button class="btn btn-ghost btn-sm" type="button" data-copy-link aria-label="Copy link to this page">{ICON["link"]}<span>Share</span></button>\n'
        + "            </div>\n"
        + "        </nav>\n\n"
        + '        <header class="header">\n'
        + eyebrow_html
        + f'            <h1 class="title"{id_attr}>{esc(h1)}</h1>\n'
        + "        </header>\n\n"
        + "        <main>\n"
        + body
        + "        </main>\n\n"
        + "    </div>\n"
        + "    </div>\n"
        + f"    {scripts}\n"
        + "</body>\n"
        + "</html>\n"
    )


def home_page(title, overlay, items):
    head_style = (
        "    <style>\n"
        "        body.intro {\n"
        "            background-color: var(--beat-color-pulse, var(--bg));\n"
        "        }\n"
        "    </style>\n"
    )
    return (
        head_block(title, "Downloads, tools and links from stripes.lol", head_style)
        + '<body class="intro">\n'
        + '    <canvas id="lightning-canvas" aria-hidden="true"></canvas>\n'
        + '    <audio id="bg-audio" preload="none" crossorigin="anonymous"></audio>\n'
        + DOCK
        + '    <div id="app">\n'
        + overlay
        + '    <div class="main-content" id="site-content">\n'
        + '        <div class="page">\n'
        + '            <header class="hero">\n'
        + '                <div class="avatar-wrap"><img class="avatar" src="151.png" alt="StripesVR profile picture"></div>\n'
        + '                <h1 class="hero-title">stripes.lol</h1>\n'
        + "            </header>\n\n"
        + '            <div class="sub-locker" id="subscription-modal">\n'
        + "                <h3>Attention</h3>\n"
        + "                <p>Please Subscribe to my channel before continuing to my site.</p>\n"
        + '                <a href="https://youtube.com/@virtualstripes?sub_confirmation=1" target="_blank" rel="noopener" '
        + 'class="btn btn-primary btn-block" id="subscribe-action-btn">1. Subscribe on YouTube</a>\n'
        + '                <p class="error-msg" id="locker-error">Please complete step 1 before checking status!</p>\n'
        + '                <button class="btn btn-block" type="button" id="verify-action-btn">2. Check Verification</button>\n'
        + "            </div>\n\n"
        + '            <main class="section">\n'
        + search_block("#menu-links", "links")
        + '            <nav class="list" id="menu-links">\n'
        + "".join(row_html(i, it) for i, it in enumerate(items))
        + "            </nav>\n"
        + "            </main>\n\n"
        + "        </div>\n"
        + "    </div>\n"
        + "    </div>\n\n"
        + f"    {SITE_JS}\n"
        + "</body>\n"
        + "</html>\n"
    )


# ---------- Content (copied from the original pages, text unchanged) ----------

HOME_ITEMS = [
    {"href": "frida.html", "title": "Frida Tools", "desc": "Needed For Every Mod In Here!"},
    {"href": "https://discord.gg/XnFxrkuKM5", "title": "EIC Modding", "desc": "standalone no PC animal company mod"},
    {"href": "stripesadb.html", "title": "StripesADB", "desc": "All The Downloads Needed For StripesADB"},
    {"href": "standy.html", "title": "Standy Mod", "desc": "Download N Stuff For Standy Mod Works For Every Game!"},
    {"href": "iistupid.html", "title": "II Stupid Menu Standalone", "desc": "Coming Soon"},
    {"href": "https://discord.gg/spm", "title": "SPM Gorilla Tag Mods", "desc": "Mod Menu No PC"},
    {"href": "https://github.com/stripesvr/StripesHub/releases/tag/mods", "title": "Fangame Modder", "desc": "ye, mods fangames"},
    {"href": "delta.html", "title": "Delta", "desc": "delta new adb"},
    {"href": "moonlitv2.html", "title": "MoonlitV2", "desc": "The BEST Moonlit"},
    {"href": "singularity.html", "title": "Singularity", "desc": "1.0-2.7 Root Exploit, NO PC"},
    {"href": "rootbp.html", "title": "Anti Root Bypass", "desc": "Root Bypass type shi"},
]
IDK_ITEMS = HOME_ITEMS[:9]

LIGHTNING = "https://threethan.itch.io/lightning-launcher"
OCULAR = "https://github.com/petermg/TheOcularMigraineMCP/releases"
SINGULARITY = "https://github.com/Lumince/singularity/releases"
ZIP_CMD = 'su -c "sh \'/storage/emulated/0/Download/{folder}/run-android.sh\'"'


def mod(title, desc, href, cmd_folder=None, dl_title="Download Zip File", attrs=" download"):
    item = {"title": title, "desc": desc, "href": href, "dl_title": dl_title, "attrs": attrs}
    if cmd_folder:
        item["cmd"] = ZIP_CMD.format(folder=cmd_folder)
    return item


def build_pages():
    pages = {}
    index_overlay = (
        '    <div class="intro-overlay" id="overlay-screen">\n'
        '        <div class="intro-cta" id="enter-status">Click to Enter...</div>\n'
        "    </div>\n"
    )
    idk_overlay = (
        '    <a href="https://gtag.pro/stripes" target="_blank" rel="noopener" class="enter-link">\n'
        '        <div class="intro-overlay" id="overlay-screen">\n'
        '            <div class="intro-cta" id="enter-status">Click to Enter...</div>\n'
        "        </div>\n"
        "    </a>\n"
    )
    pages["index.html"] = home_page("stripes.lol", index_overlay, HOME_ITEMS)
    pages["idk.html"] = home_page("stripes.lol", idk_overlay, IDK_ITEMS)

    pages["delta.html"] = subpage(
        "delta mods", "Delta ADB",
        rowlist([
            {"href": LIGHTNING, "title": "Lightning Launcher", "desc": "The ADB Bypass Method APK #1", "attrs": " download"},
            {"href": OCULAR, "title": "Ocular Migraine", "desc": "The ADB Bypass Method APK #2", "attrs": " download"},
            {"href": "DeltaV67.apk", "title": "Delta", "desc": "Idk", "attrs": " download"},
        ]),
    )

    pages["frida.html"] = subpage(
        "Homepage", "Frida Tools",
        rowlist([{"href": "https://python.org/downloads", "title": "Python", "desc": "Python Install Needed For Frida", "attrs": ' download=""'}])
        + label("Install")
        + '        <div class="cmd-stack">\n' + cmd("pip install frida-tools") + "        </div>\n",
    )

    pages["stripesadb.html"] = subpage(
        "StripesADB", "StripesADB",
        rowlist([
            {"href": "StripesADB (783).apk", "title": "StripesADB", "desc": "The Install For StripesADB", "attrs": " download"},
            {"href": LIGHTNING, "title": "Lightning Launcher", "desc": "idk just launches lightning ig", "attrs": " download"},
        ]),
    )

    pages["standy.html"] = subpage(
        "Standy Mods", "Standy Mods",
        rowlist([
            {"href": "xere1.apk", "title": "Standy Mods", "desc": "The Install For Standy Mod Apk", "attrs": " download"},
            {"href": LIGHTNING, "title": "Lightning Launcher", "desc": "The ADB Bypass Method APK #1", "attrs": " download"},
            {"href": OCULAR, "title": "Ocular Migraine", "desc": "The ADB Bypass Method APK #2", "attrs": " download"},
            {"href": "Moonlit.apk", "title": "Moonlit", "desc": "Long Arms Update Out NOW!", "attrs": " download"},
            {"href": "https://www.mediafire.com/file/7muzsa2cn4f3one/ADB+V3.9.5+(Premium).apk/file",
             "title": "ADB Auth", "desc": "new adb auth from latest tut test", "attrs": " download"},
        ]),
    )

    pages["moonlitv2.html"] = subpage(
        "MoonlitV2", "MoonlitV2",
        rowlist([
            {"href": "MoonlitV2.apk", "title": "MoonlitV2", "desc": "MoonlitV2 Menu Download", "attrs": " download"},
            {"href": LIGHTNING, "title": "Lightning Launcher", "desc": "Lightning Launcher Open Settings", "attrs": ' target="_blank"'},
        ]),
    )

    pages["n5.html"] = subpage(
        "N5 Modding", "N5 Modding",
        rowlist([
            {"href": "N5 menu fix.zip", "title": "N5 Menu", "desc": "N5 Menu Download (Free Version)", "attrs": " download"},
            {"href": "https://discord.gg/n5mh", "title": "N5 Discord Server",
             "desc": "Join The Server For Modding Updates And Paid Menu Version!", "attrs": ' target="_blank"'},
        ]),
    )

    singularity_items = [
        mod("Singularity", "Standalone Root Latest APK", SINGULARITY, dl_title="Download Singularity APK"),
        mod("Big Scary Menu", "mod menu", "BigScary-JaSC-Android.zip", "BigScary-JaSC-Android"),
        mod("BwahVR Menu", "Menu For Bwah, Run While In Garden", "StripedClientBwah.zip", "Bwah-Android"),
        mod("Animal Rivals Mod Menu (PATCHED)", "this menu will get you banned as of right now", "PATCHED.zip", "AnimalRivals-Android"),
        mod("Real VR Fishing Mod Menu", "Menu For Real Vr Fishing, Ported To Singularity By Me", "Fishing-Android.zip", "Fishing-Android"),
    ]
    pages["singularity.html"] = subpage(
        "Singularity Rooting", "Singularity Root (NO PC)",
        search_block("#mods", "menus") + cardlist(singularity_items, "mods"),
    )

    rootbp_items = [
        mod("Singularity", "Standalone Root Latest APK", SINGULARITY, dl_title="Download Singularity APK"),
        mod("Anti Root Bypass", "No PC Anti Root Bypass For Every Game But Tomahawk Games",
            "https://github.com/stripesvr/StripesHub/releases/download/StripesBypass/StripesBypass.apk",
            dl_title="Download Stripes Bypass"),
        mod("Big Scary Menu", "mod menu", "BigScary-JaSC-Android.zip", "BigScary-JaSC-Android"),
        mod("BwahVR Menu", "Menu For Bwah, Run While In Garden", "StripedClientBwah.zip", "Bwah-Android"),
        mod("Animal Rivals Mod Menu (PATCHED)", "this menu will get you banned as of right now", "PATCHED.zip", "AnimalRivals-Android"),
        mod("Gorilla Tag", "Menu For Gtag", "ii-menu-quest-tag-android.zip", "ii-menu-quest-tag-android"),
        mod("UG Menu", "Menu For UG, Ported To Singularity By Me", "UG-Android.zip", "UG-Android"),
    ]
    pages["rootbp.html"] = subpage(
        "Singularity Rooting", "Anti Root Bypass",
        search_block("#mods", "menus") + cardlist(rootbp_items, "mods"),
    )

    commands = [
        "adb push frida-server /data/local/tmp/",
        "adb shell chmod +x /data/local/tmp/frida-server",
        "adb shell",
        "/apex/com.android.virt/app/su",
        "./data/local/tmp/frida-server &",
    ]
    iistupid_body = (
        label("Downloads")
        + rowlist([
            {"href": "https://www.meta.com/experiences/lightning-launcher/8715195505254856/", "title": "Lightning Launcher",
             "desc": "Step 1 In The Video Just An APK", "attrs": ' download=""'},
            {"href": "ii-menu-quest-tag.zip", "title": "II Stupid Menu", "desc": "The actual ii Stupid menu", "attrs": ' download=""'},
            {"href": "https://www.mediafire.com/file/dsx199ptkswrd4h/Ion+Cannon.exe/file", "title": "Ion Cannon",
             "desc": "The root thingy", "attrs": ' download=""'},
            {"href": "https://developer.android.com/tools/releases/platform-tools", "title": "Platform Tools",
             "desc": "adb platform tools", "attrs": ' download=""'},
            {"href": "https://drive.iidk.online/src/Quest3-Root/frida-server", "title": "Frida Server",
             "desc": "Frida Server thing", "attrs": ' download=""'},
        ])
        + '        <div class="label-row"><p class="section-label">Commands</p>'
        + '<button class="btn btn-ghost btn-sm" type="button" data-copy-all="#commands">Copy all</button></div>\n'
        + '        <div class="cmd-stack" id="commands">\n'
        + "".join(cmd(c) for c in commands)
        + "        </div>\n"
    )
    pages["iistupid.html"] = subpage("IIStupidMenu", "II Stupid Menu Standy", iistupid_body, eyebrow="")

    glitch = re.search(r"<script>.*?</script>", (ROOT / "unreleased.html").read_text(encoding="utf-8"), re.S).group(0)
    pages["unreleased.html"] = subpage(
        "?????", "", rowlist([
            {"href": "#", "title": "?????", "desc": "?????"},
            {"href": "#", "title": "?????", "desc": "?????"},
        ]),
        eyebrow="", h1_id="typewriter", body_attrs=" data-full-nav",
        extra_head=(
            "    <style>\n"
            "        .hazard {\n"
            "            position: fixed;\n"
            "            top: 0;\n"
            "            left: 0;\n"
            "            right: 0;\n"
            "            height: 6px;\n"
            "            z-index: 60;\n"
            "            background: repeating-linear-gradient(-45deg, #f1c40f 0 12px, #07070a 12px 24px);\n"
            "        }\n"
            "    </style>\n"
        ),
        pre='    <div class="hazard" aria-hidden="true"></div>\n',
        scripts=SITE_JS + "\n    " + glitch,
    )
    return pages



# Old file references -> new locations. Applied to every generated page and to the builder.
REMAP = [
    ("https://stripes.lol/151.png", "https://stripes.lol/assets/img/151.png"),
    ('"styles.css"', '"assets/css/styles.css"'),
    ('"site.js"', '"assets/js/site.js"'),
    ('"cursor.js"', '"assets/js/cursor.js"'),
    ('"player.js"', '"assets/js/player.js"'),
    ('"151.png"', '"assets/img/151.png"'),
    ('"176.png"', '"assets/img/176.png"'),
    ('"StripesADB (783).apk"', '"downloads/adb/stripesadb-783.apk"'),
    ('"StripesADB (784).apk"', '"downloads/adb/stripesadb-784.apk"'),
    ('"StripesADB.apk"', '"downloads/adb/stripesadb.apk"'),
    ('"ADBAuth.apk"', '"downloads/adb/ADBAuth.apk"'),
    ('"lightninglauncher (1).apk"', '"downloads/adb/lightning-launcher.apk"'),
    ('"DeltaV67.apk"', '"downloads/menus/DeltaV67.apk"'),
    ('"Moonlit.apk"', '"downloads/menus/Moonlit.apk"'),
    ('"Moonlit1.apk"', '"downloads/menus/Moonlit1.apk"'),
    ('"MoonlitV2.apk"', '"downloads/menus/MoonlitV2.apk"'),
    ('"xere1.apk"', '"downloads/menus/xere1.apk"'),
    ('"BigScary-JaSC-Android.zip"', '"downloads/menus/BigScary-JaSC-Android.zip"'),
    ('"Fishing-Android.zip"', '"downloads/menus/Fishing-Android.zip"'),
    ('"StripedClientBS.zip"', '"downloads/menus/StripedClientBS.zip"'),
    ('"StripedClientBwah.zip"', '"downloads/menus/StripedClientBwah.zip"'),
    ('"ii-menu-quest-tag.zip"', '"downloads/menus/ii-menu-quest-tag.zip"'),
    ('"ii-menu-quest-tag-android.zip"', '"downloads/menus/ii-menu-quest-tag-android.zip"'),
    ('"N5 menu fix.zip"', '"downloads/menus/n5-menu-fix.zip"'),
    ('"PATCHED.zip"', '"downloads/menus/PATCHED.zip"'),
    ('"UG-Android.zip"', '"downloads/menus/UG-Android.zip"'),
    ('"BypassByCatsAndBlue.rar"', '"downloads/bypass/BypassByCatsAndBlue.rar"'),
    ('"CyberMenu.rar"', '"downloads/bypass/CyberMenu.rar"'),
    ('"QuestServers(Same as bypass).rar"', '"downloads/bypass/quest-servers.rar"'),
]


def remap(text):
    for old, new in REMAP:
        text = text.replace(old, new)
    return text



def main():
    for name, content in build_pages().items():
        (ROOT / name).write_text(remap(content), encoding="utf-8")
        print("wrote", name)
    print("wrote works.html")


if __name__ == "__main__":
    main()
