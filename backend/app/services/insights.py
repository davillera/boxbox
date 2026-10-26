"""Read-only views built on the trained bundle: title odds, driver sheets and drift monitoring."""

import logging

import numpy as np
import pandas as pd
from boxbox_ml import Scenario
from sqlalchemy import Engine
from sqlmodel import Session, select

from app.models import Driver, PredictionHistory
from app.schemas import (
    ChampionDriver,
    ChampionshipOut,
    CircuitRecord,
    DriftRace,
    DriverDetail,
    FormRace,
    LiveRace,
    MonitorOut,
)
from app.services.prediction import PredictionService, normalize_field

log = logging.getLogger(__name__)

# Race points for P1..P10 (the fastest-lap point went away in 2025; sprints are not simulated).
POINTS = np.array([25, 18, 15, 12, 10, 8, 6, 4, 2, 1], dtype=float)
SIMULATIONS = 20_000
MONITOR_WINDOW = 8  # races compared with the whole backtest
WATCH_RATIO = 1.25  # recent error this far above the overall error raises "watch"


def championship(service: PredictionService, remaining: list[str]) -> ChampionshipOut:
    """Cached per set of races left: the model is fixed per process, so the odds only change after a race."""
    cache = service.__dict__.setdefault("_championship", {})
    key = tuple(remaining)
    if key not in cache:
        cache[key] = _simulate(service, remaining)
    return cache[key]


def _simulate(service: PredictionService, remaining: list[str]) -> ChampionshipOut:
    """Title odds by simulating the races left.

    Each race is a Plackett-Luce draw (a sequential lottery for P1, P2, ...) weighted by the model's
    win chance for the next GP from the last starting order. The model only scores the next race, so
    the same strengths stand in for the rest; the result is a rough guide, not a forecast per circuit.
    """
    history = service.predictor.history
    season = service.last_race[0]
    this_season = history[history["season"] == season]
    points = this_season.groupby("driver_ref")["points"].sum()

    grid = service.predictor.drivers()
    n_races = len(remaining)
    strength = np.zeros(len(grid))
    if n_races:  # `remaining` holds the circuit of every race left, next one first
        results = service.predictor.predict(
            [
                Scenario(driver_ref=r.driver_ref, circuit_ref=remaining[0], grid_position=int(r.grid_position))
                for r in grid.itertuples()
            ]
        )
        win, _ = normalize_field(
            np.array([r.win_probability for r in results]), np.array([r.podium_probability for r in results])
        )
        strength = np.log(np.clip(win, 1e-6, None))

    refs = list(points.index.union(grid["driver_ref"]))
    base = points.reindex(refs).fillna(0.0).to_numpy()
    rng = np.random.default_rng(0)
    total = np.tile(base, (SIMULATIONS, 1))
    if n_races:
        idx = np.array([refs.index(r) for r in grid["driver_ref"]])
        # Gumbel-max trick: sorting log-weights plus Gumbel noise samples a Plackett-Luce order.
        noise = rng.gumbel(size=(SIMULATIONS, n_races, len(idx))) + strength
        order = np.argsort(-noise, axis=2)  # driver positions, best first
        for rank, pts in enumerate(POINTS[: len(idx)]):
            winners = idx[order[:, :, rank]]  # (sims, races) driver index in `refs`
            for race in range(n_races):
                np.add.at(total, (np.arange(SIMULATIONS), winners[:, race]), pts)
    champion = total.argmax(axis=1)
    title = np.bincount(champion, minlength=len(refs)) / SIMULATIONS

    names = service._drivers
    out = []
    for i, ref in enumerate(refs):
        info = names.get(ref)
        if info is None:
            continue
        out.append(
            ChampionDriver(
                driver_ref=ref,
                code=info["driver_code"],
                driver_name=f"{info['first_name']} {info['last_name']}",
                team_name=info["team_name"],
                points=float(base[i]),
                title_probability=round(float(title[i]), 4),
                expected_points=round(float(total[:, i].mean()), 1),
                points_p10=round(float(np.percentile(total[:, i], 10)), 1),
                points_p90=round(float(np.percentile(total[:, i], 90)), 1),
            )
        )
    out.sort(key=lambda d: (-d.title_probability, -d.points))
    return ChampionshipOut(season=season, remaining_races=n_races, simulations=SIMULATIONS, drivers=out)


