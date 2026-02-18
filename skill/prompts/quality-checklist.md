# Quality Checklist

Pre-launch quality gate for x402 APIs. Walk through every item with the user. Do not skip any.

## How to Use This

Go through each section. Test each item. Mark pass ✅ or fail ❌. All critical items must pass before launch. Recommended items should pass but won't block launch.

---

## 🔴 Critical: Payment Flow

These MUST work or the API is broken.

- [ ] **402 Response:** Unauthenticated request returns `402 Payment Required` with valid payment details (price, facilitator address, token, network)
- [ ] **Payment Acceptance:** Request with valid payment proof in `X-PAYMENT` header is accepted
- [ ] **Payment Verification:** Invalid/expired/insufficient payment proof is rejected with clear error
- [ ] **Correct Pricing:** The 402 response contains the price you actually intend to charge
- [ ] **Useful Response:** After valid payment, the API returns the actual data/service (not a placeholder)

### Test It

```bash
# Should return 402 with payment details
curl -i https://your-api.com/v1/endpoint

# Should return 200 with data (after paying via x402 client)
npx x402-fetch https://your-api.com/v1/endpoint
```

---

## 🟡 Important: Error Handling

- [ ] **400 Bad Request:** Malformed input returns 400 with a description of what's wrong
- [ ] **404 Not Found:** Unknown paths return 404, not 500
- [ ] **500 Internal Error:** Unexpected failures return 500 with a generic message (no stack traces leaked)
- [ ] **Rate Limiting:** If applicable, returns 429 with `Retry-After` header
- [ ] **Timeout Handling:** Long operations timeout gracefully, not with a connection reset

---

## 🟡 Important: HTTP Standards

- [ ] **CORS Headers:** If browser-accessible, `Access-Control-Allow-Origin` is set correctly
- [ ] **Content-Type:** Response includes correct `Content-Type` header
- [ ] **JSON Validity:** All JSON responses parse correctly
- [ ] **HTTP Methods:** Only advertised methods are accepted (return 405 for others)

---

## 🟡 Important: Performance

- [ ] **Response Time:** Standard calls complete in < 2 seconds
- [ ] **Cold Start:** First request after idle completes in < 5 seconds (serverless)
- [ ] **Payload Size:** Responses are reasonably sized (compress if > 1MB)
- [ ] **No Memory Leaks:** Server doesn't degrade over time (for long-running servers)

---

## 🟡 Important: Bazaar Integration

- [ ] **Metadata Endpoint:** `/.well-known/x402` (or equivalent) returns valid metadata
- [ ] **Correct Price in Metadata:** Matches actual 402 response price
- [ ] **Description Present:** Metadata includes human-readable description
- [ ] **Schema Available:** OpenAPI or JSON Schema is accessible

---

## 🟢 Recommended: Documentation

- [ ] **API Docs:** At least one example request and response per endpoint
- [ ] **Error Docs:** Common errors and their meanings documented
- [ ] **Rate Limits Documented:** If applicable
- [ ] **Changelog:** Version history (even if just v1)

---

## 🟢 Recommended: Operations

- [ ] **Logging:** Requests are logged (at minimum: timestamp, path, status code, response time)
- [ ] **Monitoring:** Uptime monitoring is in place (e.g., UptimeRobot, Checkly)
- [ ] **Alerts:** You get notified if the API goes down
- [ ] **Deployment Pipeline:** Can deploy updates without downtime

---

## 🟢 Recommended: Security

- [ ] **No Secrets in Responses:** API keys, internal paths, or stack traces are never leaked
- [ ] **Input Validation:** All inputs are validated and sanitized
- [ ] **Dependency Audit:** No known vulnerable dependencies (`npm audit` / `pip audit`)
- [ ] **HTTPS Only:** API only serves over HTTPS

---

## Final Verdict

Count results:

| Category | Pass | Fail |
|----------|------|------|
| 🔴 Critical (5) | _/5 | _/5 |
| 🟡 Important (13) | _/13 | _/13 |
| 🟢 Recommended (8) | _/8 | _/8 |

**Launch decision:**
- All 🔴 pass → **Ready to launch**
- Any 🔴 fail → **Fix before launch**
- 🟡 failures → **Launch with known issues, fix soon**
- 🟢 failures → **Nice-to-have, improve over time**
