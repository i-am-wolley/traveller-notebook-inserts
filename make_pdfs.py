# -*- coding: utf-8 -*-
"""Render the generated HTML booklets to print-exact PDFs with headless Chrome.

    python build_inserts.py && python make_pdfs.py

Chrome honours the @page size in each file, so every PDF comes out at the exact
insert size (110 x 210 mm regular, 89 x 124 mm passport) with no scaling.
"""
import pathlib
import re
import subprocess
import sys

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

JOBS = [
    "regular/year-book-regular",
    "regular/year-book-regular-A4",
    "passport/year-book-passport",
    "passport/year-book-passport-A4",
]


def find_browser():
    for c in CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    sys.exit("No Chrome or Edge found. Edit CANDIDATES in make_pdfs.py.")


def describe(pdf):
    d = pdf.read_bytes()
    pages = len(re.findall(rb"/Type\s*/Page[^s]", d))
    mb = re.search(rb"/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)", d)
    w, h = (float(mb.group(1)), float(mb.group(2))) if mb else (0, 0)
    return "%2d pages  %.0f x %.0f mm" % (pages, w / 72 * 25.4, h / 72 * 25.4)


def main():
    browser = find_browser()
    base = pathlib.Path(__file__).resolve().parent
    for job in JOBS:
        src = base / (job + ".html")
        out = base / (job + ".pdf")
        if not src.exists():
            sys.exit("Missing %s - run build_inserts.py first." % src)
        subprocess.run([browser, "--headless", "--disable-gpu", "--no-sandbox",
                        "--no-pdf-header-footer", "--print-to-pdf=" + str(out),
                        src.as_uri()], capture_output=True, timeout=180)
        if not out.exists():
            sys.exit("Chrome failed to write %s" % out)
        print("%-40s %s" % (job + ".pdf", describe(out)))


if __name__ == "__main__":
    main()
