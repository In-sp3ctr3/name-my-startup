import type { Metadata } from "next";
import { LegalPage, PolicyCard } from "../legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Namelift",
  description: "Privacy Policy for Namelift, an AI-assisted startup naming tool."
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what Namelift collects, why it is used, and how to contact us about your data."
    >
      <PolicyCard title="1. Information we collect">
        <p>Depending on how you use Namelift, we may collect:</p>
        <ul>
          <li>Account details such as email address and authentication identifiers.</li>
          <li>Anonymous session identifiers used to enforce the free-preview limit.</li>
          <li>Startup briefs, preferences, generated names, saved names, reports, and project history.</li>
          <li>Billing metadata such as purchase status, product purchased, timestamps, and payment provider references.</li>
          <li>Technical data such as IP-derived rate-limit keys, device/browser information, logs, and error diagnostics.</li>
        </ul>
      </PolicyCard>

      <PolicyCard title="2. How we use information">
        <p>We use information to provide the product, generate and save name results, enforce free-preview and payment rules, prevent abuse, provide support, improve reliability, and comply with legal or payment-provider obligations.</p>
      </PolicyCard>

      <PolicyCard title="3. AI and evidence providers">
        <p>
          Startup briefs and related project context may be sent to AI model providers to generate names and supporting notes. Name candidates may also be checked against third-party evidence sources for domain, social, web, and trademark signals. These providers process data according to their own terms and policies.
        </p>
      </PolicyCard>

      <PolicyCard title="4. Payments">
        <p>
          Payment details are handled by the payment provider or merchant of record shown at checkout. Namelift does not store full payment card numbers. We may store purchase metadata required to unlock paid access, provide support, and reconcile billing events.
        </p>
      </PolicyCard>

      <PolicyCard title="5. Cookies and local storage">
        <p>
          Namelift may use cookies, local storage, and similar technologies for authentication, anonymous preview limits, saved drafts, UI preferences, security, and product functionality.
        </p>
      </PolicyCard>

      <PolicyCard title="6. Sharing">
        <p>
          We do not sell personal information. We may share information with service providers that help operate Namelift, including hosting, database, authentication, AI, analytics or diagnostics, payment, and support providers. We may also disclose information if required by law or to protect the service and users.
        </p>
      </PolicyCard>

      <PolicyCard title="7. Data choices">
        <p>
          You can request access, correction, or deletion of account-related data by contacting support@spectrallabshq.com. Some billing, security, or compliance records may need to be retained where required by law, fraud prevention, dispute handling, or payment-provider obligations.
        </p>
      </PolicyCard>

      <PolicyCard title="8. Contact">
        <p>
          Privacy questions can be sent to support@spectrallabshq.com.
        </p>
      </PolicyCard>
    </LegalPage>
  );
}
