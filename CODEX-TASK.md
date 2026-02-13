# Codex Roadmap - Next Steps

## ✅ DONE (committed)
- Multi-resource types (dataset, function, proxy)
- x402 payment middleware with fail-closed
- Rate limiting + usage quotas
- Secret-safe proxy publishing
- KV analytics + live frontend
- Control plane (auth, audit, revenue)
- Tests: CLI 30/30, Dispatcher 34/34

---

## 🎯 PHASE 1: Production Storage (Priority)

### Task 1.1: D1 Database Setup
```bash
# Create D1 database
wrangler d1 create clawr-prod

# Schema needed:
# - tenants (id, slug, owner_id, config, created_at, updated_at)
# - users (id, email, wallet_address, created_at)
# - api_keys (id, user_id, key_hash, scopes, created_at, revoked_at)
# - ledger (id, tenant_id, type, amount, metadata, created_at)
# - audit_log (id, user_id, action, metadata, created_at)
```

### Task 1.2: Migration Layer
- Create `src/storage/` module
- Abstract current JSON file ops behind interface
- Implement D1 adapter
- Write migration script from JSON → D1
- Add rollback capability

### Task 1.3: Test Coverage
- Unit tests for D1 adapter
- Integration tests with wrangler d1 execute
- Migration dry-run tests

---

## 🎯 PHASE 2: Billing Hardening

### Task 2.1: Settlement Idempotency
- Add idempotency_key to ledger events
- Dedupe on facilitator callback
- Handle retry scenarios

### Task 2.2: Spend Caps
- `dailySpendUsd` and `monthlySpendUsd` per tenant
- Track cumulative settlement amounts
- Block requests when cap hit (return 402 with cap_exceeded)

### Task 2.3: Audit Trail
- Every settlement → audit event
- Include: amount, facilitator_tx, tenant, caller_hash, timestamp
- Immutable append-only in D1

---

## 🎯 PHASE 3: Auth & Wallet Production

### Task 3.1: User Wallets
- Wallet address in user profile
- Verify wallet ownership (sign message flow)
- Link to withdraw destination

### Task 3.2: Withdraw Flow
- Request withdrawal → pending state
- Batch payouts (daily cron)
- 5% fee deduction
- On-chain settlement via facilitator or direct

### Task 3.3: Scoped API Keys
- Scopes: `read`, `write`, `admin`, `deploy`
- Per-tenant vs global keys
- Key rotation support

---

## 🎯 PHASE 4: Frontend Polish

### Task 4.1: Auth Token Flow
- Login with wallet (Sign-In with Ethereum)
- JWT session tokens
- Protected routes (/dashboard, /settings)

### Task 4.2: Live Analytics
- /explore: today/week/all-time tabs
- /dashboard: your APIs, earnings, usage graphs
- Real-time updates via polling or SSE

### Task 4.3: Creator Dashboard
- Deploy new API wizard
- Edit pricing/quotas
- View earnings per API
- Withdrawal history

---

## 🎯 PHASE 5: Production Ops

### Task 5.1: Deploy Pipeline
- GitHub Actions: test → build → deploy
- Staging namespace before prod
- Rollback on failure

### Task 5.2: Secrets Management
- Cloudflare secrets for prod keys
- Rotate without redeploy
- Document secret inventory

### Task 5.3: Monitoring
- Dispatcher error rates
- Payment failure alerts
- Quota breach notifications
- Uptime checks

---

## 📋 When Done with Each Task
```bash
openclaw gateway wake --text "Done: [task description]" --mode now
```

This notifies Clawsenberg immediately.

---

## 🚫 NOT YET (save for later)
- Discovery ranking tuning
- Featured/verified creators
- Growth loops
- TypeScript bundling for functions
- Durable Objects for strict rate limiting

---

**Start with Phase 1, Task 1.1.** Get D1 set up first, then we have a real database to build on.
