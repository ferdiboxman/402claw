# Phase 5 Task 5.1: Staging Deploy Workflow (2026-02-13)

## Executive Summary
Added a manual GitHub Actions workflow to deploy the Cloudflare dispatcher to staging with a safe dry-run default.
This provides a controlled operator flow for deployment while keeping accidental production-impact risk low.

## Changes
- Added workflow:
  - `/Users/Shared/Projects/402claw/.github/workflows/deploy-dispatcher-staging.yml`

## Workflow Behavior
- Trigger: `workflow_dispatch`
- Inputs:
  - `script_name` (default: `clawr-dispatcher`)
  - `execute` (`false` by default)
- Steps:
  1. checkout + node setup + `npm ci` in `prototypes/cli`
  2. validate required Cloudflare secrets
  3. run dispatcher deploy dry-run
  4. optional real deploy when `execute=true`

## Required Secrets
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_DISPATCH_NAMESPACE`

## Optional Secrets
- `CLOUDFLARE_USAGE_KV_ID`
- `CLOUDFLARE_RATE_KV_ID`

## Risk Notes
- This workflow currently targets staging script name/operator-selected script.
- Add environment protection rules + required reviewers before enabling production workflow.

## Sources
- GitHub Actions manual workflows:
  - https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch
- Cloudflare Workers deployment API patterns:
  - https://developers.cloudflare.com/workers/wrangler/
