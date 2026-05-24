from fastapi import APIRouter, UploadFile, File
from services.s3 import upload
import os

router = APIRouter()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)

    filepath = f"uploads/{file.filename}"

    with open(filepath, "wb") as f:

        content = await file.read()

        f.write(content)

    url = upload(filepath)

    return {
        "url": url
    }