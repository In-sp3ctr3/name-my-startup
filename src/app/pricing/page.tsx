import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_OFFER } from "@/lib/product-offer";
import { ButtonRow, LegalPage, PolicyCard, legalStyles } from "../legal-page";

export const metadata: Metadata = {
  title: "Pricing | Namelift",
  description: "Namelift pricing: 3 free startup names once, then a $5 one-time Launch Pack with 50 names and evidence checks."
};

export default function PricingPage() {
  return (
    <LegalPage
      eyebrow="Pricing"
      title="Simple pricing for startup names."
      intro={`Try Namelift with ${PRODUCT_OFFER.freeNameCount} free names for your first startup. When you want the full shortlist, unlock a ${PRODUCT_OFFER.paidPassPriceLong} one-time Launch Pack for ${PRODUCT_OFFER.paidNameCount} names.`}
    >
      <section className={legalStyles.priceGrid} aria-label="Namelift pricing plans">
        <article className={legalStyles.priceCard}>
          <h2>{PRODUCT_OFFER.freeDraftName}</h2>
          <div className={legalStyles.priceLine}>
            <strong>$0</strong>
            <span>first startup only</span>
          </div>
          <ul>
            <li>{PRODUCT_OFFER.freeNameCount} AI-generated startup name candidates.</li>
            <li>Basic name fit and evidence signals.</li>
            <li>No credit card required.</li>
            <li>One free preview per user or anonymous session.</li>
          </ul>
          <ButtonRow>
            <Link className={legalStyles.button} href="/start">
              Start free
            </Link>
          </ButtonRow>
        </article>

        <article className={`${legalStyles.priceCard} ${legalStyles.priceCardFeatured}`}>
          <h2>{PRODUCT_OFFER.paidPassName}</h2>
          <div className={legalStyles.priceLine}>
            <strong>{PRODUCT_OFFER.paidPassPrice}</strong>
            <span>one-time</span>
          </div>
          <ul>
            <li>{PRODUCT_OFFER.paidNameCount} AI-generated startup name candidates for one startup/project.</li>
            <li>Domain, social, web, and trademark evidence signals where available.</li>
            <li>{PRODUCT_OFFER.checkedRecommendationCount} checked recommendation slots.</li>
            <li>No subscription and no recurring charge.</li>
          </ul>
          <ButtonRow>
            <Link className={`${legalStyles.button} ${legalStyles.buttonPrimary}`} href="/checkout/launch-pack">
              {PRODUCT_OFFER.paidPassCtaWithPrice}
            </Link>
          </ButtonRow>
        </article>
      </section>

      <PolicyCard title="What you are buying">
        <p>
          Namelift is a digital SaaS tool that generates and organizes startup name candidates. The paid Launch Pack unlocks a larger shortlist and evidence signals for a single startup idea. It is not a subscription, agency engagement, legal service, trademark legal review service, domain brokerage service, or consulting package.
        </p>
      </PolicyCard>

      <PolicyCard title="Availability notes">
        <p>
          Domain, social, web, and trademark signals are evidence aids, not guarantees. Third-party availability can change at any time, and final legal, trademark, and brand clearance decisions remain your responsibility.
        </p>
      </PolicyCard>
    </LegalPage>
  );
}
