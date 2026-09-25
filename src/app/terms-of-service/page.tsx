import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SUPERKEY",
  description: "Terms of Service for the SUPERKEY WhatsApp Business API platform.",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service — SUPERKEY</h1>
      <p className="text-sm text-slate-500 mb-1">Effective Date: July 29, 2026</p>
      <p className="text-sm text-slate-500 mb-8">
        Website:{" "}
        <a href="https://superkey-app.vercel.app/" className="text-blue-600 underline">
          https://superkey-app.vercel.app/
        </a>
      </p>

      <p className="mb-10 leading-relaxed">
        Please read these Terms of Service (&quot;Terms&quot;) carefully before using the SUPERKEY
        platform (&quot;Service&quot;), operated by SUPERKEY (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;). By accessing or using the Service, you agree to be bound by these Terms. If
        you do not agree, do not use the Service.
      </p>

      <Section title="1. Overview of the Service">
        <p className="mb-4 leading-relaxed">
          SUPERKEY is a business-to-business (B2B) SaaS platform that enables businesses to
          connect to the <strong>WhatsApp Cloud API</strong> (provided by Meta) to send and
          receive messages, automate customer conversations, manage chat logs, and communicate
          with their end customers via WhatsApp.
        </p>
        <p className="leading-relaxed">
          SUPERKEY is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or
          WhatsApp Inc., except as a Technology Provider operating within Meta&apos;s Platform
          Terms.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p className="mb-3 leading-relaxed">
          The Service is intended solely for use by businesses and authorized business
          representatives (&quot;Business Users&quot;). By using SUPERKEY, you represent that:
        </p>
        <List
          items={[
            "You are at least 18 years old and legally authorized to bind your business to these Terms.",
            <>
              Your use of WhatsApp Business messaging complies with the{" "}
              <a
                href="https://www.whatsapp.com/legal/business-policy/"
                className="text-blue-600 underline"
              >
                WhatsApp Business Messaging Policy
              </a>{" "}
              and Meta&apos;s Platform Terms.
            </>,
            "All information you provide during registration is accurate and current.",
          ]}
        />
      </Section>

      <Section title="3. Account Registration">
        <List
          items={[
            "You must create an account and connect your Facebook Business account and WhatsApp Business Account to use core features of the Service.",
            "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.",
            "You must notify us immediately of any unauthorized use of your account.",
          ]}
        />
      </Section>

      <Section title="4. Facebook Login & WhatsApp Cloud API Integration">
        <p className="mb-4 leading-relaxed">
          By connecting your Facebook account via Facebook Login, you authorize SUPERKEY to
          access certain data and permissions (e.g., WhatsApp Business Account management,
          messaging) strictly to operate the Service on your behalf. You may revoke this access
          at any time via your Facebook account settings, which will disable related
          functionality within SUPERKEY.
        </p>
        <p className="leading-relaxed">
          You are responsible for ensuring that your use of the WhatsApp Cloud API through
          SUPERKEY — including message content, templates, and opt-in practices — complies with
          Meta&apos;s and WhatsApp&apos;s policies. SUPERKEY is not liable for suspension or
          restriction of your WhatsApp Business Account by Meta due to policy violations on your
          part.
        </p>
      </Section>

      <Section title="5. Client Chat Logs & Customer Data">
        <p className="mb-3 leading-relaxed">
          As a Business User, you may upload, receive, or generate chat logs and customer data
          (including your end customers&apos; WhatsApp numbers and message content) through the
          Service. You represent and warrant that:
        </p>
        <List
          items={[
            "You have obtained all necessary consents from your end customers to communicate with them via WhatsApp and to process their data through SUPERKEY.",
            "You will comply with applicable data protection laws regarding your customers' data.",
          ]}
        />
        <p className="mt-4 leading-relaxed">
          SUPERKEY acts as a data processor/technology provider for such chat logs and processes
          them solely to deliver the Service.
        </p>
      </Section>

      <Section title="6. Acceptable Use">
        <p className="mb-3 leading-relaxed">You agree not to use SUPERKEY to:</p>
        <List
          items={[
            "Send unsolicited, spam, or bulk unauthorized messages in violation of WhatsApp's messaging policies.",
            "Transmit unlawful, defamatory, obscene, or fraudulent content.",
            "Attempt to reverse-engineer, disrupt, or gain unauthorized access to the Service or connected Meta APIs.",
            "Violate any applicable law or third-party rights, including Meta's Platform Terms and Developer Policies.",
          ]}
        />
        <p className="mt-4 leading-relaxed">
          We reserve the right to suspend or terminate accounts that violate this section.
        </p>
      </Section>

      <Section title="7. Fees & Payment">
        <p className="leading-relaxed">
          If SUPERKEY offers paid plans, applicable fees, billing cycles, and payment terms will
          be presented at the time of purchase or in a separate pricing agreement. Fees are
          non-refundable except as required by law or expressly stated otherwise.
        </p>
      </Section>

      <Section title="8. Intellectual Property">
        <p className="leading-relaxed">
          All rights, title, and interest in the SUPERKEY platform, including software, design,
          and branding, remain the exclusive property of SUPERKEY. These Terms do not grant you
          any ownership rights in the Service, only a limited, non-exclusive, non-transferable
          license to use it for your business purposes.
        </p>
      </Section>

      <Section title="9. Service Availability">
        <p className="leading-relaxed">
          We strive to keep the Service available and reliable but do not guarantee
          uninterrupted access. The Service depends on third-party infrastructure (including
          Meta&apos;s WhatsApp Cloud API), and SUPERKEY is not responsible for outages, rate
          limits, or policy changes imposed by Meta.
        </p>
      </Section>

      <Section title="10. Termination">
        <p className="leading-relaxed">
          We may suspend or terminate your access to the Service at any time for violation of
          these Terms, non-payment, or misuse of WhatsApp/Meta integrations. You may terminate
          your account at any time by contacting us or disconnecting your Facebook/WhatsApp
          integration. Upon termination, your data will be handled per our Privacy Policy&apos;s
          Data Deletion Policy.
        </p>
      </Section>

      <Section title="11. Disclaimer of Warranties">
        <p className="leading-relaxed">
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
          kind, express or implied, including merchantability, fitness for a particular purpose,
          and non-infringement.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p className="leading-relaxed">
          To the maximum extent permitted by law, SUPERKEY shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the Service,
          including any suspension or restriction of your WhatsApp Business Account by Meta.
        </p>
      </Section>

      <Section title="13. Changes to These Terms">
        <p className="leading-relaxed">
          We may update these Terms from time to time. Continued use of the Service after
          changes constitutes acceptance of the revised Terms.
        </p>
      </Section>

      <Section title="14. Governing Law">
        <p className="leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of India,
          without regard to conflict-of-law principles.
        </p>
      </Section>

      <Section title="15. Contact Us">
        <p className="leading-relaxed">For questions about these Terms, contact:</p>
        <p className="mt-2">
          Email:{" "}
          <a href="mailto:ayushrajayushhh@gmail.com" className="text-blue-600 underline">
            ayushrajayushhh@gmail.com
          </a>
          <br />
          Website:{" "}
          <a href="https://superkey-app.vercel.app/" className="text-blue-600 underline">
            https://superkey-app.vercel.app/
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4 border-b border-slate-200 pb-2">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mb-4 space-y-2 pl-6 list-disc">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}
