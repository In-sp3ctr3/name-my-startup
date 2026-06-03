import type { Metadata } from "next";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import { LegalPage, PolicyCard } from "../legal-page";

export const metadata: Metadata = {
  title: "Refund Policy | Namelift",
  description: "Refund policy for Namelift's one-time Startup Naming Pack."
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Refunds"
      title="Refund Policy"
      intro={`Namelift sells a ${PRODUCT_OFFER.paidPassPriceLong} one-time digital Startup Naming Pack. This page explains when refunds may be available.`}
    >
      <PolicyCard title="Digital delivery">
        <p>
          The Startup Naming Pack is a digital product delivered inside the Namelift app. Delivery begins when your paid pack is unlocked and the product provides access to the larger generated-name set and evidence signals.
        </p>
      </PolicyCard>

      <PolicyCard title="When refunds are available">
        <p>We review refund requests submitted within 7 days of purchase when:</p>
        <ul>
          <li>You were charged more than once for the same pack by mistake.</li>
          <li>Your paid pack was not delivered and support cannot resolve the issue.</li>
          <li>A technical issue prevents access to the paid names and cannot be fixed within a reasonable time.</li>
          <li>A refund is required by applicable law or by the merchant of record/payment provider.</li>
        </ul>
      </PolicyCard>

      <PolicyCard title="When refunds may be declined">
        <p>
          Because the product is delivered digitally and includes generated output, purchases are generally final once the paid pack has been delivered and viewed, unless there is a duplicate charge, delivery failure, unresolved technical problem, or legal requirement.
        </p>
      </PolicyCard>

      <PolicyCard title="How to request a refund">
        <p>
          Email support@spectrallabshq.com with the account email used for purchase, approximate purchase time, and the reason for the request. When a refund is issued, it is returned to the original payment method through the payment provider or merchant of record.
        </p>
      </PolicyCard>
    </LegalPage>
  );
}
