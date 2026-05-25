from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import db
from models.user import SignupRequest, LoginRequest, UserOut
from services.auth import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()

users_col = db["users"]


# ── Sign Up ────────────────────────────────────────────────
@router.post("/signup")
def signup(body: SignupRequest):
    if users_col.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": body.name,
        "email": body.email,
        "password": hash_password(body.password),
        "children": [],
        "devices": [],
    }
    result = users_col.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token({"sub": user_id, "email": body.email})
    return {
        "token": token,
        "user": {"id": user_id, "name": body.name, "email": body.email},
    }


# ── Login ─────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest):
    user = users_col.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "email": body.email})
    return {
        "token": token,
        "user": {"id": user_id, "name": user["name"], "email": user["email"]},
    }


# ── Get current user (me) ─────────────────────────────────
@router.get("/me", response_model=UserOut)
def me(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    from bson import ObjectId
    user = users_col.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"])
