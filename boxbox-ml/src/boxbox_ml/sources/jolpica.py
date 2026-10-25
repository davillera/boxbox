"""Race and qualifying results from Jolpica (the Ergast successor) through `fastf1.ergast`.

Requests go through FastF1's HTTP cache and rate limiter, so callers must
configure `fastf1.Cache` first (see `boxbox_ml.extract`).
"""

from collections.abc import Callable

import pandas as pd
from fastf1.ergast import Ergast
from fastf1.ergast.interface import ErgastMultiResponse

PAGE_SIZE = 100  # Jolpica's maximum `limit`


def _fetch_all(method: Callable[..., ErgastMultiResponse], **params) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Follow pagination; returns (one row per race, one row per driver) with season/round keys."""
    races, rows = [], []
    offset = 0
    while True:
        resp = method(limit=PAGE_SIZE, offset=offset, **params)
        for (_, race), content in zip(resp.description.iterrows(), resp.content):
            races.append(race)
            rows.append(content.assign(season=race["season"], round=race["round"]))
        offset += PAGE_SIZE
        if offset >= resp.total_results:
            break
    if not rows:
        return pd.DataFrame(), pd.DataFrame()
    # A race split across two pages appears twice in the descriptions.
    races_df = pd.DataFrame(races).drop_duplicates(["season", "round"]).reset_index(drop=True)
    return races_df, pd.concat(rows, ignore_index=True)


def _seconds(col: pd.Series) -> pd.Series:
    return pd.to_timedelta(col, errors="coerce").dt.total_seconds()


def season_entries(season: int, ergast: Ergast | None = None) -> pd.DataFrame:
    """One row per driver per completed race of `season` (empty if none have been run)."""
    ergast = ergast or Ergast(result_type="pandas", auto_cast=True)
    races, results = _fetch_all(ergast.get_race_results, season=season)
    if results.empty:
        return pd.DataFrame()
    _, quali = _fetch_all(ergast.get_qualifying_results, season=season)

    start = races["raceDate"].astype(str) + " " + races["raceTime"].astype(str).replace("NaT", None).fillna("13:00:00+00:00")
    races = pd.DataFrame(
        {
            "season": races["season"].astype(int),
            "round": races["round"].astype(int),
            "event_name": races["raceName"],
            "race_date": pd.to_datetime(races["raceDate"]).dt.date,
            "race_start_utc": pd.to_datetime(start, utc=True, format="mixed"),
            "circuit_ref": races["circuitId"],
            "circuit_name": races["circuitName"],
            "locality": races["locality"],
            "country": races["country"],
            "latitude": races["lat"].astype(float),
            "longitude": races["long"].astype(float),
        }
    )

    entries = pd.DataFrame(
        {
            "season": results["season"].astype(int),
            "round": results["round"].astype(int),
            "driver_ref": results["driverId"],
            "driver_code": results["driverCode"],
            "permanent_number": pd.to_numeric(results["driverNumber"], errors="coerce").astype("Int64"),
            "first_name": results["givenName"],
            "last_name": results["familyName"],
            "nationality": results["driverNationality"],
            "date_of_birth": pd.to_datetime(results["dateOfBirth"], errors="coerce").dt.date,
            "team_ref": results["constructorId"],
            "team_name": results["constructorName"],
            "grid_position": results["grid"].astype("Int64"),
            "finish_position": results["position"].astype("Int64"),
            "position_text": results["positionText"].astype(str),  # "R", "D", "W"... when not classified
            "status": results["status"],
            "points": results["points"].astype(float),
            "laps_completed": results["laps"].astype("Int64"),
            "best_lap_time_s": _seconds(results["fastestLapTime"]),
        }
    )

    if not quali.empty:
        q = pd.DataFrame(
            {
                "season": quali["season"].astype(int),
                "round": quali["round"].astype(int),
                "driver_ref": quali["driverId"],
                "quali_position": quali["position"].astype("Int64"),
                "q1_s": _seconds(quali["Q1"]),
                "q2_s": _seconds(quali["Q2"]),
                "q3_s": _seconds(quali["Q3"]),
            }
        )
        q["quali_best_s"] = q[["q1_s", "q2_s", "q3_s"]].min(axis=1)
        pole = q.groupby(["season", "round"])["quali_best_s"].transform("min")
        q["quali_gap_pct"] = (q["quali_best_s"] - pole) / pole * 100
        entries = entries.merge(q, on=["season", "round", "driver_ref"], how="left")
    else:
        for col in ("quali_position", "q1_s", "q2_s", "q3_s", "quali_best_s", "quali_gap_pct"):
            entries[col] = pd.NA

    return races.merge(entries, on=["season", "round"], how="inner")
