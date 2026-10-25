"""Race-window weather from Open-Meteo (free, no API key).

ERA5 reanalysis (archive API) for past races; it lags ~5 days, so recent
races fall back to the forecast API, which also serves past dates.
"""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests_cache

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
HOURLY_VARS = "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m"

RACE_WINDOW_HOURS = 2
RAIN_THRESHOLD_MM = 1.0  # total over the window; below this is drizzle/noise in ERA5 (e.g. dry Suzuka 2025 = 0.5)
ARCHIVE_LAG_DAYS = 7


def make_session(cache_dir: Path) -> requests_cache.CachedSession:
    return requests_cache.CachedSession(
        str(cache_dir / "open_meteo"),
        backend="sqlite",
        # Reanalysis never changes; forecast-backed values do until ERA5 catches up.
        urls_expire_after={"archive-api.open-meteo.com": requests_cache.NEVER_EXPIRE, "*": timedelta(days=1)},
    )


def race_weather(session: requests_cache.CachedSession, lat: float, lon: float, start_utc: pd.Timestamp) -> dict:
    recent = start_utc.to_pydatetime() > datetime.now(UTC) - timedelta(days=ARCHIVE_LAG_DAYS)
    day = start_utc.date()
    resp = session.get(
        FORECAST_URL if recent else ARCHIVE_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "start_date": day.isoformat(),
            "end_date": (day + timedelta(days=1)).isoformat(),  # window can cross midnight UTC
            "hourly": HOURLY_VARS,
            "timezone": "UTC",
            "wind_speed_unit": "ms",
        },
        timeout=30,
    )
    resp.raise_for_status()

    hourly = pd.DataFrame(resp.json()["hourly"])
    hourly["time"] = pd.to_datetime(hourly["time"], utc=True)
    window_start = start_utc.floor("h")
    w = hourly[(hourly["time"] >= window_start) & (hourly["time"] < window_start + pd.Timedelta(hours=RACE_WINDOW_HOURS))]
    if w.empty:
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
