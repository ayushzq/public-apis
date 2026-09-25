import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SUPERKEY",
  description: "Privacy Policy for the SUPERKEY WhatsApp Business API platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy — SUPERKEY</h1>
      <p className="text-sm text-slate-500 mb-1">Effective Date: July 29, 2026</p>
      <p className="text-sm text-slate-500 mb-8">
        Website:{" "}
        <a href="https://superkey-app.vercel.app/" className="text-blue-600 underline">
          https://superkey-app.vercel.app/
        </a>
      </p>

      <p className="mb-6 leading-relaxed">
        SUPERKEY (&quot;SUPERKEY,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a
        business-to-business (B2B) WhatsApp Business API management platform that enables
        businesses (&quot;Business Users,&quot; &quot;you,&quot; or &quot;your account holders&quot;) to
        communicate with their customers via WhatsApp. This Privacy Policy explains how we
        collect, use, disclose, and protect information when you use our website and services
        (collectively, the &quot;Service&quot;).
      </p>
      <p className="mb-10 leading-relaxed">
        By accessing or using SUPERKEY, you agree to the collection and use of information in
        accordance with this Privacy Policy. If you do not agree, please do not use the Service.
      </p>

      <Section title="1. Information We Collect">
        <SubHeading>1.1 Account Information</SubHeading>
        <List items={["Full name", "Email address", "Business/organization details provided at signup"]} />

        <SubHeading>1.2 WhatsApp Business Data</SubHeading>
        <List
          items={[
            "WhatsApp Business phone numbers connected to your SUPERKEY account",
            "Business profile information registered with WhatsApp",
          ]}
        />

        <SubHeading>1.3 Client Chat Logs</SubHeading>
        <p className="mb-4 leading-relaxed">
          Messages, media, and metadata exchanged between your business and your customers
          through the WhatsApp Cloud API, as routed and stored via SUPERKEY, for the purpose of
          enabling conversation history, chatbot automation, and customer relationship features.
        </p>

        <SubHeading>1.4 Facebook Login Credentials</SubHeading>
        <p className="mb-4 leading-relaxed">
          When you connect your Facebook Business account to authorize WhatsApp Business API
          access, we receive limited authentication tokens and profile information via Facebook
          Login (e.g., Facebook User ID, name, email, and permissions you grant). We do{" "}
          <strong>not</strong> store your Facebook password — authentication is handled entirely
          by Meta&apos;s OAuth system.
        </p>

        <SubHeading>1.5 Technical &amp; Usage Data</SubHeading>
        <p className="leading-relaxed">
          IP address, browser type, device identifiers, log data, and usage analytics collected
          automatically when you use the Service.
        </p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p className="mb-3">We use collected information to:</p>
        <List
          ordered
          items={[
            "Provide, operate, and maintain the SUPERKEY platform.",
            "Authenticate your account via Facebook Login and connect your WhatsApp Business Account.",
            "Enable message sending, receiving, automation, and chat management through the WhatsApp Cloud API.",
            "Store and display client chat logs within your account dashboard.",
            "Communicate with you regarding your account, updates, and support requests.",
            "Monitor, secure, and improve the Service, including fraud and abuse prevention.",
            "Comply with legal obligations and Meta Platform Terms / WhatsApp Business Policy requirements.",
          ]}
        />
        <p className="mt-4 leading-relaxed">
          We do <strong>not</strong> sell your personal data or your customers&apos; data to third
          parties.
        </p>
      </Section>

      <Section title="3. Third-Party Services">
        <p className="mb-3 leading-relaxed">
          SUPERKEY integrates with the following third-party platforms to deliver its Service:
        </p>
        <List
          items={[
            "Meta Facebook Graph API — used for Facebook Login authentication and management of connected Business assets.",
            "WhatsApp Cloud API (Meta) — used to send and receive WhatsApp messages on behalf of Business Users.",
          ]}
        />
        <p className="mt-4 leading-relaxed">
          Data shared with Meta/WhatsApp is governed additionally by{" "}
          <a href="https://www.facebook.com/privacy/policy/" className="text-blue-600 underline">
            Meta&apos;s Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="https://www.whatsapp.com/legal/business-data-processing-terms"
            className="text-blue-600 underline"
          >
            WhatsApp Business Data Processing Terms
          </a>
          . SUPERKEY acts as a Business Solution Provider (BSP)/Technology Provider and processes
          data strictly to deliver the Service to Business Users, in compliance with Meta&apos;s
          Platform Terms, Developer Policies, and WhatsApp Business Messaging Policy.
        </p>
        <p className="mt-4 leading-relaxed">
          We do not use data obtained through Facebook Login or the WhatsApp Cloud API for any
          purpose other than providing and improving the Service, and we do not use such data for
          advertising purposes.
        </p>
      </Section>

      <Section title="4. Data Storage & Security">
        <List
          items={[
            "Data is stored on secure cloud infrastructure with encryption in transit (TLS) and access controls.",
            "Access to client chat logs and personal data is restricted to authorized personnel and automated systems necessary to operate the Service.",
            "We retain data only as long as necessary to provide the Service or as required by law, or until a deletion request is honored under Section 6.",
          ]}
        />
      </Section>

      <Section title="5. Your Rights">
        <p className="mb-3 leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
        <List
          items={[
            "Access the personal data we hold about you.",
            "Correct inaccurate data.",
            "Request deletion of your data (see Section 6).",
            "Object to or restrict certain processing.",
            "Data portability, where applicable.",
          ]}
        />
        <p className="mt-4 leading-relaxed">
          To exercise these rights, contact us at{" "}
          <a href="mailto:ayushrajayushhh@gmail.com" className="text-blue-600 underline">
            ayushrajayushhh@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title="6. Data Deletion Policy">
        <p className="mb-4 leading-relaxed">
          In compliance with Meta&apos;s Platform Terms and Developer Policies, SUPERKEY provides a
          clear mechanism for users to request the deletion of their data.
        </p>

        <SubHeading>6.1 How to Request Data Deletion</SubHeading>
        <p className="mb-3 leading-relaxed">
          Any user (Business User or an end customer whose data was processed through our
          WhatsApp integration) may request deletion of their personal data by:
        </p>
        <List
          ordered
          items={[
            <>
              Sending an email to{" "}
              <a href="mailto:ayushrajayushhh@gmail.com" className="text-blue-600 underline">
                ayushrajayushhh@gmail.com
              </a>{" "}
              with the subject line &quot;Data Deletion Request,&quot; including the account email
              address, connected WhatsApp Business number, and/or Facebook User ID associated with
              the data.
            </>,
            <>
              Alternatively, if you connected via Facebook Login, you may remove SUPERKEY&apos;s
              access directly from your Facebook account settings at{" "}
              <strong>Facebook Settings → Apps and Websites → SUPERKEY → Remove</strong>. This
              revokes SUPERKEY&apos;s access tokens immediately.
            </>,
          ]}
        />

        <SubHeading>6.2 What Happens After a Request</SubHeading>
        <p className="mb-3 leading-relaxed">
          Upon receiving a verified deletion request, SUPERKEY will:
        </p>
        <List
          items={[
            "Delete or anonymize the requester's account information, authentication tokens, and associated chat logs from our active systems within 30 days.",
            "Confirm completion of the deletion via email to the requester.",
            "Retain minimal records only where required for legal, tax, security, or fraud-prevention obligations, and delete such records once the retention obligation lapses.",
          ]}
        />

        <SubHeading>6.3 Automated Deletion Callback (Facebook App Review)</SubHeading>
        <p className="leading-relaxed">
          For the purposes of Meta&apos;s Data Deletion Callback requirement, SUPERKEY processes
          deletion signals received from Meta when a user removes the app via Facebook, and will
          delete the corresponding user&apos;s stored data within 30 days of receiving such a
          signal, consistent with Section 6.2 above.
        </p>
      </Section>

      <Section title="7. Children's Privacy">
        <p className="leading-relaxed">
          SUPERKEY is a B2B service intended for business use only. We do not knowingly collect
          data from individuals under 18 years of age.
        </p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p className="leading-relaxed">
          We may update this Privacy Policy from time to time. Material changes will be posted on
          this page with an updated &quot;Effective Date.&quot; Continued use of the Service after
          changes constitutes acceptance.
        </p>
      </Section>

      <Section title="9. Contact Us">
        <p className="leading-relaxed">
          If you have questions about this Privacy Policy or wish to exercise your data rights,
          contact:
        </p>
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

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-5 mb-2">{children}</h3>;
}

function List({
  items,
  ordered = false,
}: {
  items: React.ReactNode[];
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`mb-4 space-y-2 pl-6 ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {item}
        </li>
      ))}
    </Tag>
  );
}
