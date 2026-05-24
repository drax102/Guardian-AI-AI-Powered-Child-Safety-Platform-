from pydantic import BaseModel

class Alert(BaseModel):

    type:str
    severity:str
    message:str
    image_url:str