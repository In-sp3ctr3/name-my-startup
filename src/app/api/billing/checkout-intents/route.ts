import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getPaymentGateway } from "@/server/payment";
import { assertRateLimit, createCheckoutIntent } from "@/server/store";

const checkoutIntentRequestSchema = z.object({
  projectId: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const actor = await getCurrentActor();
    await assertRateLimit(actor, "billing:checkout", 6, 60_000);
    const body = checkoutIntentRequestSchema.parse(await request.json());
    const gateway = getPaymentGateway();
    const intent = await createCheckoutIntent(actor, body.projectId, gateway.isConfigured() ? "created" : "provider_unconfigured");
    if (!intent) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });

    if (!gateway.isConfigured()) {
      return NextResponse.json(
        {
          checkoutIntent: intent,
          error: "Payment provider is not configured.",
          code: "payment_provider_not_configured"
        },
        { status: 503 }
      );
    }

    const checkout = await gateway.createCheckoutSession({
      checkoutIntentId: intent.id,
      projectId: intent.projectId,
      ownerUserId: actor.userId,
      amountCents: intent.amountCents,
      currency: intent.currency
    });
    return NextResponse.json({ checkoutIntent: intent, checkout });
  } catch (error) {
    return errorResponse(error);
  }
}
