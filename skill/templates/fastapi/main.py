"""
x402 Payment-Gated FastAPI Application

A production-ready template for serving paid API endpoints using the x402
HTTP payment protocol with USDC on Base.
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from x402_middleware import X402PaymentMiddleware

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

RECIPIENT_ADDRESS = os.getenv("RECIPIENT_ADDRESS", "0xYourWalletAddress")
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")

# Routes that require payment: {path: {price, description}}
PAID_ROUTES = {
    "/api/data": {
        "price": "0.01",
        "description": "Premium data endpoint",
    },
    "/api/premium": {
        "price": "0.05",
        "description": "Premium analytics",
    },
}

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="x402 Payment-Gated API",
    description="API endpoints gated by USDC micropayments via x402",
    version="1.0.0",
)

app.add_middleware(
    X402PaymentMiddleware,
    recipient_address=RECIPIENT_ADDRESS,
    facilitator_url=FACILITATOR_URL,
    paid_routes=PAID_ROUTES,
)

# ---------------------------------------------------------------------------
# Free endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/.well-known/x402")
async def bazaar_metadata():
    """Bazaar discovery metadata for x402 ecosystem."""
    return {
        "name": "My x402 API",
        "description": "A payment-gated API powered by x402 and USDC on Base",
        "url": os.getenv("BASE_URL", "https://my-api.example.com"),
        "endpoints": [
            {
                "path": path,
                "method": "GET",
                "price": cfg["price"],
                "currency": "USDC",
                "network": "base",
                "description": cfg["description"],
            }
            for path, cfg in PAID_ROUTES.items()
        ],
        "facilitator": FACILITATOR_URL,
        "recipient": RECIPIENT_ADDRESS,
    }


# ---------------------------------------------------------------------------
# Paid endpoints (protected by middleware)
# ---------------------------------------------------------------------------


@app.get("/api/data")
async def get_data():
    return {
        "data": "Here is your premium data",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "paid": True,
    }


@app.get("/api/premium")
async def get_premium():
    return {
        "analytics": {"visitors": 1234, "conversions": 56},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "paid": True,
    }
