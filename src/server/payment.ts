import type { ProjectPack } from "@/lib/types";

export type CheckoutSessionRequest = {
  checkoutIntentId: string;
  projectId: string;
  ownerUserId: string;
  amountCents: number;
  currency: "usd";
};

export type CheckoutSessionResult = {
  provider: ProjectPack["provider"];
  externalCheckoutId?: string;
  checkoutUrl?: string;
};

export type VerifiedWebhookEvent =
  | {
      type: "checkout.completed";
      provider: ProjectPack["provider"];
      externalEventId: string;
      externalCheckoutId?: string;
      externalPaymentId?: string;
      projectId: string;
    }
  | {
      type: "ignored";
      provider: ProjectPack["provider"];
      externalEventId: string;
    };

export interface PaymentGateway {
  provider: ProjectPack["provider"];
  isConfigured(): boolean;
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResult>;
  verifyWebhook(request: Request): Promise<VerifiedWebhookEvent>;
}

class DisabledPaymentGateway implements PaymentGateway {
  provider = "placeholder" as const;

  isConfigured() {
    return false;
  }

  async createCheckoutSession(): Promise<CheckoutSessionResult> {
    throw new Error("Payment provider is not configured.");
  }

  async verifyWebhook(): Promise<VerifiedWebhookEvent> {
    throw new Error("Payment provider is not configured.");
  }
}

export function getPaymentGateway(): PaymentGateway {
  return new DisabledPaymentGateway();
}
