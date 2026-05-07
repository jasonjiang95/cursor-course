from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router as api_v1_router
from app.core.config import get_settings
from app.db.app_db import init_sample_schema
from app.db.meta_db import ensure_schema


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    meta = Path(settings.meta_db_path)
    appdb = Path(settings.app_db_path)
    meta.parent.mkdir(parents=True, exist_ok=True)
    appdb.parent.mkdir(parents=True, exist_ok=True)

    import sqlite3

    mc = sqlite3.connect(meta)
    try:
        mc.execute("PRAGMA foreign_keys=ON")
        ensure_schema(mc)
        mc.commit()
    finally:
        mc.close()

    bc = sqlite3.connect(appdb)
    try:
        init_sample_schema(bc)
        bc.commit()
    finally:
        bc.close()

    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="智能数据分析 API",
        version="0.1.0",
        lifespan=lifespan,
    )

    origins = [
        part.strip()
        for part in settings.cors_origins.split(",")
        if part.strip()
    ]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    application.include_router(api_v1_router, prefix="/api/v1")

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
