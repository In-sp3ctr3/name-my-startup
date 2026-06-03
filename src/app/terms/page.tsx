import type { Metadata } from "next";
import { LegalPage, PolicyCard } from "../legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Namelift",
  description: "Terms of Service for Namelift, an AI-assisted startup naming tool."
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms explain how Namelift may be used and what customers receive when using the product."
    >
      <PolicyCard title="1. The product">
        <p>
          Namelift is a digital product that helps users generate, compare, save, and review startup name candidates. The product may include AI-generated name ideas, confidence notes, domain signals, social handle signals, web evidence, and trademark-related evidence indicators.
        </p>
        <p>
          Namelift does not provide legal advice, trademark legal review, business formation advice, domain brokerage, or professional consulting services. You are responsible for final review before adopting, registering, purchasing, or publicly using any name.
        </p>
      </PolicyCard>

      <PolicyCard title="2. Accounts and eligibility">
        <p>
          You may use the free preview without creating an account. Some features, including saved history and paid access, may require account authentication. You are responsible for keeping your account credentials secure and for activity under your account.
        </p>
      </PolicyCard>

      <PolicyCard title="3. Free preview and paid pack">
        <p>
          Namelift provides one free startup preview with 3 generated names. After the free preview, the paid Startup Naming Pack is a one-time digital purchase that unlocks 50 generated names and available evidence checks for one startup/project. There is no subscription and no automatic renewal.
        </p>
      </PolicyCard>

      <PolicyCard title="4. Acceptable use">
        <p>You agree not to use Namelift to:</p>
        <ul>
          <li>Generate or promote unlawful, deceptive, abusive, infringing, or harmful content.</li>
          <li>Misrepresent evidence signals as legal clearance or guaranteed availability.</li>
          <li>Attempt to bypass free-preview limits, paywalls, security controls, or rate limits.</li>
          <li>Reverse engineer, scrape, overload, or interfere with the service.</li>
        </ul>
      </PolicyCard>

      <PolicyCard title="5. AI output and third-party signals">
        <p>
          AI-generated names and evidence checks may be incomplete, inaccurate, unavailable, or become outdated. A positive signal does not guarantee that a domain, handle, company name, or trademark is available or suitable for your use. You should perform your own diligence and consult qualified professionals when needed.
        </p>
      </PolicyCard>

      <PolicyCard title="6. Payments">
        <p>
          Paid purchases are processed by the payment provider or merchant of record shown at checkout. Namelift does not store full card numbers. Taxes, payment methods, and receipts may be handled by the payment provider or merchant of record.
        </p>
      </PolicyCard>

      <PolicyCard title="7. Service changes and availability">
        <p>
          We may update, improve, suspend, or discontinue parts of Namelift. We aim to keep paid digital access available, but we do not guarantee uninterrupted service or that third-party checks will always be available.
        </p>
      </PolicyCard>

      <PolicyCard title="8. Contact">
        <p>
          Questions about these terms, accounts, or purchases can be sent to support@spectrallabshq.com.
        </p>
      </PolicyCard>
    </LegalPage>
  );
}
