# Phase 3 Task 3.1 - Wallet Verification Flow (2026-02-13)

## Scope
- Implement real wallet ownership verification for user withdrawal destination linking.
- Add CLI commands for challenge generation and signed-message verification.
- Keep state compatible across JSON and D1 storage backends.

## Implementation

### Control-plane wallet flow
- File: `prototypes/cli/src/control-plane.js`
- Added:
  - `createWalletVerificationChallenge(...)`
  - `verifyWalletVerificationChallenge(...)`
- Uses real EVM message verification with `ethers`:
  - challenge message is generated server-side with nonce + expiry
  - signature recovery via `verifyMessage`
  - recovered address validated against expected wallet address
- On success:
  - sets `user.walletAddress`
  - sets `user.walletVerifiedAt`
  - marks challenge as used

### CLI commands
- File: `prototypes/cli/src/index.js`
- Added commands:
  - `wallet-challenge --user <id> --wallet <0x-address> [--ttl-minutes <n>]`
  - `wallet-verify --user <id> --wallet <0x-address> --challenge-id <id> --signature <hex>`
- Added audit actions:
  - `wallet_challenge_create`
  - `wallet_challenge_verify`

### Storage compatibility
- File: `prototypes/cli/src/storage/index.js`
- Added `walletChallenges` to control-plane state for:
  - JSON backend
  - D1 backend (`wallet_challenges` document)

## Tests Added/Updated
- `prototypes/cli/tests/control-plane.test.js`
  - verifies signed ownership linking
  - verifies challenge cannot be reused
- `prototypes/cli/tests/index-cli.test.js`
  - end-to-end CLI `wallet-challenge` -> sign -> `wallet-verify`
- `prototypes/cli/tests/storage.test.js`
  - wallet challenge state round-trip for JSON + D1 storage

## Validation
- `npm test` in `prototypes/cli`: pass (36/36).
- `npm test` in `prototypes/csv-api`: pass (billing hardening remains green).

## Notes
- Dependency added:
  - `prototypes/cli/package.json` -> `ethers`
  - lockfile: `prototypes/cli/package-lock.json`
