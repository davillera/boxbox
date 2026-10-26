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

from app.schemas import RaceOut, RaceWeather

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
