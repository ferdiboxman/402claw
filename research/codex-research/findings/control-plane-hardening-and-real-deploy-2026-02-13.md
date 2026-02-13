# Control Plane Hardening + Real Deploy Progress (2026-02-13)

## Executive Summary
This iteration closes the four previously open CLI/control-plane gaps:
- real Cloudflare upload/deploy for tenant workers
- auth + audit log
- payout/withdrawal flow
- persistent multi-user storage

All changes are implemented in `prototypes/cli`, with test coverage and passing suites.

## Status Update
- Real Cloudflare upload/deploy: ✅
- Auth + audit log: ✅
- Payout/withdrawal: ✅
- Persistent multi-user storage: ✅

## What Was Implemented

### 1. Real Cloudflare upload/deploy (tenant worker)
Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/cloudflare.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`

New capabilities:
- Generate tenant Worker module from tenant dataset (`csv`/`json`) in registry.
- Upload generated script to Cloudflare Workers API.
- Optional workers.dev enablement.
- Dry-run + execute parity with dispatcher deploy flow.
- Deployment state tracking for tenant deploys.

CLI command:
- `cloudflare-deploy-tenant --tenant <slug> ... [--execute]`

### 2. Auth + audit log
Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/control-plane.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`

New capabilities:
- User records in persistent control-plane storage.
- API key generation, hashing, scope checks, key revoke.
- Optional bootstrap without auth until first key exists.
- Auth enforcement for mutating commands when keys are configured.
- Append-only audit events for mutating command success/failure.

CLI commands:
- `user-create`
- `auth-create-key`
- `auth-revoke-key`
- `auth-list`
- `audit-list`

### 3. Payout/withdrawal
Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/control-plane.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/index.js`

New capabilities:
- Revenue credit events per tenant.
- Balance computation from append-only ledger.
- Withdrawal request flow with 5% withdrawal fee.
- Withdrawal history listing.

CLI commands:
- `revenue-credit`
- `balance`
- `withdraw`
- `withdrawals`

### 4. Persistent multi-user storage
Files:
- `/Users/Shared/Projects/402claw/prototypes/cli/src/control-plane.js`
- `/Users/Shared/Projects/402claw/prototypes/cli/src/registry.js`

New capabilities:
- Persistent control-plane file (`.402claw/control-plane.json`) with:
  - users
  - hashed API keys
  - ledger/withdrawals
  - audit events
- Tenant ownership (`ownerUserId`) persisted in registry.
- Ownership checks for sensitive tenant actions.

## Test Evidence
Passing test suites:
- `prototypes/cli/tests/cloudflare.test.js`
- `prototypes/cli/tests/control-plane.test.js`
- `prototypes/cli/tests/registry.test.js`
- plus no regressions in `prototypes/csv-api` tests

Command:
- `npm test` in `/Users/Shared/Projects/402claw/prototypes/cli`
- `npm test` in `/Users/Shared/Projects/402claw/prototypes/csv-api`

