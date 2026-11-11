import type { Metadata } from 'next';
import LegalLayout, { LegalSection } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of service | Venture-Pro',
  description: 'The terms that apply when you use Venture-Pro.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of service">
      <LegalSection heading="1. About these terms">
        <p>
          These terms are a contract between you and Venture-Pro, run by Benjamin Rayner, a sole trader based at 6 Glynswood, Bucks, SL9 0DP, United Kingdom
          (“we”, “us”). By creating an account or using Venture-Pro, you agree to them. If you do not agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You must give accurate details and keep your password private. You are responsible for everything done through your account.
          Tell us straight away if you think someone else is using it.
        </p>
      </LegalSection>

      <LegalSection heading="3. What Venture-Pro does">
        <p>
          Venture-Pro helps you create, edit and publish websites, and take bookings and payments from your customers. The AI assistant can draft and change your content.
          We may improve, change or stop features, and we will tell you before any change that materially reduces what you pay for.
        </p>
      </LegalSection>

      <LegalSection heading="4. Plans and payment">
        <p>
          Paid plans are charged in advance on a monthly basis through Stripe, at the prices shown when you subscribe. Prices include VAT where it applies.
          You can cancel any time from your account. Cancelling stops the next payment; it does not refund the current period unless section 5 applies.
        </p>
        <p>
          Your customers’ payments to you through Stripe Connect go directly to your own Stripe account. We do not hold those funds. You must agree to Stripe’s terms when you set up payments.
        </p>
      </LegalSection>

      <LegalSection heading="5. Your right to cancel (consumers)">
        <p>
          If you are a consumer, you can cancel within 14 days of signing up or of a paid plan starting, and receive a full refund. If you asked us to start straight away,
          you can still cancel within 14 days, but you pay for the time you have used. Nothing in these terms takes away your rights under the Consumer Rights Act 2015 or the Consumer Contracts Regulations 2013.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your content">
        <p>
          You keep ownership of the content you put into Venture-Pro, including text, photos and files. You give us permission to store, process and display it only as needed to run the service for you,
          including sending it to our AI providers to answer your requests.
        </p>
        <p>
          You confirm that you have the right to use everything you upload, and that it does not infringe anyone else’s rights, including copyright and image rights.
        </p>
      </LegalSection>

      <LegalSection heading="7. AI-generated content">
        <p>
          The AI assistant writes drafts. You must check everything it produces before you publish it, especially prices, claims, opening times, reviews and any facts about your business.
          The output is not professional advice. We do not guarantee that it is accurate or suitable for your purpose.
        </p>
      </LegalSection>

      <LegalSection heading="8. Your websites and your customers">
        <p>
          You are the business behind each website you publish. You are responsible for what it says, for your prices and offers, for your own privacy notice and cookie notice, and for complying with consumer and trading law
          for sales, bookings and payments you take from your customers. We are not a party to any sale or booking between you and your customers.
        </p>
        <p>
          When visitors send you personal data through your site, you are the controller of that data. Venture-Pro acts as your processor: we handle it only to run your booking and enquiry features,
          keep it secure, and delete it when you delete your site or account, unless the law requires us to keep it. On request, we will sign a data processing agreement with you.
        </p>
      </LegalSection>

      <LegalSection heading="9. Acceptable use">
        <p>You must not use Venture-Pro to:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>break the law or publish unlawful content;</li>
          <li>send spam, or collect personal data without a lawful basis;</li>
          <li>make false or misleading claims about your business or others;</li>
          <li>impersonate anyone or copy another business’s site;</li>
          <li>try to break, overload or probe the service, or get around its limits.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </LegalSection>

      <LegalSection heading="10. Availability">
        <p>
          We work to keep the service running, but we do not promise it will always be available or error-free. We may need to pause it for maintenance or to fix problems.
        </p>
      </LegalSection>

      <LegalSection heading="11. Our liability">
        <p>
          We are responsible for losses that are a foreseeable result of our breach of these terms. We are not responsible for lost profits, lost business or indirect losses.
          Our total liability to you is limited to the fees you paid us in the 12 months before the claim, or £100 if you have paid nothing.
        </p>
        <p>
          Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that the law does not allow us to limit.
        </p>
      </LegalSection>

      <LegalSection heading="12. Ending the agreement">
        <p>
          You can close your account at any time. We can suspend or end your account if you break these terms, if you do not pay, or if we must do so by law.
          When an account ends, we will delete your content as described in the privacy policy.
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes to these terms">
        <p>
          We may update these terms. For material changes we will email you at least 30 days before they take effect. If you do not agree, you can close your account before then.
        </p>
      </LegalSection>

      <LegalSection heading="14. Law and disputes">
        <p>
          These terms are governed by the law of England and Wales. The courts of England and Wales have jurisdiction. If you are a consumer living in another part of the UK, you can also bring a case in your own home courts.
        </p>
      </LegalSection>

      <LegalSection heading="15. Contact">
        <p>
          Questions about these terms: <a className="underline" href="mailto:benrayner278@gmail.com">benrayner278@gmail.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
