from pydantic_settings import BaseSettings
import os

_ENV_FILE = os.path.join(os.path.dirname(__file__), "../.env")


# Let's manually parse .env to guarantee it overrides any system environment variables!
env_vals = {}
if os.path.exists(_ENV_FILE):
    with open(_ENV_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vals[k.strip()] = v.strip()

# Override system env with .env explicitly
for key, val in env_vals.items():
    os.environ[key] = val


class Settings(BaseSettings):
    # OpenRouter — OpenAI-compatible API
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    FAST_MODEL: str = os.getenv("FAST_MODEL", "google/gemini-2.0-flash-001")
    DEEP_MODEL: str = os.getenv("DEEP_MODEL", "google/gemini-2.5-pro-preview")

    # DB — SQLite for dev, swap to postgresql+asyncpg://... for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./studyhelper.db")

    # App
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    USE_MOCK: bool = os.getenv("USE_MOCK", "False").lower() in ("true", "1")

    model_config = {"env_file": _ENV_FILE, "env_file_encoding": "utf-8"}


settings = Settings()
