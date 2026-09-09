#!/usr/bin/env python3
"""Sanity checks that would otherwise fail silently as the semester grows.

- Every relative href/src in every .html page resolves to a real file
  (including the ../nicu_tutor/... flashback links — keep both folders side by side).
- Every lecture page's LESSON.quizId exists in that week's quizzes file, and the
  page loads the matching js/quizzes-wN.js.
- Every recitation page's RECITATION.hwId exists in that week's homework file and
  its `total` equals the homework's point total.
- Every slot with an href in js/schedule.js points at an existing page whose
  LESSON/RECITATION slotId matches.

Run from anywhere:  /usr/bin/python3 tools/check_links.py   (exit 1 on any problem)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
problems = []


def rel(p):
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def load_json(name):
    p = ROOT / "data" / name
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def hw_total(hw):
    return sum(it.get("points", 0) for it in hw["items"])


pages = [p for p in ROOT.rglob("*.html") if "node_modules" not in p.parts]

# ---- 1. links ----
for page in pages:
    text = page.read_text(encoding="utf-8")
    for m in re.finditer(r'(?:href|src)="([^"#]+)(?:#[^"]*)?"', text):
        url = m.group(1)
        if re.match(r"^(https?:|mailto:|data:|javascript:)", url):
            continue
        target = (page.parent / url).resolve()
        if not target.exists():
            problems.append(f"{rel(page)}: broken link -> {url}")

# ---- 2. lecture / recitation manifests vs data ----
week_re = re.compile(r"-w(\d+)$")
for page in pages:
    text = page.read_text(encoding="utf-8")
    m = re.search(r"window\.LESSON\s*=\s*\{(.*?)\};", text, re.S)
    if m:
        body = m.group(1)
        qid = re.search(r'quizId:\s*"([^"]+)"', body)
        if qid:
            qid = qid.group(1)
            wk = week_re.search(qid)
            if not wk:
                problems.append(f"{rel(page)}: quizId {qid} has no -wN suffix")
            else:
                quizzes = load_json(f"quizzes-w{wk.group(1)}.json")
                if qid not in quizzes:
                    problems.append(f"{rel(page)}: quizId {qid} not in data/quizzes-w{wk.group(1)}.json")
                if f"quizzes-w{wk.group(1)}.js" not in text:
                    problems.append(f"{rel(page)}: does not load js/quizzes-w{wk.group(1)}.js")
    m = re.search(r"window\.RECITATION\s*=\s*\{(.*?)\};", text, re.S)
    if m:
        body = m.group(1)
        hid = re.search(r'hwId:\s*"([^"]+)"', body)
        total = re.search(r"total:\s*(\d+)", body)
        if hid:
            hid = hid.group(1)
            wk = week_re.search(hid)
            hws = load_json(f"homework-w{wk.group(1)}.json") if wk else {}
            if hid not in hws:
                problems.append(f"{rel(page)}: hwId {hid} not found in homework data")
            elif total and int(total.group(1)) != hw_total(hws[hid]):
                problems.append(f"{rel(page)}: RECITATION.total is {total.group(1)} but {hid} has {hw_total(hws[hid])} points")

# ---- 3. schedule vs pages ----
sched = (ROOT / "js" / "schedule.js").read_text(encoding="utf-8")
for m in re.finditer(r'\{\s*id:\s*"([^"]+)".*?href:\s*("([^"]+)"|null)', sched):
    sid, href = m.group(1), m.group(3)
    if not href:
        continue
    target = ROOT / href
    if not target.exists():
        problems.append(f"schedule.js: slot {sid} -> missing page {href}")
        continue
    text = target.read_text(encoding="utf-8")
    ids = re.findall(r'slotId:\s*"([^"]+)"', text)
    if ids and sid not in ids:
        problems.append(f"schedule.js: slot {sid} -> {href} declares slotId {ids}")
    if not re.search(r'src="(\.\./)*js/schedule\.js"', text):
        problems.append(f"{href}: does not load js/schedule.js")

if problems:
    print("PROBLEMS:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print(f"check_links: {len(pages)} pages, all links and manifests OK")
