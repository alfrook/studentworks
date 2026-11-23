#!/usr/bin/env python3
"""
Write the web address from site.config.json into every page's canonical link,
Open Graph tags and schema, and into sitemap.xml and robots.txt.

Search engines and link previews read those without running JavaScript, so the
address has to be written into the files themselves. Change it in one place:

    1. edit SITE_URL in site.config.json   (e.g. "https://studentworkspainting.ca")
    2. python3 tools/set-site-url.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "site.config.json")
cfg = json.load(open(CONFIG, encoding="utf-8"))
new, old = cfg["SITE_URL"].rstrip("/"), cfg["APPLIED_URL"].rstrip("/")
if new == old:
    raise SystemExit(f"SITE_URL is already applied ({new}). Edit site.config.json first.")

changed = []
for dirpath, dirnames, files in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in (".git", "archive", "node_modules")]
    for name in files:
        if not name.endswith((".html", ".xml", ".txt")):
            continue
        path = os.path.join(dirpath, name)
        text = open(path, encoding="utf-8").read()
        if old in text:
            open(path, "w", encoding="utf-8").write(text.replace(old, new))
            changed.append(os.path.relpath(path, ROOT))

cfg["APPLIED_URL"] = new
json.dump(cfg, open(CONFIG, "w", encoding="utf-8"), indent=2)
open(CONFIG, "a", encoding="utf-8").write("\n")
print(f"{old} -> {new} in {len(changed)} files:")
for c in sorted(changed):
    print("  " + c)
