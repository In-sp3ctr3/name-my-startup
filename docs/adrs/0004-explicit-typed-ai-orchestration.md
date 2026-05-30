# ADR-0004: Explicit Typed AI Orchestration

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product

## Context

The PRD calls for AI-assisted name generation and evidence synthesis, but explicitly warns against overbuilding an autonomous agent. The AI should help orchestrate the workflow while deterministic checks provide source-backed screening results.

## Decision

Implement explicit typed AI workflows in TypeScript instead of adopting a broad agent framework for MVP.

The AI layer should:

- Use structured outputs validated with schemas.
- Version prompts and scoring rubrics.
- Separate creative generation from screening interpretation.
- Call provider adapters through explicit application code.
- Store model, prompt, parameters, and output snapshots.
- Use eval fixtures for known briefs and known conflict cases.

## Options Considered

### Option A: Direct Model Calls Without Workflow Layer

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Fast to start.

**Cons:** Hard to test, hard to version, easy to mix creative and screening responsibilities.

### Option B: Explicit Typed Workflow Layer

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Testable, debuggable, easier to audit, avoids agent sprawl.

**Cons:** Requires upfront workflow and schema design.

### Option C: Heavy Agent Framework

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | Medium to high |
| Scalability | Medium |
| Team familiarity | Medium |

**Pros:** Useful for exploratory autonomous tasks.

**Cons:** Too much abstraction for MVP, harder to constrain legal-language and provider behavior.

## Trade-off Analysis

Typed workflows keep the experience sharp and controllable. They also make it easier to test that the AI never invents provider results or overstates screening certainty.

## Consequences

- More workflow code is written by the application.
- Prompts become versioned product artifacts.
- Evals must be maintained as the product evolves.
- The AI layer can later adopt more agentic behavior inside bounded tasks.

## Action Items

1. [ ] Define schemas for briefs, candidates, scoring explanations, screening summaries, and reports.
2. [ ] Create prompt version registry.
3. [ ] Add eval fixtures for generation quality and legal-language compliance.
4. [ ] Log model cost, latency, prompt version, and output validation failures.

