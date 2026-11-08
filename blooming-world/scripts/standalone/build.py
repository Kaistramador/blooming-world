#!/usr/bin/env python3
"""Build the standalone single-file Blooming World game.

Inlines parts/assets.js (era photos), style.css, data.js, engine.js,
app-core.js, app-ui.js into shell.html and writes
the result to download/blooming-world/index.html.

Wave 5 (PWA): also copies manifest.json, sw.js and icons/ next to the
game so the folder is installable when hosted over http(s) (GitHub
Pages). Relative paths keep it working from a subfolder.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "parts"
OUT = Path("/home/z/my-project/download/blooming-world/index.html")

JS_ORDER = ["assets.js", "data.js", "engine.js", "app-core.js", "app-ui.js"]
AUX_FILES = ["manifest.json", "sw.js"]
ICON_FILES = ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]


def main() -> None:
    shell = (ROOT / "shell.html").read_text(encoding="utf-8")
    css = (PARTS / "style.css").read_text(encoding="utf-8")
    js_chunks = []
    for name in JS_ORDER:
        code = (PARTS / name).read_text(encoding="utf-8")
        js_chunks.append(f"/* ============ {name} ============ */\n{code}")
    js = "\n".join(js_chunks)

    # Guard against accidental closing tags inside inline code.
    for bad in ("</script>", "</style>"):
        if bad in css.lower() or bad in js.lower():
            raise SystemExit(f"FATAL: {bad!r} found in sources — would break inlining")

    html = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")

    # PWA companions next to the game (Волна 5)
    for name in AUX_FILES:
        shutil.copyfile(PARTS / name, OUT.parent / name)
    icons_dst = OUT.parent / "icons"
    icons_dst.mkdir(exist_ok=True)
    for name in ICON_FILES:
        shutil.copyfile(PARTS / "icons" / name, icons_dst / name)

    kb = OUT.stat().st_size / 1024
    print(f"OK -> {OUT} ({kb:.1f} KB) + manifest.json + sw.js + icons/ ({len(ICON_FILES)})")


if __name__ == "__main__":
    main()

