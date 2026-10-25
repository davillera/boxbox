# syntax=docker/dockerfile:1
# Build from the repo root (the backend depends on ../boxbox-ml):
#   docker build -f backend/Dockerfile -t boxbox-api .
# Requires boxbox-ml/artifacts/model.joblib (run `uv run python -m boxbox_ml.train` first).

ARG PYTHON_VERSION=3.13

# ---- builder: resolve and install the locked environment -------------------
FROM python:${PYTHON_VERSION}-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_NO_DEV=1

WORKDIR /app/backend

# boxbox-ml is a path dependency; it is installed as a regular (non-editable) wheel.
COPY boxbox-ml/pyproject.toml boxbox-ml/README.md /app/boxbox-ml/
COPY boxbox-ml/src /app/boxbox-ml/src
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable --no-install-project \
    # Bundled test suites of the scientific stack are never imported at runtime.
    && find .venv/lib/python*/site-packages/pandas .venv/lib/python*/site-packages/numpy \
        .venv/lib/python*/site-packages/scipy .venv/lib/python*/site-packages/sklearn \
        -type d -name tests -prune -exec rm -rf {} +

COPY backend/app ./app

# ---- runtime: venv + app code + model only ----------------------------------
FROM python:${PYTHON_VERSION}-slim AS runtime

# XGBoost needs the OpenMP runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

WORKDIR /app/backend
# Same path as in the builder: venv entry points embed the interpreter path.
COPY --from=builder --chown=app:app /app/backend/.venv ./.venv
COPY --from=builder --chown=app:app /app/backend/app ./app
COPY --chown=app:app boxbox-ml/artifacts/model.joblib /app/model/model.joblib

ENV PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MODEL_PATH=/app/model/model.joblib \
    PORT=8000

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/health', timeout=4)"

# sh -c so $PORT (set by most PaaS) is honoured; exec keeps uvicorn as PID 1 for signals.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --proxy-headers --forwarded-allow-ips='*'"]
