"""Round 4 brand audit: pull the club's own brand files and event photos from cryptoclubvienna.com.

Writes to crypto-club-vienna/_brand/ (raw sources, not served). Re-runnable; skips files already there.
"""
import json, pathlib, urllib.request
from urllib.parse import quote, unquote

OUT = pathlib.Path(__file__).resolve().parent.parent / "_brand"
BASE = "https://cryptoclubvienna.com/wp-content/uploads/"
UA = {"User-Agent": "Mozilla/5.0"}

def media():
    items = []
    for page in range(1, 4):
        url = f"https://cryptoclubvienna.com/wp-json/wp/v2/media?per_page=100&page={page}"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
                data = json.load(r)
        except Exception:
            break
        if not data:
            break
        items += data
    return items

# Keep: the club's own files (logo, posters, bot, event photos). Skip theme/template stock.
KEEP_PREFIX = ("2026/02/CCV", "2026/02/IMG_", "2026/06/", "2026/09/", "2026/03/")
KEEP_CYRILLIC = ("Дизайн-без-назви", "Снимок-экрана")  # Canva exports and the header logo crop

def wanted(path):
    return path.startswith(KEEP_PREFIX) or any(k in path for k in KEEP_CYRILLIC)

def main():
    OUT.mkdir(exist_ok=True)
    manifest = []
    for m in media():
        src = m["source_url"]
        rel = unquote(src.split("uploads/")[1])
        if not wanted(rel):
            continue
        name = rel.replace("/", "_")
        dest = OUT / name
        if not dest.exists():
            url = BASE + quote(rel)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
                dest.write_bytes(r.read())
        md = m.get("media_details") or {}
        manifest.append({"file": name, "source": src, "w": md.get("width"), "h": md.get("height"),
                         "uploaded": m["date"][:10], "kb": dest.stat().st_size // 1024})
        print(f"{dest.stat().st_size//1024:>6} KB  {name}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main()
