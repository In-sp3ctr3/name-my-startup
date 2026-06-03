import type { Metadata } from "next";
import Link from "next/link";
import { ButtonRow, LegalPage, PolicyCard, legalStyles, supportEmail } from "../legal-page";

export const metadata: Metadata = {
  title: "Contact | Namelift",
  description: "Contact Namelift support for product, account, billing, privacy, or refund questions."
};

export default function ContactPage() {
  return (
    <LegalPage
      eyebrow="Contact"
      title="Contact Namelift"
      intro="Questions about the product, account access, billing, refunds, or privacy can be sent to the support inbox below."
    >
      <PolicyCard title="Support">
        <p>
          Email: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </p>
        <p>
          We aim to respond to support requests within 2 business days.
        </p>
        <p>
          Typical support topics include account access, paid pack delivery, billing questions, refund requests, privacy requests, and bug reports.
        </p>
        <p>
          Namelift is operated by SpectraLabsHQ as a digital SaaS product. We do not sell consulting, custom naming projects, agency services, or bespoke brand strategy packages through Namelift.
        </p>
        <ButtonRow>
          <Link className={`${legalStyles.button} ${legalStyles.buttonPrimary}`} href="/start">
            Try Namelift
          </Link>
          <Link className={legalStyles.button} href="/pricing">
            View pricing
          </Link>
        </ButtonRow>
      </PolicyCard>

      <PolicyCard title="Product summary">
        <p>
          Namelift generates startup name candidates and supporting evidence signals. The free preview provides 3 names once. The paid Launch Pack is a $5 one-time purchase that unlocks 50 generated names for one startup/project.
        </p>
      </PolicyCard>
    </LegalPage>
  );
}
