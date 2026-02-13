# Phase 3 Task 3.3 - Scoped API Key Rotation (2026-02-13)

## Scope
- Add production-style API key rotation flow.
- Preserve scoped permissions during rotation unless explicit override is provided.

## Implementation

### Control-plane support
- File: `prototypes/cli/src/control-plane.js`
- Added `rotateApiKey(...)`:
  - validates target key exists and is active
  - revokes previous key
  - issues replacement key
  - keeps prior scopes by default
  - supports explicit `scopes` override

### CLI support
- File: `prototypes/cli/src/index.js`
- Added command:
  - `auth-rotate-key --key-id <id> [--scope <scope>]`
- Added audit action:
  - `auth_key_rotate`

### Documentation
- File: `prototypes/cli/README.md`
- Added `auth-rotate-key` usage example.

## Tests
- `prototypes/cli/tests/control-plane.test.js`
  - validates old key invalidation + replacement key authentication.
- `prototypes/cli/tests/index-cli.test.js`
  - validates CLI rotation output and key replacement behavior.

## Validation
- `npm test` in `prototypes/cli`: pass.
- `npm test` in `prototypes/csv-api`: pass.
