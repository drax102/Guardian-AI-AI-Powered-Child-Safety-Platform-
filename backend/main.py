from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.alerts import router as alerts_router
from routes.upload import router as upload_router
from routes.auth import router as auth_router

app = FastAPI(
    title="GuardianAI API"
)

origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(alerts_router)

app.include_router(
    upload_router,
    prefix="/upload",
    tags=["upload"]
)

app.include_router(
    auth_router,
    prefix="/auth",
    tags=["auth"]
)

@app.get("/")
def root():
    return {
        "GuardianAI": "running"
    }