# -*- coding: utf-8 -*-
"""Screenshot the mockup pages to PNG with headless Chrome.

    python build_mockup.py && python make_mockup_pngs.py
"""
import json
import os
import pathlib
import subprocess
import sys

from build_core import SIZES

SCALE = 3                      # device pixel ratio for the capture
OUT = "mockups"

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def find_browser():
    for c in CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    sys.exit("No Chrome or Edge found. Edit CANDIDATES in make_mockup_pngs.py.")


def css_px(mm):
    return int(round(mm / 25.4 * 96))


def main():
    browser = find_browser()
    base = pathlib.Path(__file__).resolve().parent
    manifest = base / OUT / "manifest.json"
    if not manifest.exists():
        sys.exit("No manifest - run build_mockup.py first.")
    with open(manifest, encoding="utf-8") as fh:
        entries = json.load(fh)

    for e in entries:
        size = e["size"]
        s = SIZES[size]
        pad = 10 if size == "regular" else 8
        pw, ph = s["w"], s["h"]
        if e["turned"]:                  # exported landscape
            pw, ph = ph, pw
        w = css_px(pw + pad * 2)
        h = css_px(ph + pad * 2)
        src = base / OUT / (e["name"] + ".html")
        png = src.with_suffix(".png")
        subprocess.run([browser, "--headless", "--disable-gpu", "--no-sandbox",
                        "--hide-scrollbars",
                        "--force-device-scale-factor=%d" % SCALE,
                        "--window-size=%d,%d" % (w, h),
                        "--screenshot=%s" % png, src.as_uri()],
                       capture_output=True, timeout=120)
        if not png.exists():
            sys.exit("Chrome failed to write %s" % png)
        print("%-40s %5d x %-5d %6d KB"
              % (png.name, w * SCALE, h * SCALE, png.stat().st_size // 1024))


if __name__ == "__main__":
    main()
