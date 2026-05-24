from fastapi import APIRouter
from database import db
from models.alert import Alert

router = APIRouter()

alerts = db["alerts"]


@router.post("/alert")
def create_alert(alert: Alert):

    data = alert.model_dump()

    alerts.insert_one(data)

    return {
        "status": "saved"
    }


@router.get("/alerts")
def get_alerts():

    try:

        result = []

        for item in alerts.find():

            item["_id"] = str(
                item["_id"]
            )

            result.append(item)

        return result

    except Exception as e:

        return {
            "error": str(e)
        }