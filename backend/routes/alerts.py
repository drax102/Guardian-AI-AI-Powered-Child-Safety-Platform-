from fastapi import APIRouter
from database import db
from models.alert import Alert
router=APIRouter()

alerts=db["alerts"]


@router.post("/alert")

def create_alert(alert: Alert):

    alerts.insert_one(
        alert.model_dump()
    )

    return {
        "status":"saved"
    }


@router.get("/alerts")

def get_alerts():

    result=[]

    for x in alerts.find():

        x["_id"]=str(x["_id"])

        result.append(x)

    return result