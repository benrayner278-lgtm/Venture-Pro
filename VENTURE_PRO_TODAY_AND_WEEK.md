# Venture-Pro: What to tackle today and this week

Last updated: 2026-11-04

## Done since 2 November
- Cloudflare for SaaS: fallback origin `fallback.venture-pro.io` is Active.
- Workers Routes: `*/*` and `*.venture-pro.io/*` go to `venture-pro-sites`; `venture-pro.io/*` is off the Worker. Main site checked and still loads.
- Website builder: a failed page build is retried once (merged `2e36a0b`). The real cause was an invalid `ANTHROPIC_API_KEY` on Railway, now fixed.
- Website builder: edits save to the server and reopen on return; portfolio is back for page-format sites (merged `a336aea`). Not yet tested on production.
- Password reset by email (merged `98f58b5`). Production database updated. Tested end to end and working.
- Domain page: "Not connected yet" shows in amber (merged `a98a07f`).
- Railway `FRONTEND_URL` set to `https://www.venture-pro.io`.

---

## Today (4 November)
- [ ] **Rotate the Postgres password** in Railway. The old one appeared in screenshots. Redeploy the backend and check sign-in still works.
- [ ] **Test save-on-navigate and portfolio on production.** Generate a page, edit it, go to Billing and back, and check the edit is still there. On a page-format site, add a portfolio item and press "Add portfolio to my page".
- [ ] **Clean up local testing.** Stop the local servers on ports 3100 and 3101. Remove local test accounts (`domain-ui@example.com`, `jerry278@gmail.com`, `reset-check@example.com`).

---

## This week (to 8 November)

### Custom domains (raynersystems.com)
- [ ] Get a new verification code from Namecheap (the June one has expired). Confirm the domain shows as verified and its nameservers are back to normal.
- [ ] Check the Namecheap Advanced DNS records before changing anything: MX and SPF records must stay as they are.
- [ ] Add the TXT record (`_venture-pro`) and the `www` CNAME (`sites.venture-pro.io`) from the Domain page, then press Check now.
- [ ] Confirm the Cloudflare custom hostname is created and `https://www.raynersystems.com` loads the site.
- [ ] Decide whether the bare domain should also work, and redirect `www` or the reverse. Bare domain needs an ALIAS or ANAME record.

### Website builder
- [ ] Production logo error: check whether "Could not create the logo" still happens. If it does, send the Railway `Generate logo error` lines.
- [ ] Contact details on page-format sites are still hidden. Decide whether to add them.

### Stock photos
- [ ] Pixabay full-access reply. When approved, add `PIXABAY_API_KEY` to `backend/.env` and Railway, then generate a test page and confirm photos appear.

### Booking
- [ ] Live booking test on venture-pro.io: book, check both emails arrive, confirm the calendar invite.

### Account
- [ ] Change your account plan from `professional` to the plan you want. (It maps to Premium today.)

---

## Launch checklist (before going live to customers)

### Must do
- [ ] Legal pages reviewed (terms, privacy, cookies).
- [x] Password reset email working through Resend. Tested 4 November.
- [ ] Turnstile (bot protection) on the contact form.
- [ ] Stripe live-mode check: webhooks, test card flow, plan changes.
- [ ] Rotate the Postgres password (today) and the Stripe test key (both were exposed in earlier chats).
- [ ] Free-plan limits confirmed (chat messages, previews, no HTML download).
- [ ] Custom domains tested with a real domain before launch (see above).

### Should do
- [ ] Analytics added to the landing page and app.
- [ ] Cost per website build measured, so pricing is safe.
- [ ] Desktop check of the page format and the eight-brief quality check.

---

## Open items
- **Analytics spreadsheet:** not found on this Mac. Need to know what it tracked. The only workbook is `venture-pro-revenue-model.xlsx`.
- **Uncommitted files in the repo root:** this planning file, `build_revenue_model.py`, the HTML pages and the revenue workbook. Not yet committed.
- `VENTURE_PRO_PROGRESS.md` is out of date. Use this file instead.

## Open decisions for you
- Which plan should your own account be on?
- Should `www` redirect to a bare domain, or should both be served?
- When should custom domains go live to customers: after the real-domain test, or after the full launch checklist?
