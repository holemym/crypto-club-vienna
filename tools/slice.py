"""Cut a full-page capture into readable slices for review: python tools/slice.py <img> <out-dir> [slice-height] [width]"""
import pathlib, sys
from PIL import Image

def main():
    src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    sh = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
    w = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    im = Image.open(src)
    for i, y in enumerate(range(0, im.height, sh)):
        part = im.crop((0, y, im.width, min(im.height, y + sh)))
        if part.width > w:
            part = part.resize((w, round(part.height * w / part.width)))
        p = out / f"{src.stem}-{i:02d}.jpg"
        part.save(p, quality=80)
        print(p)

if __name__ == "__main__":
    main()
