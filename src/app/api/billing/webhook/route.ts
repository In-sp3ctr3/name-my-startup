import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getPaymentGateway } from "@/server/payment";
import { grantPaidPack, recordProviderEvent } from "@/server/store";

function payloadHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export async function POST(request: Request) {
  const gateway = getPaymentGateway();
  const body = await request.text();

  try {
    if (!gateway.isConfigured()) {
      await recordProviderEvent({
        provider: gateway.provider,
        externalEventId: `unconfigured:${payloadHash(body)}`,
        eventType: "unconfigured_webhook",
        status: "ignored",
        payloadHash: payloadHash(body)
      });
      return NextResponse.json({ error: "Payment provider is not configured.", code: "payment_provider_not_configured" }, { status: 503 });
    }

    const event = await gateway.verifyWebhook(new Request(request.url, { method: "POST", headers: request.headers, body }));
    const recorded = await recordProviderEvent({
      provider: event.provider,
      externalEventId: event.externalEventId,
      eventType: event.type,
      status: event.type === "checkout.completed" ? "processed" : "ignored",
      payloadHash: payloadHash(body)
    });

    if (!recorded.duplicate && event.type === "checkout.completed") {
      await grantPaidPack(
        {
          userId: "payment-webhook",
          orgId: "system",
          source: "demo"
        },
        event.projectId,
        {
          provider: event.provider,
          externalCheckoutId: event.externalCheckoutId,
          externalPaymentId: event.externalPaymentId
        }
      );
    }

    return NextResponse.json({ ok: true, duplicate: recorded.duplicate });
  } catch (error) {
    return errorResponse(error);
  }
}
