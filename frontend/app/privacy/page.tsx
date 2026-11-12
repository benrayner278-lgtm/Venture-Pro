import type { Metadata } from 'next';
import LegalLayout, { LegalSection } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy policy | Venture-Pro',
  description: 'How Venture-Pro collects, uses and protects personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy">
      <LegalSection heading="1. Who we are">
        <p>
          Venture-Pro is run by Benjamin Rayner, a sole trader based at 6 Glynswood, Bucks, SL9 0DP, United Kingdom.
          For anything about this policy or your personal data, email <a className="underline" href="mailto:benrayner278@gmail.com">benrayner278@gmail.com</a>.
        </p>
        <p>
          For the personal data of your own customers (for example, people who book through your website), you are the controller and we act as your processor.
          Section 5 explains this.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we collect">
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Account details:</strong> your name, email address and a password, stored only as a secure hash.</li>
          <li><strong>Your business content:</strong> site text, photos, logos, files you upload, and the messages you send to the assistant.</li>
          <li><strong>Booking and enquiry details</strong> that visitors send through your site: name, email, phone number and notes.</li>
          <li><strong>Payment setup:</strong> when you connect Stripe, Stripe collects your bank and identity details. We receive only the status of your account (for example, whether payments are enabled). We do not store your card or bank numbers.</li>
          <li><strong>Technical data:</strong> IP address, browser type and the times you use the service, used for security, to stop abuse and to keep the service running.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Why we use it and our legal basis">
        <ul className="list-disc space-y-2 pl-6">
          <li>To provide the service you sign up for, including building, publishing and running your sites (contract).</li>
          <li>To keep the service secure, prevent fraud and abuse, and improve it (legitimate interests).</li>
          <li>To keep tax and accounting records, and to meet other legal duties (legal obligation).</li>
          <li>To send you service emails, such as booking confirmations and account messages (contract and legitimate interests). We do not send marketing email without your consent.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Who we share it with">
        <p>We use these service providers. Each one processes data only to provide its service to us.</p>
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Railway:</strong> hosting for the Venture-Pro app and database.</li>
          <li><strong>Cloudflare:</strong> hosting and domain routing for published sites, and the Turnstile bot check on booking forms.</li>
          <li><strong>Stripe:</strong> payments and payouts.</li>
          <li><strong>Resend:</strong> sending service and booking emails.</li>
          <li><strong>Anthropic:</strong> the AI assistant and site generation. The text, photos and files you send to the assistant are processed by Anthropic to answer you.</li>
          <li><strong>Pixabay:</strong> searches for stock photos. The search words you use for a site are sent to Pixabay.</li>
          <li><strong>Google Fonts:</strong> published sites load their fonts from Google, which receives visitors&apos; IP addresses.</li>
        </ul>
        <p>Some of these providers are based outside the UK. Where data leaves the UK, we rely on approved safeguards such as the UK International Data Transfer Addendum or adequacy regulations.</p>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection heading="5. Your customers’ data">
        <p>
          When a visitor books or enquires through your website, the details they give go to you. You decide how to use them and are responsible for them under UK GDPR.
          We store and process those details on your behalf, only to run your booking system and send the emails you have chosen.
        </p>
        <p>
          You must give your customers your own privacy notice, and you must be able to answer requests from them. Our data processing terms for this are set out in the terms of service.
        </p>
      </LegalSection>

      <LegalSection heading="6. How long we keep data">
        <p>
          We keep your account and your site content for as long as your account is open. When you delete your account, we delete your content and personal data within 30 days,
          except where we must keep records for tax or legal reasons. Backups are overwritten on a rolling basis.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>Under UK GDPR you can ask us to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>give you a copy of your personal data;</li>
          <li>correct data that is wrong;</li>
          <li>delete your data in some cases;</li>
          <li>limit how we use it or object to it;</li>
          <li>give you your data in a portable form.</li>
        </ul>
        <p>
          Email us to use these rights. We will reply within one month. You can also complain to the Information Commissioner’s Office at{' '}
          <a className="underline" href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          We use encryption in transit (HTTPS), hashed passwords, access controls and a rate limit on public forms. No system is perfectly secure, so please use a strong, unique password.
        </p>
      </LegalSection>

      <LegalSection heading="9. Cookies">
        <p>See our <a className="underline" href="/cookies">cookie policy</a>.</p>
      </LegalSection>

      <LegalSection heading="10. Children">
        <p>Venture-Pro is for business owners aged 18 or over. We do not knowingly collect data from children.</p>
      </LegalSection>

      <LegalSection heading="11. Changes">
        <p>If we change this policy, we will update the date at the top and tell account holders by email when the change is material.</p>
      </LegalSection>
    </LegalLayout>
  );
}
