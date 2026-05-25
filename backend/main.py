from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.alerts import router
from routes.upload import router as upload_router
from routes.auth import router as auth_router

app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(upload_router)
app.include_router(auth_router)

@app.get("/")
def root():
    return {
        "GuardianAI": "running"
    }