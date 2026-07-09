# Native Form Backlog Execution Plan

This plan describes how to execute [docs/ISSUE_BACKLOG.md](docs/ISSUE_BACKLOG.md) with predictable delivery, low risk, and fast feedback.

## Execution Status

- Completed: NF-001, NF-002, NF-003, NF-004, NF-005.
- Verification: pnpm verify is green after implementation.
- Current focus: NF-008 (v0.1 release readiness checklist and publish candidate validation).

## 1. Delivery Objectives

Primary objective for v0.1:

- Ship a stable release with strong runtime reliability and test confidence.

Secondary objective:

- Improve Runtime maintainability without broad architecture churn.

Success metrics:

- 100 percent completion of all v0.1 p0 issues (NF-001, NF-004, NF-005, NF-008).
- No public API or type contract regressions.
- Green pnpm verify on all merge commits to main.
- Zero flaky tests introduced in new coverage areas.

## 2. Working Model

## Cadence

- Sprint length: 1 week.
- Planning: Monday.
- Mid-sprint risk review: Wednesday.
- Demo and retro: Friday.

## Branching and PR flow

- One issue per branch.
- Keep PR scope to one issue acceptance criteria.
- Prefer small stacked PRs for large issues (especially NF-001 and NF-004).

## WIP limits

- Max 1 in-progress issue per engineer.
- Max 2 open PRs per engineer.
- Do not start p1/p2 while v0.1 p0 is blocked.

## Definition of Ready

An issue is ready when:

- Acceptance criteria are testable.
- Affected files and risk areas are identified.
- Reviewer is assigned.

## Definition of Done

An issue is done when:

- Acceptance criteria are met.
- Tests added/updated as needed.
- pnpm verify passes.
- Docs updated if behavior or usage changed.

## 3. Phase Plan

## Phase A: Runtime maintainability baseline (Week 1)

Issues:

- NF-001
- NF-003

Execution notes:

- Implement Runtime flow refactor first (NF-001) in incremental commits.
- Land event type alias split (NF-003) as a behavior-neutral change.

Exit criteria:

- Runtime event order unchanged.
- Existing Runtime and contract tests remain green.

## Phase B: Event readability plus test expansion part 1 (Week 2)

Issues:

- NF-002
- NF-004 (subset A)

NF-004 subset A coverage:

- checkbox behavior
- radio behavior
- select multiple behavior
- disabled fields

Exit criteria:

- Event helper refactor merged without payload regressions.
- New browser semantics tests are deterministic.

## Phase C: Test expansion part 2 and async cancellation (Week 3)

Issues:

- NF-004 (subset B)
- NF-005

NF-004 subset B coverage:

- dynamic field addition
- dynamic field removal
- nested names
- rapid typing
- submit during validation

Exit criteria:

- Latest-wins cancellation proven by tests.
- No race condition regressions in form and field error state.

## Phase D: Docs, mutation policy polish, release prep (Week 4)

Issues:

- NF-006
- NF-007
- NF-008

Exit criteria:

- ValidationPipeline docs/source comments are aligned.
- Mutation ignore helper introduced and covered.
- v0.1 checklist complete and publish candidate validated.

## 4. Issue-level Execution Checklist

Apply this checklist to each issue from [docs/ISSUE_BACKLOG.md](docs/ISSUE_BACKLOG.md):

1. Confirm scope and explicit out-of-scope.
2. Add or update tests first for risky behavior changes.
3. Implement minimal changes to satisfy acceptance criteria.
4. Run pnpm verify locally.
5. Post PR summary with:
   - what changed
   - what did not change
   - evidence (tests)
   - risk notes
6. Request review from one runtime owner and one test owner for p0 changes.

## 5. Ownership Plan

Role model:

- Runtime owner: NF-001, NF-002, NF-007.
- Test owner: NF-004, NF-005.
- Docs owner: NF-006.
- Release owner: NF-008.

If team size is small, combine docs and release ownership.

## 6. Risk Register and Mitigations

Risk: accidental event order changes during refactor.

- Mitigation: keep and expand event-order assertions in Runtime tests.

Risk: flaky async validation tests.

- Mitigation: avoid arbitrary sleeps, use controlled promises and deterministic sequencing.

Risk: over-refactor drift.

- Mitigation: enforce Review Guardrails in [docs/ISSUE_BACKLOG.md](docs/ISSUE_BACKLOG.md).

Risk: release delay due to p1/p2 work starting too early.

- Mitigation: p0-first policy with strict WIP limits.

## 7. Reporting Template

Use this weekly status format:

- Completed: issue IDs closed this week.
- In progress: issue IDs with percent completion.
- Blockers: technical or review blockers.
- Risks: any new risk to v0.1 target.
- Next week: planned issue IDs.

Example:

- Completed: NF-001, NF-002, NF-003
- In progress: NF-004 (25 percent)
- Blockers: none
- Risks: potential flaky test in rapid typing scenario
- Next week: NF-004 subset A and NF-004 subset B

## 8. Immediate Next Actions

1. Start NF-004 subset A tests: checkbox, radio, select multiple, disabled fields.
2. Continue NF-004 subset B tests: dynamic add/remove, nested names, rapid typing, submit during validation.
3. Start NF-005 after NF-004 baseline is merged.
4. Block p1/p2 work when any p0 issue is behind schedule.
5. Review progress mid-week and re-scope if needed to protect NF-004 and NF-005 completion.
