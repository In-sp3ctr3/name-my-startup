import { z } from "zod";
import { realProvidersEnabled, env } from "@/env";
import type { ProviderAdapter, ProviderInput } from "@/server/providers/types";
import { lookupCommonCrawlSignals, lookupDnsSignals, lookupRdapDomain, normalizedDomainName, now } from "@/server/providers/evidence";

const providerInputSchema = z.custom<ProviderInput>();
const socialPlatforms = [
  { key: "x", label: "X", url: (handle: string) => `https://x.com/${handle}` },
  { key: "instagram", label: "Instagram", url: (handle: string) => `https://www.instagram.com/${handle}/` },
  { key: "tiktok", label: "TikTok", url: (handle: string) => `https://www.tiktok.com/@${handle}` },
  { key: "linkedin", label: "LinkedIn", url: (handle: string) => `https://www.linkedin.com/company/${handle}/` },
  { key: "youtube", label: "YouTube", url: (handle: string) => `https://www.youtube.com/@${handle}` }
] as const;

function normalizedHandle(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 28) || "name";
}

async function fetchSocialProfileStatus(url: string, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "NameliftAvailabilityBot/0.1"
      },
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const rdapDomainAdapter: ProviderAdapter = {
  provider: "rdap-domain-signals",
  version: "0.1.0",
  checkType: "domain",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    if (!realProvidersEnabled) {
      return brief.tlds.map((tld) => ({
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label: "source_not_checked",
        source: "RDAP",
        query: `${candidate.name.toLowerCase()}${tld}`,
        jurisdiction: "global",
        matchedFields: [],
        summary: "Real domain provider is disabled for this environment.",
        confidence: "unknown",
        freshness: "not-checked",
        occurredAt: now()
      }));
    }

    return Promise.all(
      brief.tlds.slice(0, 4).map((tld) =>
        lookupRdapDomain({
          provider: this.provider,
          version: this.version,
          domain: normalizedDomainName(candidate.name, tld)
        })
      )
    );
  }
};

export const dnsDomainAdapter: ProviderAdapter = {
  provider: "dns-doh-domain-signals",
  version: "0.1.0",
  checkType: "domain",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    if (!realProvidersEnabled) {
      return brief.tlds.slice(0, 4).map((tld) => ({
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label: "source_not_checked",
        confidence: "unknown",
        source: "Google Public DNS over HTTPS",
        query: normalizedDomainName(candidate.name, tld),
        jurisdiction: "global",
        matchedFields: [],
        summary: "Real DNS provider is disabled for this environment.",
        freshness: "not-checked",
        occurredAt: now()
      }));
    }

    return Promise.all(
      brief.tlds.slice(0, 4).map((tld) =>
        lookupDnsSignals({
          provider: this.provider,
          version: this.version,
          domain: normalizedDomainName(candidate.name, tld)
        })
      )
    );
  }
};

export const usptoPublicRecordAdapter: ProviderAdapter = {
  provider: "configured-uspto-public-records",
  version: "0.1.0",
  checkType: "trademark",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    return [
      {
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label: realProvidersEnabled ? "source_unavailable" : "source_not_checked",
        source: "USPTO/public-records",
        query: candidate.name,
        jurisdiction: brief.geography,
        matchedFields: [],
        summary: realProvidersEnabled
          ? "USPTO/public-record adapter is configured as unavailable until a data access path is supplied."
          : "Real public-record provider is disabled for this environment.",
        confidence: "unknown",
        freshness: realProvidersEnabled ? "unavailable" : "not-checked",
        occurredAt: now()
      }
    ];
  }
};

export const commonCrawlWebAdapter: ProviderAdapter = {
  provider: "common-crawl-web-signals",
  version: "0.1.0",
  checkType: "web",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    const domain = normalizedDomainName(candidate.name, brief.tlds[0] ?? ".com");
    if (!realProvidersEnabled) {
      return [
        {
          provider: this.provider,
          providerVersion: this.version,
          checkType: this.checkType,
          label: "source_not_checked",
          confidence: "unknown",
          source: "Common Crawl CDX index",
          query: `${domain} ${brief.category}`,
          jurisdiction: brief.geography,
          matchedFields: [],
          summary: "Real historical-web provider is disabled for this environment.",
          freshness: "not-checked",
          occurredAt: now()
        }
      ];
    }

    return lookupCommonCrawlSignals({
      provider: this.provider,
      version: this.version,
      domain,
      category: brief.category,
      geography: brief.geography
    });
  }
};

