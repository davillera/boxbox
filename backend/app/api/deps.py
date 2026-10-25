from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Engine

from app.db.session import get_engine
from app.services.prediction import PredictionService


def get_prediction_service(request: Request) -> PredictionService:
    return request.app.state.prediction_service


def get_db_engine() -> Engine:
    return get_engine()


ServiceDep = Annotated[PredictionService, Depends(get_prediction_service)]
EngineDep = Annotated[Engine, Depends(get_db_engine)]
