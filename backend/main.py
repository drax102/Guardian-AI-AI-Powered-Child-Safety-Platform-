from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.alerts import router
from routes.upload import router as upload_router
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

    allow_methods=["*"],

    allow_headers=["*"]
)
app.include_router(router)
app.include_router(upload_router)


@app.get("/")
def root():

    return {
        "GuardianAI": "running"
    }