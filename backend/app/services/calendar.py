"""Upcoming races from the Jolpica calendar, each with the Open-Meteo forecast for its start.

Held in memory for an hour: the calendar barely changes and forecasts refresh hourly at best.
The forecast is aggregated by boxbox_ml's own weather code, exactly like the training history.
"""

import json
import logging
import time
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen

import pandas as pd
from boxbox_ml.sources import weather

from app.schemas import QualifyingEntry, RaceOut, RaceWeather

log = logging.getLogger(__name__)

CALENDAR_URL = "https://api.jolpi.ca/ergast/f1/current/races/?limit=100"
CACHE_SECONDS = 3600
DEFAULT_START = "13:00:00Z"  # Jolpica leaves the time empty for some races

_cache: tuple[float, list[RaceOut]] | None = None


def _get_json(url: str) -> dict:
    with urlopen(url, timeout=10) as resp:
        return json.load(resp)


def _forecast(lat: float, lon: float, start: pd.Timestamp) -> RaceWeather | None:
    now = pd.Timestamp.now(UTC)
    if not now < start <= now + pd.Timedelta(days=weather.FORECAST_HORIZON_DAYS):
        return None
    try:
        data = _get_json(f"{weather.FORECAST_URL}?{urlencode(weather.request_params(lat, lon, start))}")
        w = weather.summarize(data["hourly"], start)
    except Exception:
        log.warning("forecast failed for %.2f,%.2f", lat, lon, exc_info=True)
        return None
    return RaceWeather(**w) if w else None


QUALIFYING_URL = "https://api.jolpi.ca/ergast/f1/{season}/{round}/qualifying/?limit=40"
QUALIFYING_WINDOW = timedelta(days=4)  # qualifying is held Friday or Saturday of the race weekend


def _lap_seconds(text: str | None) -> float | None:
    """'1:23.456' -> 83.456; Jolpica leaves a session's time empty when the driver did not take part."""
    if not text:
        return None
    minutes, _, seconds = text.rpartition(":")
    return float(seconds) + 60 * int(minutes or 0)


def _qualifying(season: int, rnd: int, start: pd.Timestamp) -> list[QualifyingEntry] | None:
    """The qualifying classification, once Jolpica has published it (only asked for races this weekend)."""
    if start - pd.Timestamp.now(UTC) > QUALIFYING_WINDOW:
        return None
    try:
        races = _get_json(QUALIFYING_URL.format(season=season, round=rnd))["MRData"]["RaceTable"]["Races"]
        if not races:
            return None
        rows = []
        for q in races[0]["QualifyingResults"]:
            times = [t for t in (_lap_seconds(q.get(k)) for k in ("Q1", "Q2", "Q3")) if t is not None]
            rows.append((q["Driver"]["driverId"], int(q["position"]), min(times) if times else None))
    except Exception:
        log.warning("qualifying failed for %s R%s", season, rnd, exc_info=True)
        return None
    pole = min((t for _, _, t in rows if t is not None), default=None)
    return [
        QualifyingEntry(
            driver_ref=ref,
            position=pos,
            gap_pct=None if t is None or pole is None else round((t - pole) / pole * 100, 3),
        )
        for ref, pos, t in sorted(rows, key=lambda r: r[1])
    ]


def _fetch_calendar() -> list[RaceOut]:
    races = []
    for r in _get_json(CALENDAR_URL)["MRData"]["RaceTable"]["Races"]:
        loc = r["Circuit"]["Location"]
        start = pd.Timestamp(f"{r['date']}T{r.get('time') or DEFAULT_START}").tz_convert(UTC)
        lat, lon = float(loc["lat"]), float(loc["long"])
        races.append(
            RaceOut(
                season=int(r["season"]),
                round=int(r["round"]),
                name=r["raceName"],
                circuit_ref=r["Circuit"]["circuitId"],
                circuit_name=r["Circuit"]["circuitName"],
                country=loc.get("country"),
                start_utc=start.to_pydatetime(),
                weather=_forecast(lat, lon, start),
                forecast_from=(start - timedelta(days=weather.FORECAST_HORIZON_DAYS)).date(),
                qualifying=_qualifying(int(r["season"]), int(r["round"]), start),
            )
        )
    return races


def upcoming_races(after: tuple[int, int]) -> list[RaceOut]:
    """Races not started yet and later than `after` (the last trained season, round)."""
    global _cache
    if _cache is None or time.monotonic() - _cache[0] > CACHE_SECONDS:
        try:
            _cache = (time.monotonic(), _fetch_calendar())
        except Exception:
            if _cache is None:
                raise
            log.warning("calendar refresh failed; serving the cached copy", exc_info=True)
            _cache = (time.monotonic(), _cache[1])  # retry in an hour, not on every request
    now = datetime.now(UTC)
    return [r for r in _cache[1] if r.start_utc > now and (r.season, r.round) > after]