def driver_detail(service: PredictionService, driver_ref: str) -> DriverDetail | None:
    history = service.predictor.history.sort_values(["season", "round"])
    rows = history[history["driver_ref"] == driver_ref]
    if rows.empty:
        return None
    last = rows.iloc[-1]
    season = service.last_race[0]
    this_season = rows[rows["season"] == season]
    finish = pd.to_numeric(rows["finish_position"], errors="coerce")

    names = {(r.season, r.round): r.name for r in service.review.races}
    probs = {
        (c.season, c.round): next((e.win_probability for e in c.field if e.driver_ref == driver_ref), None)
        for c in service.comparisons.values()
    }
    recent = [
        FormRace(
            season=int(r.season),
            round=int(r.round),
            name=names.get((int(r.season), int(r.round))) or f"{r.circuit_name}",
            circuit_ref=r.circuit_ref,
            grid=int(r.grid_position),
            finish=None if pd.isna(r.finish_position) else int(r.finish_position),
            status=str(r.position_text),
            points=float(r.points),
            model_win_probability=probs.get((int(r.season), int(r.round))),
        )
        for r in rows.tail(10).iloc[::-1].itertuples()
    ]

    done = rows.assign(_finish=finish).dropna(subset=["_finish"])
    by_circuit = done.groupby(["circuit_ref", "circuit_name"])["_finish"].agg(["count", "mean", "min"]).reset_index()
    by_circuit = by_circuit[by_circuit["count"] >= 2].sort_values(["mean", "count"], ascending=[True, False]).head(5)
    circuits = [
        CircuitRecord(
            circuit_ref=c.circuit_ref,
            circuit_name=c.circuit_name,
            races=int(c.count),
            avg_finish=round(float(c.mean), 1),
            best_finish=int(c.min),
        )
        for c in by_circuit.itertuples()
    ]
    this_finish = pd.to_numeric(this_season["finish_position"], errors="coerce")
    return DriverDetail(
        driver_ref=driver_ref,
        code=last["driver_code"],
        name=f"{last['first_name']} {last['last_name']}",
        team_ref=last["team_ref"],
        team_name=last["team_name"],
        season=season,
        season_points=float(this_season["points"].sum()),
        season_wins=int((this_finish == 1).sum()),
        season_podiums=int((this_finish <= 3).sum()),
        races=len(rows),
        wins=int((finish == 1).sum()),
        podiums=int((finish <= 3).sum()),
        recent=recent,
        circuits=circuits,
    )


def _live_races(service: PredictionService, engine: Engine) -> list[LiveRace]:
    """Logged predictions for races that now have a result, scored like the backtest.

    Only the latest burst of requests per race counts (the one made closest to lights out).
    """
    with Session(engine) as session:
        rows = session.exec(
            select(
                PredictionHistory.season,
                PredictionHistory.round,
                PredictionHistory.created_at,
                Driver.driver_ref,
                PredictionHistory.win_probability,
            )
            .join(Driver, Driver.id == PredictionHistory.driver_id)
            .where(PredictionHistory.season.is_not(None), PredictionHistory.round.is_not(None))
        ).all()
    if not rows:
        return []
    logged = pd.DataFrame(rows, columns=["season", "round", "created_at", "driver_ref", "p"])
    history = service.predictor.history
    names = {(r.season, r.round): r.name for r in service.review.races}
    out = []
    for (season, rnd), group in logged.groupby(["season", "round"]):
        result = history[(history["season"] == season) & (history["round"] == rnd)]
        if result.empty:
            continue  # the race has not been scored yet
        latest = group[group["created_at"] >= group["created_at"].max() - pd.Timedelta(minutes=2)]
        latest = latest.sort_values("created_at").drop_duplicates("driver_ref", keep="last")
        won = latest["driver_ref"].isin(result.loc[result["finish_position"] == 1, "driver_ref"]).to_numpy(dtype=float)
        p = latest["p"].to_numpy(dtype=float)
        winner_p = p[won == 1]
        out.append(
            LiveRace(
                season=int(season),
                round=int(rnd),
                name=names.get((int(season), int(rnd))) or str(result["circuit_name"].iloc[0]),
                predictions=len(latest),
                brier=round(float(np.mean((p - won) ** 2)), 5),
                favourite_won=bool(won[p.argmax()] == 1),
                winner_probability=round(float(winner_p[0]), 4) if len(winner_p) else None,
            )
        )
    return sorted(out, key=lambda r: (r.season, r.round))


def monitor(service: PredictionService, engine: Engine | None) -> MonitorOut:
    """Has the model got worse? Per-race error of the backtest, plus live predictions vs results."""
    series = []
    for race in service.comparisons.values():
        win = np.array([e.win_probability for e in race.field])
        won = np.array([e.finish == 1 for e in race.field], dtype=float)
        series.append(
            DriftRace(
                season=race.season,
                round=race.round,
                name=race.name,
                brier=round(float(np.mean((win - won) ** 2)), 5),
                winner_probability=race.winner.win_probability,
            )
        )
    errors = np.array([s.brier for s in series])
    overall = float(errors.mean()) if len(errors) else 0.0
    recent = float(errors[-MONITOR_WINDOW:].mean()) if len(errors) else 0.0
    if not len(errors):
        status = "no_data"
    else:
        status = "watch" if recent > overall * WATCH_RATIO else "ok"

    live, available = [], False
    if engine is not None:
        try:
            live, available = _live_races(service, engine), True
        except Exception:
            log.warning("live monitoring unavailable", exc_info=True)
    return MonitorOut(
        status=status,
        recent_brier=round(recent, 5),
        overall_brier=round(overall, 5),
        window=MONITOR_WINDOW,
        series=series,
        live=live,
        live_available=available,
    )
