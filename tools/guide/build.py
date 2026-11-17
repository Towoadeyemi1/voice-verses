#!/usr/bin/env python3
"""Builds the user guide from tools/guide/content.py:
  docs/user-guide/README.md   (Markdown, shown on GitHub)
  docs/user-guide/index.html  (a page to open or share; pictures in docs/user-guide/img/)
Run:  python3 tools/guide/build.py
"""
import html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from content import KEYS, SECTIONS, SUBTITLE, TITLE, TROUBLE, VERSION  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "../../docs/user-guide")


def inline_html(text: str) -> str:
    t = html.escape(text, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\*(.+?)\*", r"<i>\1</i>", t)
    t = re.sub(r"\[(.+?)\]\((#[a-z-]+)\)", r'<a href="\2">\1</a>', t)
    return t


# ---- Markdown ---------------------------------------------------------------------------------

def markdown() -> str:
    out = [f"# {TITLE}", "", f"{SUBTITLE} (Version {VERSION}.)", "", "## Contents", ""]
    for s in SECTIONS:
        out.append(f"- [{s['title']}](#{s['id']})")
    out += ["- [Keyboard](#keyboard)", "- [When something goes wrong](#trouble)", ""]
    for s in SECTIONS:
        out += [f'<a id="{s["id"]}"></a>', "", f"## {s['title']}", ""]
        if s.get("intro"):
            out += [s["intro"], ""]
        for p in s.get("points", []) if not s.get("figures") else []:
            out.append(f"- {p}")
        if s.get("points") and not s.get("figures"):
            out.append("")
        for f in s.get("figures", []):
            out += [f"### {f['caption']}", "", f"![{f['caption']}](img/{f['img']}.jpg)", ""]
            if f.get("plain"):
                out += [" ".join(f["steps"]), ""]
            else:
                out += [f"{i}. {step}" for i, step in enumerate(f["steps"], 1)] + [""]
        if s.get("figures") and s.get("points"):
            out += ["**Good to know**", ""] + [f"- {p}" for p in s["points"]] + [""]
    out += ['<a id="keyboard"></a>', "", "## Keyboard", "", "| Key | What it does |", "| --- | --- |"]
    out += [f"| {k} | {v} |" for k, v in KEYS] + [""]
    out += ['<a id="trouble"></a>', "", "## When something goes wrong", "", "| If… | Do this |", "| --- | --- |"]
    out += [f"| {k} | {v} |" for k, v in TROUBLE] + [""]
    out += ["---", "", "The pictures are made by `tools/guide/capture.cjs` from the real app with its sample service; the words are in `tools/guide/content.py`. Run both again when the app changes.", ""]
    return "\n".join(out)


# ---- HTML -------------------------------------------------------------------------------------

CSS = """
/* Layout: a contents rail beside one reading column; each step list sits beside or under its picture. */
:root {
  --bg: #f6f3ee; --panel: #ffffff; --ink: #1d1b20; --ink-2: #5a5560; --line: #e4ded5;
  --mark: #ffb020; --mark-ink: #1a1204; --mark-soft: #fdf0d6; --link: #8a5a00;
  --live: #e0392f; --next: #1f9d50;
  --display: "Newsreader", "New York", "Iowan Old Style", Georgia, serif;
  --body: "Figtree", -apple-system, "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0e0d10; --panel: #19171c; --ink: #f4f1f6; --ink-2: #b2abb7; --line: #2c2830;
    --mark-soft: #3a2a0e; --link: #ffc65a; --live: #ff5a4f; --next: #34d06e; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0e0d10; --panel: #19171c; --ink: #f4f1f6; --ink-2: #b2abb7; --line: #2c2830;
  --mark-soft: #3a2a0e; --link: #ffc65a; --live: #ff5a4f; --next: #34d06e; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16.5px/1.6 var(--body); }
a { color: var(--link); }
.wrap { max-width: 1240px; margin: 0 auto; padding-block: 40px 80px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 48px; }
@media (max-width: 900px) { .wrap { grid-template-columns: 1fr; gap: 24px; } }
.toc { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 20px); align-self: start; display: flex; flex-direction: column; gap: 2px; font-size: 14.5px; }
@media (max-width: 900px) { .toc { position: static; flex-direction: row; flex-wrap: wrap; gap: 6px; } .toc a { padding: 6px 10px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); } .toc .k { display: none; } }
.toc .k { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 8px; }
.toc a { color: var(--ink-2); text-decoration: none; padding: 5px 0; }
.toc a:hover { color: var(--ink); }
main { min-width: 0; display: flex; flex-direction: column; gap: 56px; }
header.top { display: flex; flex-direction: column; gap: 12px; }
header.top .kicker { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--link); }
h1 { margin: 0; font: 600 clamp(38px, 5vw, 56px)/1.05 var(--display); letter-spacing: -.01em; text-wrap: balance; }
header.top p { margin: 0; font-size: 19px; color: var(--ink-2); max-width: 62ch; }
.legend { display: flex; flex-wrap: wrap; gap: 10px 22px; font-size: 14.5px; color: var(--ink-2); }
.legend span { display: inline-flex; align-items: center; gap: 8px; }
.dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
.num { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--mark); color: var(--mark-ink); font: 800 14px/28px var(--body); text-align: center; box-shadow: 0 0 0 2px var(--panel); }
section { display: flex; flex-direction: column; gap: 20px; scroll-margin-top: 20px; }
h2 { margin: 0; font: 600 32px/1.15 var(--display); text-wrap: balance; }
.intro { margin: 0; font-size: 18px; color: var(--ink-2); max-width: 66ch; }
.fig { display: flex; flex-direction: column; gap: 18px; padding: 18px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); }
.fig figure { margin: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.fig img { width: 100%; height: auto; display: block; border-radius: 10px; border: 1px solid var(--line); cursor: zoom-in; }
.fig figcaption { font-size: 14px; color: var(--ink-2); }
.fig h3 { margin: 0 0 4px; font-size: 18px; font-weight: 700; }
ol.steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 28px; min-width: 0; }
@media (max-width: 760px) { ol.steps { grid-template-columns: 1fr; } }
ol.steps.one { grid-template-columns: 1fr; max-width: 72ch; }
ol.steps li { display: flex; gap: 12px; align-items: flex-start; }
ol.steps li > span:last-child { min-width: 0; padding-top: 2px; }
.plain { margin: 0; }
.know { margin: 0; padding: 16px 20px; border-radius: 14px; background: var(--mark-soft); display: flex; flex-direction: column; gap: 6px; }
.know b.t { font-size: 14px; letter-spacing: .06em; text-transform: uppercase; }
.know ul, .bul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; max-width: 72ch; }
.tablewrap { overflow-x: auto; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); }
table { border-collapse: collapse; width: 100%; min-width: 520px; font-size: 15.5px; }
th, td { text-align: left; vertical-align: top; padding: 12px 16px; border-bottom: 1px solid var(--line); }
th { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-2); }
tr:last-child td { border-bottom: 0; }
td:first-child { font-weight: 700; white-space: nowrap; }
.trouble td:first-child { white-space: normal; width: 34%; }
kbd { font: 600 14px var(--body); padding: 2px 7px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); }
footer { color: var(--ink-2); font-size: 14.5px; }
dialog.zoom { padding: 0; border: 0; background: transparent; max-width: 96vw; max-height: 96vh; }
dialog.zoom::backdrop { background: rgba(0,0,0,.8); }
dialog.zoom img { display: block; max-width: 96vw; max-height: 92vh; border-radius: 10px; }
dialog.zoom p { margin: 8px 0 0; text-align: center; color: #fff; font-size: 14px; }
a:focus-visible, img:focus-visible, button:focus-visible { outline: 3px solid var(--mark); outline-offset: 3px; }
"""

JS = """
const zoom = document.getElementById('zoom');
const big = zoom.querySelector('img');
document.querySelectorAll('.fig img').forEach((img) => {
  const open = () => { big.src = img.src; big.alt = img.alt; zoom.showModal(); };
  img.addEventListener('click', open);
  img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});
zoom.addEventListener('click', () => zoom.close());
"""


def page() -> str:
    h = []
    h.append(f"<title>{TITLE}</title>")
    h.append('<meta name="claude:viewport-fit-sides" content="cover">')
    h.append('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    h.append('<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" rel="stylesheet">')
    h.append(f"<style>{CSS}</style>")
    h.append('<div class="wrap">')
    h.append('<nav class="toc" aria-label="Contents"><span class="k">Contents</span>')
    for s in SECTIONS:
        h.append(f'<a href="#{s["id"]}">{html.escape(s["title"])}</a>')
    h.append('<a href="#keyboard">Keyboard</a><a href="#trouble">When something goes wrong</a></nav>')
    h.append("<main>")
    h.append('<header class="top">')
    h.append(f'<span class="kicker">Voice Verses {VERSION} · for the booth</span>')
    h.append(f"<h1>{TITLE}</h1>")
    h.append(f"<p>{inline_html(SUBTITLE)}</p>")
    h.append('<div class="legend"><span><i class="num" aria-hidden="true">1</i>Numbered marker: the step with the same number</span>'
             '<span><i class="dot" style="background:var(--live)"></i>Red: Live, what the room sees</span>'
             '<span><i class="dot" style="background:var(--next)"></i>Green: Next, what goes up when you press Take</span></div>')
    h.append("</header>")
    for s in SECTIONS:
        h.append(f'<section id="{s["id"]}"><h2>{html.escape(s["title"])}</h2>')
        if s.get("intro"):
            h.append(f'<p class="intro">{inline_html(s["intro"])}</p>')
        if s.get("points") and not s.get("figures"):
            h.append('<ul class="bul">' + "".join(f"<li>{inline_html(p)}</li>" for p in s["points"]) + "</ul>")
        for f in s.get("figures", []):
            alt = html.escape(f["caption"])
            h.append('<div class="fig">')
            h.append(f'<figure><img src="img/{f["img"]}.jpg" alt="{alt}" loading="lazy" width="1440" height="900" tabindex="0"><figcaption>Click the picture to see it full size.</figcaption></figure>')
            h.append(f'<div><h3>{alt}</h3>')
            if f.get("plain"):
                h.append(f'<p class="plain">{inline_html(" ".join(f["steps"]))}</p>')
            else:
                h.append(f'<ol class="steps{" one" if len(f["steps"]) < 3 else ""}">' + "".join(f'<li><span class="num" aria-hidden="true">{i}</span><span>{inline_html(step)}</span></li>' for i, step in enumerate(f["steps"], 1)) + "</ol>")
            h.append("</div></div>")
        if s.get("figures") and s.get("points"):
            h.append('<div class="know"><b class="t">Good to know</b><ul>' + "".join(f"<li>{inline_html(p)}</li>" for p in s["points"]) + "</ul></div>")
        h.append("</section>")
    h.append('<section id="keyboard"><h2>Keyboard</h2><div class="tablewrap"><table><thead><tr><th>Key</th><th>What it does</th></tr></thead><tbody>')
    h.append("".join(f"<tr><td><kbd>{html.escape(k)}</kbd></td><td>{html.escape(v)}</td></tr>" for k, v in KEYS))
    h.append("</tbody></table></div></section>")
    h.append('<section id="trouble"><h2>When something goes wrong</h2><div class="tablewrap"><table class="trouble"><thead><tr><th>If…</th><th>Do this</th></tr></thead><tbody>')
    h.append("".join(f"<tr><td>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in TROUBLE))
    h.append("</tbody></table></div></section>")
    h.append(f"<footer>Pictures from Voice Verses {VERSION} with its sample service, the King James Version and public-domain hymns.</footer>")
    h.append("</main></div>")
    h.append('<dialog class="zoom" id="zoom" aria-label="Picture"><img alt=""><p>Click anywhere to close</p></dialog>')
    h.append(f"<script>{JS}</script>")
    return "\n".join(h)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8") as f:
        f.write(markdown())
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(page())
    missing = [fig["img"] for s in SECTIONS for fig in s.get("figures", []) if not os.path.exists(os.path.join(OUT, "img", fig["img"] + ".jpg"))]
    print("built", "missing pictures: " + ", ".join(missing) if missing else "all pictures present")
