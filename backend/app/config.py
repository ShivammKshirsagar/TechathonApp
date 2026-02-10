from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "CodeBlitz Backend"
    debug: bool = True
    backend_url: str = "http://localhost:8000"
    upload_dir: str = "backend/uploads"
    allow_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
