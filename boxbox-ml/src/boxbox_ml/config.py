import os
from pathlib import Path

# boxbox-ml/ (src/boxbox_ml/config.py -> parents[2]); overridable for CI/containers.
ML_ROOT = Path(os.environ.get("BOXBOX_ML_ROOT", Path(__file__).resolve().parents[2]))

CACHE_DIR = ML_ROOT / "cache"  # FastF1/Jolpica + Open-Meteo HTTP caches
DATA_DIR = ML_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"  # one parquet per season
ENTRIES_PATH = DATA_DIR / "race_entries.parquet"  # consolidated, all seasons
ARTIFACTS_DIR = ML_ROOT / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "model.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

# 2018 onwards: the 2018-2021 seasons improved the walk-forward backtest (log loss 0.2915 -> 0.2788) over 2022+ alone.
DEFAULT_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
