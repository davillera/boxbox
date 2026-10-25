"""Extract historical race entries (results + qualifying + weather) to parquet.

    uv run python -m boxbox_ml.extract                       # DEFAULT_SEASONS
    uv run python -m boxbox_ml.extract --seasons 2024 2025   # specific seasons
    uv run python -m boxbox_ml.extract --force               # re-download finished seasons

Finished seasons are written once to data/raw/season_<year>.parquet and skipped
afterwards; the current season is always refreshed. All seasons are then
consolidated into data/race_entries.parquet.
"""

import argparse
import logging
from datetime import UTC, datetime

import fastf1
import pandas as pd
from fastf1.ergast import Ergast

from boxbox_ml.config import CACHE_DIR, DEFAULT_SEASONS, ENTRIES_PATH, RAW_DIR
from boxbox_ml.sources import jolpica, weather

log = logging.getLogger("boxbox_ml.extract")

WEATHER_COLUMNS = ["air_temp_c", "humidity_pct", "pressure_mbar", "wind_speed_ms", "precipitation_mm", "rainfall"]


def setup_cache() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    # FastF1's cache wraps every Jolpica request (requests-cache + its own rate limiter).
    fastf1.Cache.configure(cache_dir=str(CACHE_DIR))
    fastf1.logger.set_log_level("WARNING")


def extract_season(season: int, ergast: Ergast, meteo) -> pd.DataFrame:
    entries = jolpica.season_entries(season, ergast)
    if entries.empty:
        return entries

    races = entries.drop_duplicates(["season", "round"])
    rows = []
    for race in races.itertuples():
        try:
            w = weather.race_weather(meteo, race.latitude, race.longitude, race.race_start_utc)
        except Exception as exc:  # keep the race; weather becomes NaN
            log.warning("weather failed for %s R%02d %s: %s", season, race.round, race.event_name, exc)
            w = {}
        rows.append({"season": season, "round": race.round, **w})

    weather_df = pd.DataFrame(rows).reindex(columns=["season", "round", *WEATHER_COLUMNS])
    return entries.merge(weather_df, on=["season", "round"], how="left")


def run(seasons: list[int], force: bool = False) -> pd.DataFrame:
    setup_cache()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ergast = Ergast(result_type="pandas", auto_cast=True)
    meteo = weather.make_session(CACHE_DIR)
    current_year = datetime.now(UTC).year

    for season in seasons:
        path = RAW_DIR / f"season_{season}.parquet"
        if path.exists() and season < current_year and not force:
            log.info("%s: cached at %s", season, path.name)
            continue
        df = extract_season(season, ergast, meteo)
        if df.empty:
            log.info("%s: no completed races", season)
            continue
        df.to_parquet(path, index=False)
        log.info("%s: %d races, %d entries -> %s", season, df["round"].nunique(), len(df), path.name)

    # Consolidate every season on disk, not just the ones refreshed now.
    entries = pd.concat([pd.read_parquet(f) for f in sorted(RAW_DIR.glob("season_*.parquet"))], ignore_index=True)
    entries = entries.sort_values(["season", "round", "finish_position"]).reset_index(drop=True)
    entries.to_parquet(ENTRIES_PATH, index=False)
    log.info(
        "consolidated %d entries from %d races (%d with rain) -> %s",
        len(entries),
        entries.groupby(["season", "round"]).ngroups,
        entries.drop_duplicates(["season", "round"])["rainfall"].fillna(False).astype(bool).sum(),
        ENTRIES_PATH,
    )
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--seasons", type=int, nargs="+", default=DEFAULT_SEASONS)
    parser.add_argument("--force", action="store_true", help="re-download seasons already on disk")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(args.seasons, args.force)


if __name__ == "__main__":
    main()
