import type { Metadata } from 'next';
import LegalLayout, { LegalSection } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Cookie policy | Venture-Pro',
  description: 'The cookies and browser storage that Venture-Pro and the websites built with it use.',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie policy">
      <LegalSection heading="1. What this covers">
        <p>
          This policy explains how Venture-Pro uses cookies and similar technology (such as browser local storage), on this app and on the websites built with it.
        </p>
      </LegalSection>

      <LegalSection heading="2. The Venture-Pro app">
        <p>
          The app stores three items in your browser’s local storage: a sign-in token, your user ID and your name. They keep you signed in and show your name in the menu.
          They are strictly necessary to run the service you asked for, so we do not need your consent for them. They are removed when you log out.
        </p>
        <p>
          We do not use analytics, advertising or tracking cookies in the app.
        </p>
      </LegalSection>

      <LegalSection heading="3. Websites built with Venture-Pro">
        <p>Published websites use no analytics or advertising cookies from us. Some services used by those sites may set cookies or store data:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Booking forms</strong> use Cloudflare Turnstile to block automated sign-ups. Turnstile may set cookies that help it tell people from bots.
            It is needed for the form to work, so it is strictly necessary on those pages.
          </li>
          <li>
            <strong>Google Fonts</strong> is used for some site typefaces. Google receives visitors’ IP addresses when the fonts load, but Google Fonts does not set cookies.
          </li>
          <li>
            <strong>Stripe</strong> sets cookies on payment pages. These are needed to take payments and to prevent fraud.
          </li>
        </ul>
        <p>
          The owner of each site is responsible for the cookies on that site. If an owner adds analytics or marketing tools to their site, they must tell visitors and get consent where the law requires it.
        </p>
      </LegalSection>

      <LegalSection heading="4. Controlling cookies">
        <p>
          You can block or delete cookies in your browser settings. If you block storage for the Venture-Pro app, you will need to sign in again each time.
          Clearing your browser data also signs you out.
        </p>
      </LegalSection>

      <LegalSection heading="5. Changes">
        <p>
          If we add analytics, advertising or other non-essential cookies, we will update this policy first and ask for your consent before they are set.
        </p>
      </LegalSection>

      <LegalSection heading="6. Contact">
        <p>
          Questions about cookies: <a className="underline" href="mailto:benrayner278@gmail.com">benrayner278@gmail.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
