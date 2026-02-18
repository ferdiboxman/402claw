# Clawr Skill — Publish Log

## 2026-02-18: Published to skills.sh

### What was done

1. **Added YAML frontmatter** to `SKILL.md` — required by the skills ecosystem for discovery:
   ```yaml
   ---
   name: clawr
   description: Expert skill for creating, deploying, and monetizing x402 paid APIs with USDC micropayments on Base.
   ---
   ```

2. **Committed and pushed** to `ferdiboxman/402claw` on GitHub (commit `5681664`)

3. **Verified skill discovery** — `npx skills add ... --list` correctly finds the `clawr` skill

4. **Installed globally** for OpenClaw agent via:
   ```bash
   npx skills add https://github.com/ferdiboxman/402claw/tree/main/skill -g -a openclaw -y
   ```

### How users install it

```bash
# Via GitHub URL (pointing to skill/ subdirectory)
npx skills add https://github.com/ferdiboxman/402claw/tree/main/skill

# For a specific agent
npx skills add https://github.com/ferdiboxman/402claw/tree/main/skill -a claude-code -g
```

### How skills.sh listing works

- Skills.sh has **no manual submission** — the leaderboard is powered by anonymous telemetry
- When users run `npx skills add`, aggregate install counts are tracked
- The skill will appear on skills.sh automatically as installs accumulate
- Direct URL: https://skills.sh/ferdiboxman/402claw/clawr

### Notes

- The repo is `ferdiboxman/402claw` with the skill in the `skill/` subdirectory
- `clawr.json` exists as a custom manifest but the skills ecosystem uses `SKILL.md` frontmatter
- If we want a cleaner install path like `npx skills add 402claw/clawr`, we'd need a dedicated `402claw/clawr` GitHub repo (or org)
