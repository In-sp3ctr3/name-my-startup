import { createHash } from "node:crypto";
import type { ProviderResultInput } from "@/lib/schemas";

type RData = {
  services?: Array<[string[], string[]]>;
};

type DnsJsonResponse = {
  Status?: number;
  Answer?: Array<{ data?: string; type?: number; TTL?: number }>;
  Comment?: string;
};

type CommonCrawlCollection = {
  id: string;
};

type CommonCrawlRecord = {
  url?: string;
  timestamp?: string;
  status?: string;
  mime?: string;
};

let rdapBootstrapCache: RData | null = null;
let commonCrawlCollectionCache: string | null = null;

export function now() {
  return new Date().toISOString();
}

export function hashPayload(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function normalizedDomainName(name: string, tld: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
  const suffix = tld.startsWith(".") ? tld : `.${tld}`;
  return `${base || "name"}${suffix.toLowerCase()}`;
}

function result(input: Omit<ProviderResultInput, "occurredAt">): ProviderResultInput {
  return {
    ...input,
    occurredAt: now()
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function rdapBootstrap() {
  if (rdapBootstrapCache) return rdapBootstrapCache;
  const response = await fetchWithTimeout("https://data.iana.org/rdap/dns.json", { cache: "force-cache" });
  if (!response.ok) throw new Error(`IANA RDAP bootstrap ${response.status}`);
  rdapBootstrapCache = (await response.json()) as RData;
  return rdapBootstrapCache;
}

async function rdapBaseForDomain(domain: string) {
  const tld = domain.split(".").pop()?.toLowerCase();
  if (!tld) return null;
  try {
    const bootstrap = await rdapBootstrap();
    const service = bootstrap.services?.find(([tlds]) => tlds.map((item) => item.toLowerCase()).includes(tld));
    return service?.[1]?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function lookupRdapDomain(input: {
  provider: string;
  version: string;
  domain: string;
}): Promise<ProviderResultInput> {
  const query = input.domain;
  try {
    const base = await rdapBaseForDomain(query);
    const url = base ? new URL(`domain/${query}`, base.endsWith("/") ? base : `${base}/`).toString() : `https://rdap.org/domain/${query}`;
    const response = await fetchWithTimeout(url, { headers: { Accept: "application/rdap+json, application/json" }, cache: "no-store" });

    if (response.status === 404) {
      return result({
        provider: input.provider,
        providerVersion: input.version,
        checkType: "domain",
        label: "no_obvious_conflict_found_in_this_screen",
        confidence: "medium",
        source: base ? "IANA RDAP bootstrap" : "rdap.org fallback",
        query,
        jurisdiction: "global",
        matchedFields: [],
        summary: "No RDAP registration record was returned in this screen. This is not a guarantee that the domain can be registered.",
        freshness: "live"
      });
    }

    if (!response.ok) throw new Error(`RDAP ${response.status}`);
    const body = (await response.json()) as { status?: string[]; events?: Array<{ eventAction?: string }> };
    const matchedFields = [
      ...(body.status?.slice(0, 4).map((status) => `domain status: ${status}`) ?? []),
      ...(body.events?.slice(0, 2).map((event) => `event: ${event.eventAction ?? "domain event"}`) ?? [])
    ];
    return result({
      provider: input.provider,
      providerVersion: input.version,
      checkType: "domain",
      label: "possible_conflict_found",
      confidence: "high",
      source: base ? "IANA RDAP bootstrap" : "rdap.org fallback",
      query,
      jurisdiction: "global",
      matchedFields: matchedFields.length ? matchedFields : ["domain registration record"],
      summary: "RDAP returned a domain registration record, so this name requires review before any purchase or launch decision.",
      rawPayloadHash: hashPayload(body),
      freshness: "live"
    });
  } catch {
    return result({
      provider: input.provider,
      providerVersion: input.version,
      checkType: "domain",
      label: "provider_error",
      confidence: "unknown",
      source: "RDAP",
      query,
      jurisdiction: "global",
      matchedFields: [],
      summary: "RDAP lookup failed and cannot be treated as favorable evidence.",
      freshness: "live"
    });
  }
}

async function dnsQuery(domain: string, type: "A" | "AAAA") {
  const url = new URL("https://dns.google/resolve");
  url.searchParams.set("name", domain);
  url.searchParams.set("type", type);
  url.searchParams.set("edns_client_subnet", "0.0.0.0/0");
  const response = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`DNS ${response.status}`);
  return (await response.json()) as DnsJsonResponse;
}

export async function lookupDnsSignals(input: {
  provider: string;
  version: string;
  domain: string;
}): Promise<ProviderResultInput> {
  const query = input.domain;
  try {
    const responses = await Promise.all([dnsQuery(query, "A"), dnsQuery(query, "AAAA")]);
    const answers = responses.flatMap((response) => response.Answer ?? []).filter((answer) => answer.data);
    if (answers.length > 0) {
      return result({
        provider: input.provider,
        providerVersion: input.version,
        checkType: "domain",
        label: "possible_conflict_found",
        confidence: "high",
        source: "Google Public DNS over HTTPS",
        query,
        jurisdiction: "global",
        matchedFields: answers.slice(0, 4).map((answer) => `DNS record type ${answer.type}: ${answer.data}`),
        summary: "DNS-over-HTTPS returned active resolution records. Treat this as a strong usage signal, not a legal conclusion.",
        rawPayloadHash: hashPayload(responses),
        freshness: "live"
      });
    }
    if (responses.every((response) => response.Status === 3)) {
      return result({
        provider: input.provider,
        providerVersion: input.version,
        checkType: "domain",
        label: "no_obvious_conflict_found_in_this_screen",
        confidence: "medium",
        source: "Google Public DNS over HTTPS",
        query,
        jurisdiction: "global",
        matchedFields: [],
        summary: "DNS-over-HTTPS returned NXDOMAIN for A and AAAA records. This is a useful signal, but not proof of registrability.",
        rawPayloadHash: hashPayload(responses),
        freshness: "live"
      });
    }
    return result({
      provider: input.provider,
      providerVersion: input.version,
      checkType: "domain",
      label: "inconclusive_result",
      confidence: "low",
      source: "Google Public DNS over HTTPS",
      query,
      jurisdiction: "global",
      matchedFields: responses.map((response) => `DNS status: ${response.Status ?? "unknown"}`),
      summary: "DNS returned no usable address records, but the response was not strong enough to treat as a clean signal.",
      rawPayloadHash: hashPayload(responses),
      freshness: "live"
    });
  } catch {
    return result({
      provider: input.provider,
      providerVersion: input.version,
      checkType: "domain",
      label: "provider_error",
      confidence: "unknown",
      source: "Google Public DNS over HTTPS",
      query,
      jurisdiction: "global",
      matchedFields: [],
      summary: "DNS-over-HTTPS lookup failed and cannot be treated as favorable evidence.",
      freshness: "live"
    });
  }
}

async function latestCommonCrawlCollection() {
  if (commonCrawlCollectionCache) return commonCrawlCollectionCache;
  const response = await fetchWithTimeout("https://index.commoncrawl.org/collinfo.json", { cache: "force-cache" });
  if (!response.ok) throw new Error(`Common Crawl collections ${response.status}`);
  const collections = (await response.json()) as CommonCrawlCollection[];
  commonCrawlCollectionCache = collections[0]?.id ?? null;
  if (!commonCrawlCollectionCache) throw new Error("No Common Crawl collections found.");
  return commonCrawlCollectionCache;
}

export async function lookupCommonCrawlSignals(input: {
  provider: string;
  version: string;
  domain: string;
  category: string;
  geography: string;
}): Promise<ProviderResultInput[]> {
  const query = `${input.domain} ${input.category}`;
  try {
    const collection = await latestCommonCrawlCollection();
    const url = new URL(`https://index.commoncrawl.org/${collection}-index`);
    url.searchParams.set("url", `${input.domain}/*`);
    url.searchParams.set("output", "json");
    url.searchParams.set("filter", "status:200");
    url.searchParams.set("limit", "5");
    const response = await fetchWithTimeout(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" });
    if (response.status === 404) {
      return [
        result({
          provider: input.provider,
          providerVersion: input.version,
          checkType: "web",
          label: "no_obvious_conflict_found_in_this_screen",
          confidence: "low",
          source: `Common Crawl ${collection}`,
          query,
          jurisdiction: input.geography,
          matchedFields: [],
          summary: "Common Crawl returned no recent indexed page captures for this domain. This is a historical-web signal only.",
          freshness: "crawl-index"
        })
      ];
    }
    if (!response.ok) throw new Error(`Common Crawl ${response.status}`);
    const text = await response.text();
    const records = text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CommonCrawlRecord);
    if (records.length === 0) {
      return [
        result({
          provider: input.provider,
          providerVersion: input.version,
          checkType: "web",
          label: "no_obvious_conflict_found_in_this_screen",
          confidence: "low",
          source: `Common Crawl ${collection}`,
          query,
          jurisdiction: input.geography,
          matchedFields: [],
          summary: "Common Crawl returned no indexed page captures for this domain in the selected crawl.",
          freshness: "crawl-index"
        })
      ];
    }
    return [
      result({
        provider: input.provider,
        providerVersion: input.version,
        checkType: "web",
        label: "inconclusive_result",
        confidence: "medium",
        source: `Common Crawl ${collection}`,
        query,
        jurisdiction: input.geography,
        matchedFields: records.slice(0, 3).map((record) => `${record.timestamp ?? "unknown"} ${record.url ?? input.domain}`),
        summary: "Common Crawl found historical web captures for this domain. Review the captured pages before treating the name as distinctive.",
        rawPayloadHash: hashPayload(records),
        freshness: "crawl-index"
      })
    ];
  } catch {
    return [
      result({
        provider: input.provider,
        providerVersion: input.version,
        checkType: "web",
        label: "provider_error",
        confidence: "unknown",
        source: "Common Crawl CDX index",
        query,
        jurisdiction: input.geography,
        matchedFields: [],
        summary: "Common Crawl lookup failed and cannot be treated as favorable evidence.",
        freshness: "crawl-index"
      })
    ];
  }
}
