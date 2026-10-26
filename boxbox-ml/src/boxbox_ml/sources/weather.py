"""Race-window weather from Open-Meteo (free, no API key).

ERA5 reanalysis (archive API) for past races; it lags ~5 days, so recent
and upcoming races use the forecast API, which also serves past dates.
Training and the backend's live forecast share `request_params` and
`summarize`, so a forecast is aggregated exactly like the history.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:  # pipeline-only dependency; the backend never imports it
    import requests_cache

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
HOURLY_VARS = "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m"

RACE_WINDOW_HOURS = 2
RAIN_THRESHOLD_MM = 1.0  # total over the window; below this is drizzle/noise in ERA5 (e.g. dry Suzuka 2025 = 0.5)
ARCHIVE_LAG_DAYS = 7
FORECAST_HORIZON_DAYS = 14  # the forecast API reaches 16 days; the window may cross into the next day


def make_session(cache_dir: Path) -> requests_cache.CachedSession:
    import requests_cache

    return requests_cache.CachedSession(
        str(cache_dir / "open_meteo"),
        backend="sqlite",
        # Reanalysis never changes; forecast-backed values do until ERA5 catches up.
        urls_expire_after={"archive-api.open-meteo.com": requests_cache.NEVER_EXPIRE, "*": timedelta(days=1)},
    )


def request_params(lat: float, lon: float, start_utc: pd.Timestamp) -> dict:
    day = start_utc.date()
    return {
        "latitude": lat,
        "longitude": lon,
        "start_date": day.isoformat(),
        "end_date": (day + timedelta(days=1)).isoformat(),  # window can cross midnight UTC
        "hourly": HOURLY_VARS,
        "timezone": "UTC",
        "wind_speed_unit": "ms",
    }


def summarize(hourly: dict, start_utc: pd.Timestamp) -> dict:
    """Average the RACE_WINDOW_HOURS from lights out; {} if the response does not cover them."""
    h = pd.DataFrame(hourly)
    h["time"] = pd.to_datetime(h["time"], utc=True)
    window_start = start_utc.floor("h")
    w = h[(h["time"] >= window_start) & (h["time"] < window_start + pd.Timedelta(hours=RACE_WINDOW_HOURS))]
    if w.empty or w["temperature_2m"].isna().all():
        return {}
    precipitation = float(w["precipitation"].sum())
    return {
        "air_temp_c": float(w["temperature_2m"].mean()),
        "humidity_pct": float(w["relative_humidity_2m"].mean()),
        "pressure_mbar": float(w["surface_pressure"].mean()),
        "wind_speed_ms": float(w["wind_speed_10m"].mean()),
        "precipitation_mm": precipitation,
        "rainfall": precipitation >= RAIN_THRESHOLD_MM,
    }


def race_weather(session, lat: float, lon: float, start_utc: pd.Timestamp) -> dict:
    recent = start_utc.to_pydatetime() > datetime.now(UTC) - timedelta(days=ARCHIVE_LAG_DAYS)
    resp = session.get(FORECAST_URL if recent else ARCHIVE_URL, params=request_params(lat, lon, start_utc), timeout=30)
    resp.raise_for_status()
    return summarize(resp.json()["hourly"], start_utc)
