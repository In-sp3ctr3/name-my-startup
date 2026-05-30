# AI Brain V1

## Purpose

AI Brain V1 turns the app from a stored-flow shell into a controlled naming pipeline:

1. Generate exactly the entitled number of names.
2. Validate and evaluate the generated batch before saving it.
3. Store model/provider usage in a cost ledger.
4. Cache provider evidence checks so the same name/search combination is not repeatedly billed.
5. Keep live external search optional and progressive.

## Provider Strategy

- Primary generation provider: OpenAI direct, because structured outputs are reliable for schema-shaped JSON.
- Optional fallback provider: OpenRouter, through an OpenAI-compatible API surface.
- Local/test fallback: deterministic fixture generation with zero model spend.

OpenRouter is useful as a fallback or experimentation path, but not as the main production dependency while free model quotas are limited and model availability can change. OpenRouter documents free-plan limits and paid routing/fallback behavior: https://openrouter.ai/pricing

## Cost Strategy

- Free preview uses `OPENAI_NAMING_FREE_MODEL`, defaulting to `gpt-5.4-nano`.
- Paid 50-name packs use `OPENAI_NAMING_PAID_MODEL`, defaulting to `gpt-5.4-mini`.
- Per-generation and daily budget caps are configured with:
  - `AI_MAX_GENERATION_COST_CENTS`
  - `AI_DAILY_BUDGET_CENTS`
- Every model call writes an `ai_usage_events` row with provider, model, task, prompt version, token counts, estimated micro-cent cost, status, and metadata.

OpenAI pricing is model-based per 1M input/output tokens: https://developers.openai.com/api/docs/pricing

## Prompt And Eval Strategy

- Prompts live in `src/server/ai/prompt-registry.ts`.
- The active generation prompt is `naming-generation-v2`.
- The schema version is `candidate-batch-v2`.
- Static instructions are first in the prompt to help prompt caching.
- Generated candidates pass `evaluateCandidateBatch()` before storage.

OpenAI prompt caching works on repeated prompt prefixes and can reduce input costs/latency when static instructions are placed before variable user data: https://developers.openai.com/api/docs/guides/prompt-caching

Structured outputs constrain model responses to JSON Schema: https://platform.openai.com/docs/guides/structured-outputs

## Evidence/Search Strategy

V1 avoids a broad search bill by using progressive checks:

- All generated names can run internal quality checks.
- Domain evidence uses RDAP-style checks where possible, plus DNS-over-HTTPS address-record signals.
- Web/category evidence uses Common Crawl historical index signals by default.
- Web/category evidence uses Brave only when enabled with `BRAVE_SEARCH_API_KEY`.
- Trademark/public-record checks stay placeholder until a real provider is selected.
- Social checks stay deferred until a real handle provider is selected.
- Provider results are cached in `provider_cache_entries`.
- Provider results carry a source confidence label: `high`, `medium`, `low`, or `unknown`.

Evidence V1 source roles:

- `rdap-domain-signals`: uses IANA RDAP bootstrap data and RDAP domain endpoints. A returned registration record is `high` confidence; a 404 is only `medium` confidence because it is not proof of purchase availability.
- `dns-doh-domain-signals`: uses Google Public DNS-over-HTTPS for A/AAAA records. Active resolution is `high` confidence as a usage signal; NXDOMAIN for both address-record checks is `medium` confidence.
- `common-crawl-web-signals`: uses the latest Common Crawl CDX index for historical web captures. Hits are `medium` confidence and no hits are `low` confidence because crawl coverage is incomplete.
- `brave-search-category-signals`: optional paid search signal when `BRAVE_SEARCH_API_KEY` is present; otherwise it reports `source_not_checked`.

These are screening signals, not legal conclusions or exhaustive search results. The provider summaries must keep that language.

Source docs:

- IANA RDAP bootstrap data: https://data.iana.org/rdap/dns.json
- Google Public DNS-over-HTTPS API: https://developers.google.com/speed/public-dns/docs/doh
- Common Crawl index API: https://index.commoncrawl.org/
- Brave Search API pricing: https://brave.com/search/api/

## Recommended Next Provider Decisions

- Domain availability: Cloudflare Registrar API or Porkbun/Namecheap if account/API constraints work for the product.
- Web/category search: keep Common Crawl as the free default; use Brave selectively for higher-signal paid-pack checks if margins support it.
- Trademark: choose either an official USPTO-data path for source-backed status lookup or a commercial trademark API for fuzzy/phonetic matching.
- Social handles: defer unless this becomes a strong buyer requirement; it can become query-expensive quickly.

## Local Commands

- Deterministic evals: `pnpm ai:eval`
- Live tiny eval with OpenAI credits: `OPENAI_API_KEY=... pnpm ai:eval:live`
- Full test suite: `pnpm test`
