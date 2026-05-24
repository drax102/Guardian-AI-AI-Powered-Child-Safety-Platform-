import boto3
import os
from dotenv import load_dotenv

load_dotenv()

AWS_BUCKET = os.getenv("AWS_BUCKET")

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=os.getenv("AWS_REGION")
)


def upload(filepath):

    filename = os.path.basename(filepath)

    s3.upload_file(
        filepath,
        AWS_BUCKET,
        filename
    )

    return (
        f"https://{AWS_BUCKET}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{filename}"
    )