export const braveSearchAdapter: ProviderAdapter = {
  provider: "brave-search-category-signals",
  version: "0.1.0",
  checkType: "web",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    if (!realProvidersEnabled || !env.BRAVE_SEARCH_API_KEY) {
      return [
        {
          provider: this.provider,
          providerVersion: this.version,
          checkType: this.checkType,
          label: "source_not_checked",
          source: "Brave Search",
          query: `${candidate.name} ${brief.category}`,
          jurisdiction: brief.geography,
          matchedFields: [],
          summary: "Real search provider is disabled or missing credentials for this environment.",
          confidence: "unknown",
          freshness: "not-checked",
          occurredAt: now()
        }
      ];
    }

    try {
      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(`${candidate.name} ${brief.category}`)}&count=5`,
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY
          },
          cache: "no-store"
        }
      );
      if (!response.ok) throw new Error(`Search ${response.status}`);
      const json = (await response.json()) as { web?: { results?: Array<{ title?: string; url?: string }> } };
      const matches = json.web?.results?.map((item) => item.title ?? item.url ?? "result").slice(0, 3) ?? [];
      return [
        {
          provider: this.provider,
          providerVersion: this.version,
          checkType: this.checkType,
          label: matches.length > 0 ? "inconclusive_result" : "no_obvious_conflict_found_in_this_screen",
          source: "Brave Search",
          query: `${candidate.name} ${brief.category}`,
          jurisdiction: brief.geography,
          matchedFields: matches,
          confidence: matches.length > 0 ? "medium" : "low",
          summary:
            matches.length > 0
              ? "Search returned category signals that need review because search evidence is unstable and non-exhaustive."
              : "No obvious category search signal was found in this screen.",
          freshness: "live",
          occurredAt: now()
        }
      ];
    } catch {
      return [
        {
          provider: this.provider,
          providerVersion: this.version,
          checkType: this.checkType,
          label: "provider_error",
          source: "Brave Search",
          query: `${candidate.name} ${brief.category}`,
          jurisdiction: brief.geography,
          matchedFields: [],
          summary: "Search provider failed and cannot be treated as favorable evidence.",
          confidence: "unknown",
          freshness: "live",
          occurredAt: now()
        }
      ];
    }
  }
};

export const publicSocialProfileAdapter: ProviderAdapter = {
  provider: "public-social-profile-signals",
  version: "0.1.0",
  checkType: "social",
  inputSchema: providerInputSchema,
  async run({ candidate, brief }) {
    const handle = normalizedHandle(candidate.name);
    if (!realProvidersEnabled) {
      return socialPlatforms.map((platform) => ({
        provider: this.provider,
        providerVersion: this.version,
        checkType: this.checkType,
        label: "source_not_checked",
        source: `${platform.label} public profile`,
        query: `${platform.key} @${handle}`,
        jurisdiction: brief.geography,
        matchedFields: [],
        summary: "Public social profile lookup is disabled for this environment.",
        confidence: "unknown",
        freshness: "not-checked",
        occurredAt: now()
      }));
    }

    return Promise.all(
      socialPlatforms.map(async (platform) => {
        const url = platform.url(handle);
        try {
          const response = await fetchSocialProfileStatus(url);
          if (response.status === 404 || response.status === 410) {
            return {
              provider: this.provider,
              providerVersion: this.version,
              checkType: this.checkType,
              label: "no_obvious_conflict_found_in_this_screen",
              source: `${platform.label} public profile`,
              query: `${platform.key} @${handle}`,
              jurisdiction: brief.geography,
              matchedFields: [],
              summary: `${platform.label} returned a not-found response for this public handle screen. Platform behavior can change, so verify before launch.`,
              confidence: "low",
              freshness: "live",
              occurredAt: now()
            };
          }

          if ((response.status >= 200 && response.status < 400) || response.status === 401 || response.status === 403) {
            return {
              provider: this.provider,
              providerVersion: this.version,
              checkType: this.checkType,
              label: response.status >= 200 && response.status < 400 ? "possible_conflict_found" : "inconclusive_result",
              source: `${platform.label} public profile`,
              query: `${platform.key} @${handle}`,
              jurisdiction: brief.geography,
              matchedFields: [`HTTP ${response.status}`],
              summary:
                response.status >= 200 && response.status < 400
                  ? `${platform.label} returned a live public response for this handle, so treat it as a review signal.`
                  : `${platform.label} blocked or challenged the lookup, so this handle cannot be treated as available.`,
              confidence: response.status >= 200 && response.status < 400 ? "medium" : "unknown",
              freshness: "live",
              occurredAt: now()
            };
          }

          return {
            provider: this.provider,
            providerVersion: this.version,
            checkType: this.checkType,
            label: "inconclusive_result",
            source: `${platform.label} public profile`,
            query: `${platform.key} @${handle}`,
            jurisdiction: brief.geography,
            matchedFields: [`HTTP ${response.status}`],
            summary: `${platform.label} returned an inconclusive response for this public handle screen.`,
            confidence: "unknown",
            freshness: "live",
            occurredAt: now()
          };
        } catch {
          return {
            provider: this.provider,
            providerVersion: this.version,
            checkType: this.checkType,
            label: "provider_error",
            source: `${platform.label} public profile`,
            query: `${platform.key} @${handle}`,
            jurisdiction: brief.geography,
            matchedFields: [],
            summary: `${platform.label} public handle lookup failed and cannot be treated as favorable evidence.`,
            confidence: "unknown",
            freshness: "live",
            occurredAt: now()
          };
        }
      })
    );
  }
};

export const realProviderAdapters = [
  rdapDomainAdapter,
  dnsDomainAdapter,
  commonCrawlWebAdapter,
  usptoPublicRecordAdapter,
  braveSearchAdapter,
  publicSocialProfileAdapter
];
