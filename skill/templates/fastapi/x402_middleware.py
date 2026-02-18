"""
x402 Payment Middleware for FastAPI.

Intercepts requests to protected routes and enforces x402 payment protocol:
  - No X-PAYMENT header → 402 response with payment requirements.
  - X-PAYMENT present → verify with facilitator, pass through if valid.

Usage:
    app = FastAPI()
    app.add_middleware(
        X402PaymentMiddleware,
        recipient_address="0x...",
        facilitator_url="https://x402.org/facilitator",
        paid_routes={"/api/data": {"price": "0.01", "description": "Premium data"}},
    )
"""

import json
from typing import Any

import httpx
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# USDC on Base
USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
CHAIN_ID = 8453


def _usdc_to_base_units(amount: str) -> str:
    """Convert human-readable USDC (e.g. '0.01') to 6-decimal base units."""
    parts = amount.split(".")
    whole = parts[0] or "0"
    frac = (parts[1] if len(parts) > 1 else "").ljust(6, "0")[:6]
    return str(int(whole) * 1_000_000 + int(frac))


def _build_payment_requirements(
    recipient: str,
    facilitator_url: str,
    price: str,
    description: str,
    resource: str,
) -> dict[str, Any]:
    return {
        "x402Version": 1,
        "accepts": ["exact"],
        "usdcAddress": USDC_ADDRESS,
        "payTo": recipient,
        "maxAmountRequired": _usdc_to_base_units(price),
        "chainId": CHAIN_ID,
        "resource": resource,
        "facilitatorUrl": facilitator_url,
        "description": description,
        "mimeType": "application/json",
    }


class X402PaymentMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that gates routes behind x402 USDC payments."""

    def __init__(
        self,
        app: Any,
        recipient_address: str,
        facilitator_url: str = "https://x402.org/facilitator",
        paid_routes: dict[str, dict[str, str]] | None = None,
    ):
        super().__init__(app)
        self.recipient = recipient_address
        self.facilitator_url = facilitator_url.rstrip("/")
        # paid_routes: {"/api/data": {"price": "0.01", "description": "..."}}
        self.paid_routes = paid_routes or {}

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path
        route_cfg = self.paid_routes.get(path)

        # Not a paid route – pass through
        if route_cfg is None:
            return await call_next(request)

        price = route_cfg["price"]
        description = route_cfg.get("description", path)
        resource = str(request.url)

        payment_header = request.headers.get("X-PAYMENT")

        # No payment → 402
        if not payment_header:
            requirements = _build_payment_requirements(
                self.recipient, self.facilitator_url, price, description, resource
            )
            return JSONResponse(
                status_code=402,
                content=requirements,
                headers={"X-Payment-Requirements": json.dumps(requirements)},
            )

        # Verify with facilitator
        verify_body = {
            "payment": payment_header,
            "payTo": self.recipient,
            "maxAmountRequired": _usdc_to_base_units(price),
            "chainId": CHAIN_ID,
            "usdcAddress": USDC_ADDRESS,
            "resource": resource,
        }

        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.post(
                    f"{self.facilitator_url}/verify",
                    json=verify_body,
                )
                result = resp.json()
            except Exception as exc:
                return JSONResponse(
                    status_code=502,
                    content={"error": "Facilitator unreachable", "detail": str(exc)},
                )

        if not result.get("valid"):
            return JSONResponse(
                status_code=402,
                content={
                    "error": "Payment verification failed",
                    "reason": result.get("reason", "Unknown"),
                },
            )

        # Payment valid – serve content
        return await call_next(request)
