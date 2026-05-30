# ADR-0020: Free Evidence Engine V1

## Status

Accepted

## Context

Namelift promises AI-assisted naming plus source-backed screening signals. V1 needs useful evidence without creating a search-provider bill that can erase pack margins. It also needs to avoid overstating certainty: free public sources are partial signals, not legal clearance.

## Decision

Use a progressive free evidence engine behind the existing provider adapter layer:

- RDAP domain lookups for registration-record signals.
- DNS-over-HTTPS A/AAAA lookups for active-resolution signals.
- Common Crawl CDX index checks for historical web-presence signals.
- Brave Search remains optional and credential-gated.
- USPTO/public-record and social-handle checks remain explicit placeholders until selected providers are wired.

Every provider result stores a confidence label:

- `high`: strong source-backed signal, such as an active DNS answer or RDAP registration record.
- `medium`: useful but incomplete signal, such as an RDAP 404 or Common Crawl hit.
- `low`: weak absence or ambiguous signal.
- `unknown`: source was not checked, unavailable, or errored.

Provider results continue to be cached by provider, check type, candidate, and brief so refreshes do not repeatedly hit external APIs.

## Consequences

- V1 can run meaningful domain and web-presence screens with no required paid search API.
- Results remain conservative and report evidence quality directly to users.
- The system still needs a real trademark path before the product can imply deeper public-record coverage.
- Common Crawl and DNS/RDAP cannot prove legal availability, so UI/report copy must keep screening-only language.

## Verification

- Unit tests cover RDAP 404 handling, DNS active-record handling, Common Crawl record handling, mock confidence labels, and provider cache persistence.
- Typecheck, lint, unit tests, evals, build, and frontend QA must pass before shipping.
