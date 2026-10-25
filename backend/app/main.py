import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.services.prediction import PredictionService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Load the model once per process; fail fast if the bundle is missing.
    app.state.prediction_service = PredictionService.from_path(get_settings().model_path)
    logging.getLogger(__name__).info("model %s loaded", app.state.prediction_service.model_info.version)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="BoxBox API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(router)
    return app


app = create_app()
