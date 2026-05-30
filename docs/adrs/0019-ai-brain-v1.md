# ADR-0019: AI Brain V1

## Status

Accepted

## Context

The product promise depends on AI-assisted startup name generation plus source-backed screening signals. The backend entitlement slice stores projects and names, but the intelligence layer needs versioned prompts, swappable model providers, cost controls, quality evals, and provider evidence caching.

The first production constraint is cost. A $5 one-time pack cannot afford uncontrolled model retries or broad paid search across every generated name. Search calls can become more expensive than generation if every name is checked across every source.

## Decision

Implement AI Brain V1 as a controlled pipeline:

- Use OpenAI direct as the primary structured-generation provider.
- Keep OpenRouter as an optional fallback adapter, not the default production foundation.
- Keep deterministic fixture generation for local/test and provider outage fallback.
- Version generation prompts and JSON schemas in code.
- Gate candidate batches with deterministic evals before persistence.
- Record model usage in a durable AI ledger.
- Cache provider evidence results by normalized provider/check/query keys.
- Keep real external search progressive and explicitly enabled.

## Current-Doc Evidence

- OpenAI supports structured outputs with JSON Schema, which is the right fit for candidate batches: https://platform.openai.com/docs/guides/structured-outputs
- OpenAI prices models per 1M input/output tokens, making nano/mini models viable for this workload: https://developers.openai.com/api/docs/pricing
- OpenAI prompt caching works best when static prompt prefixes come before variable user data: https://developers.openai.com/api/docs/guides/prompt-caching
- OpenRouter is OpenAI-compatible and useful for routing/fallback, but free-plan rate limits and provider variability make it better as fallback than foundation: https://openrouter.ai/pricing
- Brave Search API publishes Search pricing at `$5 per 1,000 requests`, so uncached all-name broad search would harm margins: https://brave.com/search/api/

## Consequences

- Generation quality can improve through prompt/eval iteration without changing API routes.
- The app can run locally without spending money.
- Live model calls become measurable and budgetable.
- Provider search costs are controlled by progressive screening and cache reuse.
- The system still needs a real trademark provider decision before claims feel production-grade.

## Verification

- Unit tests cover prompt registry, cost estimation, eval guardrails, provider cache, and AI ledger writes.
- Eval tests run deterministic naming cases by default.
- A guarded live eval can be run with `AI_EVAL_LIVE=true` and a real `OPENAI_API_KEY`.
