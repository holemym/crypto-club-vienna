"""Self-host the club's typefaces (all OFL, Google Fonts): Syne (display), Inter (body), Quicksand (labels).

Writes woff2 files to site/assets/fonts/ and prints the @font-face rules for site/css/fonts.css.
Only the latin and latin-ext subsets are kept, like the round 2 fonts.
"""
import pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site"
FONTS = ROOT / "assets" / "fonts"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
FAMILIES = [
    ("Syne", "Syne:wght@600..800", "Syne"),
    ("Inter", "Inter:wght@400..600", "Inter"),
    ("Quicksand", "Quicksand:wght@500", "Quicksand"),
]

def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except OSError:
            if i == tries - 1:
                raise

def main():
    FONTS.mkdir(parents=True, exist_ok=True)
    rules = []
    for family, query, stem in FAMILIES:
        css = get(f"https://fonts.googleapis.com/css2?family={query}&display=swap").decode()
        for subset, block in re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S):
            if subset not in ("latin", "latin-ext"):
                continue
            url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
            name = f"{stem}-{subset}.woff2"
            (FONTS / name).write_bytes(get(url))
            weight = re.search(r"font-weight: ([^;]+);", block).group(1)
            ur = re.search(r"unicode-range: ([^;]+);", block).group(1)
            rules.append(
                "@font-face {\n"
                f"  font-family: '{family}';\n  font-style: normal;\n  font-weight: {weight};\n"
                f"  font-display: swap;\n  src: url(../assets/fonts/{name}) format('woff2');\n"
                f"  unicode-range: {ur};\n}}"
            )
            print(name, (FONTS / name).stat().st_size // 1024, "KB", weight)
    (ROOT / "css" / "fonts.r4.txt").write_text("\n".join(rules) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
