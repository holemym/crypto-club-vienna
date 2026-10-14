"""Join the stylesheets into one render-blocking file: python tools/bundle_css.py
Edit the files in site/css/ as before, then rerun this; index.html links css/site.css only.
Order matters (tokens before components, motion last)."""
import pathlib, re

CSS = pathlib.Path(__file__).resolve().parent.parent / "site" / "css"
ORDER = ["fonts.css", "tokens.css", "base.css", "sections.css", "hero3d.css", "ask.css", "tracks.css", "bot.css", "map.css", "motion.css"]

def main():
    parts = []
    for name in ORDER:
        s = (CSS / name).read_text(encoding="utf-8")
        s = re.sub(r"/\*(?!\s*!).*?\*/", "", s, flags=re.S)       # comments out
        s = re.sub(r"\s*\n\s*", "\n", s).strip()                  # blank lines and indentation out
        parts.append(f"/* {name} */\n{s}")
    out = "/* Built by tools/bundle_css.py from site/css/*.css. Do not edit by hand. */\n" + "\n".join(parts) + "\n"
    (CSS / "site.css").write_text(out, encoding="utf-8")
    print("site.css", len(out) // 1024, "KB")

if __name__ == "__main__":
    main()
