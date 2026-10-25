# SolarWake — live demo site

**Revenue recovery for solar installers: quotes that went quiet, and invoices that haven't been paid.**
SolarWake follows up over email or WhatsApp, books advisor calls, chases payments politely, and keeps a
ledger your accountant can filter by any period. Messages come from **built-in templates**, and replies are
understood with **keyword rules**, so the demo runs for free with no paid AI (see *Optional: Claude* below).

The site opens on a public **landing page** (light theme, EN/DE, accessible: skip link, focus outlines,
WCAG-contrast buttons, reduced-motion support). **Try the live demo** / **Sign in** opens the app (`/#app`):

| Tab | Who it's for | What it shows |
|---|---|---|
| **Leads** (B2B) | The solar company (SolarWake's paying customer) | Pipeline KPIs, funnel, one-click campaign across cold leads, email/WhatsApp agent that answers objections (price, competitor, savings/ROI, CFO sign-off, cash flow, timing), advisor handoff brief, live activity feed, ROI calculator |
| **Invoices** (B2B) | The installer's back office | Outstanding / overdue / days-to-pay KPIs, unpaid-by-age chart, a reminder schedule that gets firmer (heads-up → due today → polite → firm → final notice, each step can be switched off), reminders sent as real emails, automatic handling of replies ("already paid", instalments, problem with the installation, promised date) which pauses reminders |
| **Transactions** | The installer's accountant | Every payment in and out (customer payments, invoices, supplier bills, refunds) with a calendar range picker, quick periods, **calendar settings** (financial-year start, week start, date format), filters (installer, direction, type, search), a **missing documents** filter with "request" button, and CSV export |
| **Customer Page** (B2C) | The installer's lead | Personal savings & payback, battery option, financing, price-lock deadline, self-serve booking |
| **Pay Page** (B2C) | The installer's customer | Invoice details, pay by card / bank transfer / 3 instalments (homeowners), report a problem. Test payments only; no money moves |

Links in real emails open the right page directly: `/?p=C-1006` (quote page) and `/?i=INV-2026-0102` (pay page).

Every lead is handled by its own **playbook**:
- 🏠 **Homeowner (B2C):** friendly tone, bill savings, financing, price-lock deadline.
- 🏢 **Business (B2B):** professional tone, ROI and payback, depreciation, CO₂ for ESG reporting, books the call with the CFO/owner.

Each lead also has a **channel**. Many companies ignore vendor WhatsApps, so every lead defaults to
✉️ **email** (inbox-style thread with subject lines and formal sign-offs). You can switch any lead to
💬 **WhatsApp** in the console before the conversation starts. The console opens on a business lead so the
email inbox is the first thing judges see.

### Live email (real emails, dummy contacts)

With a [Resend](https://resend.com) API key, the agent's emails are **really sent**, not just shown in the app.

- **No real people are emailed.** Every lead has a fictional `@example.com` address (a reserved domain that
  can't reach anyone), and `api/email.js` only accepts those. Every email is **redirected to one test inbox**
  you choose, with the fictional recipient in the subject: `[Test → thomas.hofmann@example.com] ...`
- Links in sent emails open the real customer page (`https://<your-site>/?p=C-1006`), so you can tap one
  on your phone during the demo.
- Each email card in the inbox shows whether it was delivered, failed (with the reason), or wasn't sent
  (Demo Mode / live email off). The header pill shows `✉️ Live email → o•••@gmail.com` when it's on.

Setup (free Resend account, no domain needed):
1. Sign up at https://resend.com with the inbox you want the test emails in (e.g. your Gmail).
2. **API Keys -> Create API Key** (sending access is enough).
3. In Vercel -> Settings -> Environment Variables, add:
   - `RESEND_API_KEY` = `re_...`
   - `EMAIL_TEST_INBOX` = the same email you signed up to Resend with
4. Redeploy. Without a verified domain, Resend only delivers to the address you signed up with, and emails come
   from `onboarding@resend.dev`. If `EMAIL_TEST_INBOX` is not set, emails go to Resend's test address
   `delivered@resend.dev` and only show up in the Resend dashboard (Emails tab).
5. Optional: verify your own domain in Resend and set `EMAIL_FROM_ADDRESS` (e.g. `lina@yourdomain.com`).

Replies from the inbox don't flow back into the app yet; you still reply as the company inside the app.

### Sending rules (🛡 button in the app header)

Every proactive message (openers, campaigns, payment reminders), on email and WhatsApp, has to pass three rules.
Replies to a customer's own message are always allowed, unless that contact unsubscribed.

- **Marketing consent:** every lead has a `consent` flag. Leads without an opt-in on record (Amelie Roth
  and Nordwind Hotel in the demo data) can't be contacted: the start button is replaced by an explanation
  (UWG §7 / GDPR), and the campaign skips them. Payment reminders are about an existing contract, so
  they don't need marketing consent.
- **Unsubscribe:** every real email ends with an unsubscribe link (`/?u=<contact id>`) and carries a
  `List-Unsubscribe` header. The server refuses to send an email without one. Replying "stop",
  "unsubscribe" or "remove us from your list" works too. Unsubscribed contacts get nothing more: no
  openers, reminders or replies. Held messages for them are cancelled. You can resubscribe them from the rules panel.
- **Sending limit:** at most N messages per customer every D days (default 1 per 3 days). It counts per
  customer, so a customer with several open invoices doesn't get several reminders at once.
- **Quiet hours:** default 08:00–21:00, plus weekdays only for business customers. Messages created
  outside the window are held, shown as "⏰ Quiet hours: scheduled for …", and sent automatically when
  the window opens. Staff can use "Send now (staff override)" for the demo.

Rules, unsubscribes and quiet hours are kept in the browser (localStorage), so an unsubscribe made in
another tab of the same browser updates the console live. A production version would store them
server-side so every device sees the same list.

No external CRM: leads live in the app. A small serverless function keeps your API key off the browser.

```
index.html      the whole app (React via CDN, no build step)
api/chat.js      serverless proxy -> api.anthropic.com (holds your key)
package.json     lets Vercel recognise the project
```

---

## Test locally (before deploying)

1. Optional, for real emails: create a file named `.env.local` in this folder (it is git-ignored):
   ```
   RESEND_API_KEY=re_...
   EMAIL_TEST_INBOX=you@gmail.com
   ```
2. Run `npm run local` (Node 22.9+; no `npm install` needed).
3. Open http://localhost:3000 and leave the toggle on **Live mode**.

`dev-server.mjs` serves the page and runs `api/*.js` exactly as Vercel will.

---

## Deploy to a live URL (Vercel, ~5 min, no git needed)

1. Install the CLI and log in:
   ```
   npm i -g vercel
   vercel login
   ```
2. From inside this folder, deploy:
   ```
   vercel
   ```
   Accept the defaults. You'll get a preview URL.
3. Ship production (add the Resend variables from *Live email* first if you want real emails):
   ```
   vercel --prod
   ```
4. Open the `https://<your-project>.vercel.app` URL it prints. **That's your live demo link.**

### Alternative: Vercel via GitHub
Push this folder to a GitHub repo -> import it at https://vercel.com/new -> Deploy. Every push to `main`
redeploys automatically.

### Custom domain (optional)
In the Vercel project -> Settings -> Domains -> add a domain you own. The free
`*.vercel.app` URL already works for presenting; a custom domain is just nicer branding.

---

## Presenting live — read this

- **Test on the venue wifi before you go on.** The app loads React from a CDN, so it needs internet.
- **Mode toggle (top-right):** *Live mode* really sends the agent's emails to your test inbox.
  *Rehearsal: nothing sent* behaves the same but sends no emails, for practising.
- Suggested 3-minute flow:
  1. **Console:** point at the KPI row. "€X of pipeline the installer already paid for."
  2. Click **Reactivate all cold leads**. Openers go out and replies come in on the activity feed (replies are simulated).
  3. Open a homeowner lead -> **Send reactivation email** (or switch it to WhatsApp first) -> tap the suggested
     replies. The agent shares the customer-page link.
  4. Click the link -> **Customer Page**: drag the bill slider, toggle the battery, pick a slot, confirm.
  5. Back in the Console: the lead is **Booked**, the KPIs update and an **advisor handoff brief** appears.
  6. Switch to **🏢 Businesses · B2B**, open a commercial lead and **Send reactivation email**. Reply as the
     company from the inbox to show the CFO playbook over email.
  7. Finish on the **ROI calculator** with the installer's own numbers.

## Cost
Free: the templates need no AI provider, and Resend's free plan covers the test emails.

## Optional: Claude
The Claude connection is still in the code, switched off. To let Claude write the messages:
1. Add `ANTHROPIC_API_KEY` (an account with credits) in Vercel.
2. In `index.html`, set `const USE_CLAUDE = true;` (and optionally change `MODEL`; add any new model
   name to `ALLOWED_MODELS` in `api/chat.js`).
If a Claude call fails, the app falls back to the templates automatically.
