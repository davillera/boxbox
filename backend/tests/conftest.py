import os

# Settings require a URL; tests never touch it (the engine is overridden below).
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.deps import get_db_engine
from app.main import app
from app.models import Circuit, Driver


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(Circuit(circuit_ref="americas", name="Circuit of the Americas", country="USA"))
        s.add(Driver(driver_ref="norris", code="NOR", first_name="Lando", last_name="Norris"))
        s.add(Driver(driver_ref="max_verstappen", code="VER", first_name="Max", last_name="Verstappen"))
        s.commit()
    return engine


@pytest.fixture
def client(engine):
    app.dependency_overrides[get_db_engine] = lambda: engine
    with TestClient(app) as c:  # runs the lifespan (model load)
        yield c
    app.dependency_overrides.clear()
