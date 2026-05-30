import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCommonCrawlSignals, lookupDnsSignals, lookupRdapDomain } from "@/server/providers/evidence";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
  });
}

describe("free evidence provider helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("treats RDAP 404 as medium-confidence absence of a registration record", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rdap/dns.json")) {
        return jsonResponse({ services: [[["com"], ["https://rdap.example/"]]] });
      }
      if (url === "https://rdap.example/domain/example.com") {
        return jsonResponse({}, { status: 404 });
      }
      return jsonResponse({}, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupRdapDomain({
      provider: "rdap-domain-signals",
      version: "test",
      domain: "example.com"
    });

    expect(result.label).toBe("no_obvious_conflict_found_in_this_screen");
    expect(result.confidence).toBe("medium");
    expect(result.summary).toContain("not a guarantee");
  });

  it("treats DNS address records as high-confidence active-use signals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const type = new URL(String(input)).searchParams.get("type");
        return jsonResponse(
          type === "A"
            ? { Status: 0, Answer: [{ type: 1, data: "203.0.113.10", TTL: 300 }] }
            : { Status: 0, Answer: [] }
        );
      })
    );

    const result = await lookupDnsSignals({
      provider: "dns-doh-domain-signals",
      version: "test",
      domain: "example.com"
    });

    expect(result.label).toBe("possible_conflict_found");
    expect(result.confidence).toBe("high");
    expect(result.matchedFields[0]).toContain("DNS record type 1");
  });

  it("treats Common Crawl records as historical web signals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/collinfo.json")) return jsonResponse([{ id: "CC-MAIN-2026-18" }]);
        return new Response('{"url":"https://example.com/","timestamp":"20260401000000","status":"200"}\n', { status: 200 });
      })
    );

    const [result] = await lookupCommonCrawlSignals({
      provider: "common-crawl-web-signals",
      version: "test",
      domain: "example.com",
      category: "finance",
      geography: "United States"
    });

    expect(result.label).toBe("inconclusive_result");
    expect(result.confidence).toBe("medium");
    expect(result.summary).toContain("historical web captures");
  });
});
