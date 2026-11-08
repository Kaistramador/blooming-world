#!/usr/bin/env python3
"""Build the standalone single-file Blooming World game.

Inlines parts/style.css, parts/data.js, parts/engine.js,
parts/app-core.js, parts/app-ui.js into shell.html and writes
the result to download/blooming-world/index.html.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = ROOT / "parts"
OUT = Path("/home/z/my-project/download/blooming-world/index.html")

JS_ORDER = ["data.js", "engine.js", "app-core.js", "app-ui.js"]


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
    kb = OUT.stat().st_size / 1024
    print(f"OK -> {OUT} ({kb:.1f} KB)")


if __name__ == "__main__":
    main()
