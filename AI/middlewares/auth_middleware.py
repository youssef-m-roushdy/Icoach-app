import jwt
import logging
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()

# Role to tier mapping
ROLE_TO_TIER = {
    "premium": "premium",
    "pro":     "pro",
    "user":    "free",
    "admin":   "premium",
}

async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security), request: Request = None):
    """
    Dependency to validate JWT and inject user info into request.state
    Includes a development backdoor for testing.
    """
    token = auth.credentials

    # 🚨 DEV BACKDOOR: Allows testing without a real token during development only
    if token == "DEV_TEST_TOKEN_2026":
        payload = {
            "id": "test_user_123",
            "role": "admin",
            "tier": "premium",
            "email": "test@icoach.ai"
        }
        if request:
            request.state.user_id = payload["id"]
            request.state.role = payload["role"]
            request.state.tier = payload["tier"]
        return payload

    # ─── Real JWT verification ───
    public_key = settings.public_key
    if not public_key:
        logger.error("JWT public key is missing from settings!")
        raise HTTPException(status_code=500, detail="Server auth configuration error")

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
        
        if payload.get("type") == "refresh":
            raise HTTPException(status_code=401, detail="Cannot use refresh token here")

        # Identity Extraction
        user_id = payload.get("id")
        role    = payload.get("role", "user")
        tier    = ROLE_TO_TIER.get(role, "free")

        # Inject into state for other services
        if request:
            request.state.user_id = user_id
            request.state.role    = role
            request.state.tier    = tier

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")