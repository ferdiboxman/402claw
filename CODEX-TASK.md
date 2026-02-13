# Codex Task - x402 Payment Middleware

## Goal
Integrate x402 payment middleware into the dispatcher worker.

## Context
- Dispatcher: `prototypes/csv-api/src/index.ts`
- Routes `/t/{tenant-slug}/` to user workers in `clawr-staging` namespace
- Need to verify x402 payments BEFORE forwarding to user workers

## Steps

1. **Add dependency**
   ```bash
   cd prototypes/csv-api && pnpm add @x402/core
   ```

2. **Add payment verification to dispatcher**
   - Check for x-402-signature header
   - If missing/invalid: return 402 with payment requirements
   - If valid: forward to user worker

3. **Tenant pricing**
   - Each tenant sets their own price (store in worker binding or KV)
   - Default: $0.001 USDC per request

4. **Payment flow**
   ```
   Request → Check x-402-signature → Valid? → Forward to user worker
                                   → Invalid? → Return 402 + payment details
   ```

5. **Log payments** for analytics

## Reference
- x402 SDK examples: `/Users/clawsenberg/.openclaw/workspace/watching/x402/examples/`
- Existing dispatcher: `prototypes/csv-api/src/index.ts`

## When Done
```bash
openclaw gateway wake --text "Done: x402 payment middleware integrated" --mode now
```

This notifies Clawsenberg that you're finished.
