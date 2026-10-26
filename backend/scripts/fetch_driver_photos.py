"""Download each driver's official headshot from formula1.com.

    uv run python -m scripts.fetch_driver_photos

Writes frontend/public/drivers/<driver_ref>.webp and frontend/src/lib/driver-photos.json (file name).
The photos belong to Formula One World Championship Limited. A driver missing from the
formula1.com grid is reported and the UI falls back to the team colour.
"""

import json
import re
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2] / "frontend"
OUT = ROOT / "public" / "drivers"
CREDITS = ROOT / "src" / "lib" / "driver-photos.json"
PAGE = "https://www.formula1.com/en/drivers"
UA = {"User-Agent": "Mozilla/5.0"}
# One headshot per driver on the grid page; the three letters before "01" are the start of the last name.
HEADSHOT = re.compile(
    r'https://media\.formula1\.com/image/upload/c_lfill,w_440/[^"\s\\]*/[a-z]{3}([a-z]{3})01/[a-z0-9]+right\.webp'
)


def get(url: str) -> bytes:
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def main(drivers: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    urls = {m[1]: m[0] for m in HEADSHOT.finditer(get(PAGE).decode())}
    credits, missing = {}, []
    for d in drivers:
        ref = d["driver_ref"]
        url = urls.get(ref.split("_")[-1][:3])
        if not url:
            missing.append(ref)
            continue
        (OUT / f"{ref}.webp").write_bytes(get(url))
        credits[ref] = {"file": f"{ref}.webp"}
        print("ok", ref)
    CREDITS.write_text(json.dumps(credits, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(credits)} photos, {len(missing)} missing: {', '.join(missing)}")


if __name__ == "__main__":
    api = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    main(json.loads(get(f"{api}/drivers")))
