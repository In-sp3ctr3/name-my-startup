import { z } from "zod";
import { realProvidersEnabled, env } from "@/env";
import type { ProviderAdapter, ProviderInput } from "@/server/providers/types";
import { lookupCommonCrawlSignals, lookupDnsSignals, lookupRdapDomain, normalizedDomainName, now } from "@/server/providers/evidence";

const providerInputSchema = z.custom<ProviderInput>();

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

export const realProviderAdapters = [rdapDomainAdapter, dnsDomainAdapter, commonCrawlWebAdapter, usptoPublicRecordAdapter, braveSearchAdapter];
