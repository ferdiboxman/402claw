# AGENTS.md - Harness Engineering Guidelines

This repository uses automated agent workflows with risk-tiered policies.

## Risk Tiers

Changes are automatically classified by risk:

| Tier | Paths | Auto-merge | Human Review |
|------|-------|------------|--------------|
| 🔴 Critical | auth, secrets, migrations | ❌ | Required |
| 🟠 High | routes, services, API | ❌ | Agent review |
| 🟡 Medium | components, utils | ✅ | Agent review |
| 🟢 Low | docs, tests | ✅ | Optional |

## Agent Workflow

### Phase 1: Planning (reasoning: xhigh)
1. Read the task/issue completely
2. Scan relevant codebase areas
3. Identify risk tier of changes
4. Build verification plan BEFORE coding

### Phase 2: Implementation (reasoning: high)
1. Implement with tests in mind
2. Write tests alongside code
3. Run tests frequently (after each significant change)
4. Check against original spec regularly

### Phase 3: Verification (reasoning: xhigh)
1. Run full test suite
2. Verify against original task spec (not your own code)
3. Check edge cases explicitly
4. Review for security issues
5. Ensure no console.logs or debug code

## Self-Verification Checklist

Before marking work complete, verify:

- [ ] All tests pass (`npm test` / `swift test`)
- [ ] Code matches the original spec exactly
- [ ] Edge cases are handled
- [ ] No hardcoded secrets or credentials
- [ ] No debug code (console.log, print statements)
- [ ] Error handling is complete
- [ ] Types are explicit (no `any` in TypeScript)

## Loop Detection

If you've edited the same file 5+ times:
1. STOP and step back
2. Re-read the original task spec
3. Consider a different approach
4. Ask for clarification if needed

**Warning signs of doom loops:**
- Making small variations to the same broken approach
- Tests keep failing with similar errors
- Repeatedly editing the same lines

## Context Injection

The following context is automatically provided:
- Directory structure of relevant paths
- Available tools and their versions
- Time budget warnings (if applicable)
- Risk tier of current changes

## Evidence Requirements

### For API changes:
- Integration tests covering happy path + error cases
- API documentation updated

### For UI changes:
- Screenshot/recording of the change
- Accessibility check passed
- Mobile responsiveness verified

### For Database changes:
- Migration tested both up and down
- Rollback plan documented
- Performance impact assessed

## Commit Messages

Use conventional commits:
```
feat(scope): description
fix(scope): description
docs(scope): description
test(scope): description
refactor(scope): description
```

## When to Ask for Help

- Task spec is ambiguous
- You've been stuck for 3+ iterations
- Changes touch critical security paths
- You're unsure about architectural decisions

## PR Requirements

1. Clear description of what changed and why
2. Link to original issue/task
3. Test coverage for new code
4. Screenshots for UI changes
5. Risk tier label applied automatically
