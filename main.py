# Vercel entrypoint: the real app lives in backend/app.
import sys

sys.path.insert(0, "backend")

from app.main import app  # noqa: E402, F401
