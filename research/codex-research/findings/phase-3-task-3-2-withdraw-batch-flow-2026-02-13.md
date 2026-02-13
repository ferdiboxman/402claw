# Phase 3 Task 3.2 - Withdraw Request + Batch Processing Flow (2026-02-13)

## Scope
- Move withdrawals from immediate completion to pending-request lifecycle.
- Add batch settlement command to simulate daily payout processing.

## Implementation

### Control-plane payout lifecycle
- File: `prototypes/cli/src/control-plane.js`
- Changes:
  - `requestWithdrawal(...)` now creates `pending` withdrawals.
  - Pending reservation is accounted for before accepting new requests.
  - Added `processPendingWithdrawals(...)`:
    - processes pending rows in FIFO order
    - writes withdrawal ledger entries on completion
    - sets `status=completed_simulated`, `processedAt`, `ledgerId`, `payoutReference`
    - supports `dryRun` mode

### CLI command
- File: `prototypes/cli/src/index.js`
- Added:
  - `withdraw-batch [--limit <n>] [--dry-run <true|false>] [--reference-prefix <value>]`
- Existing `withdraw` now returns pending request + guidance to run batch.
- Added audit action:
  - `tenant_withdrawal_batch`

## Tests Added/Updated
- `prototypes/cli/tests/control-plane.test.js`
  - updated withdrawal test to pending -> batch -> settled balance.
- `prototypes/cli/tests/index-cli.test.js`
  - end-to-end: `withdraw` creates pending request, `withdraw-batch` settles it.

## Validation
- `npm test` in `prototypes/cli`: pass (37/37).
- `npm test` in `prototypes/csv-api`: pass (dispatcher suite unaffected).
