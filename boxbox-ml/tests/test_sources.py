from types import SimpleNamespace

import pandas as pd
import pytest

from boxbox_ml.sources import jolpica, weather


def test_fetch_all_dedupes_race_split_across_pages():
    """Race 2 straddles the page boundary: one race row, all its driver rows."""
    r1, r2 = {"season": 2025, "round": 1}, {"season": 2025, "round": 2}
    pages = {
        0: SimpleNamespace(
            description=pd.DataFrame([r1, r2]),
            content=[pd.DataFrame({"driverId": ["a", "b"]}), pd.DataFrame({"driverId": ["a"]})],
            total_results=4,
        ),
        3: SimpleNamespace(description=pd.DataFrame([r2]), content=[pd.DataFrame({"driverId": ["b"]})], total_results=4),
    }
    calls = []

    def method(limit, offset, **params):
        calls.append(offset)
        return pages[0 if offset == 0 else 3]

    jolpica.PAGE_SIZE, old = 3, jolpica.PAGE_SIZE
    try:
        races, rows = jolpica._fetch_all(method, season=2025)
    finally:
        jolpica.PAGE_SIZE = old

    assert calls == [0, 3]
    assert len(races) == 2
    assert sorted(zip(rows["round"], rows["driverId"])) == [(1, "a"), (1, "b"), (2, "a"), (2, "b")]


class FakeSession:
    def __init__(self, hourly):
        self.hourly, self.urls = hourly, []

    def get(self, url, params, timeout):
        self.urls.append(url)
        return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {"hourly": self.hourly})


def test_race_weather_uses_the_two_hours_from_lights_out():
    hourly = {
        "time": ["2025-03-16T03:00", "2025-03-16T04:00", "2025-03-16T05:00", "2025-03-16T06:00"],
        "temperature_2m": [10.0, 16.0, 18.0, 30.0],
        "relative_humidity_2m": [99, 80, 70, 10],
        "precipitation": [9.0, 0.6, 0.6, 9.0],
        "surface_pressure": [1000, 1010, 1012, 1000],
        "wind_speed_10m": [9.0, 2.0, 4.0, 9.0],
    }
    session = FakeSession(hourly)
    w = weather.race_weather(session, -37.8, 144.9, pd.Timestamp("2025-03-16 04:30", tz="UTC"))

    assert session.urls == [weather.ARCHIVE_URL]  # old race -> reanalysis
    assert w["air_temp_c"] == pytest.approx(17.0)  # 04:00 and 05:00 only
    assert w["precipitation_mm"] == pytest.approx(1.2)
    assert w["rainfall"] is True  # 1.2 mm >= RAIN_THRESHOLD_MM
