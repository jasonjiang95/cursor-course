from typing import Annotated

from fastapi import Depends

from app.core.config import Settings, get_settings
from app.db.session_store import SessionStore
from app.services.agent_runner import AgentRunner


def get_settings_dep() -> Settings:
    return get_settings()


def get_session_store(
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> SessionStore:
    return SessionStore(settings.meta_db_path)


def get_agent_runner(
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> AgentRunner:
    return AgentRunner(settings)
