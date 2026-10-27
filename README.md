# SolarWake — live demo site

**Revenue recovery for solar installers: quotes that went quiet, and invoices that haven't been paid.**
SolarWake follows up over email or WhatsApp, books advisor calls, chases payments politely, and keeps a
ledger your accountant can filter by any period. Messages come from **built-in templates**, and replies are
understood with **keyword rules** (English and German), so the demo runs for free with no paid AI. Add an
OpenAI key and the replies are written by AI instead, behind the same safety rules (see *Optional: OpenAI* below).

The site opens on a public **landing page** (light theme, EN/DE, accessible: skip link, focus outlines,
WCAG-contrast buttons, reduced-motion support). **Try the live demo** / **Sign in** opens the app (`/#app`):

| Tab | Who it's for | What it shows |
|---|---|---|
| **Leads** (B2B) | The solar company (SolarWake's paying customer) | Pipeline KPIs, funnel, one-click campaign across cold leads, email/WhatsApp agent that answers objections (price, competitor, savings/ROI, CFO sign-off, cash flow, timing), advisor handoff brief, live activity feed, ROI calculator |
| **Invoices** (B2B) | The installer's back office | Outstanding / overdue / days-to-pay KPIs, unpaid-by-age chart, a reminder schedule that gets firmer (heads-up → due today → polite → firm → final notice, each step can be switched off), reminders sent as real emails, automatic handling of replies ("already paid", instalments, problem with the installation, promised date) which pauses reminders |
| **Transactions** | The installer's accountant | Every payment in and out (customer payments, invoices, supplier bills, refunds) with a calendar range picker, quick periods, **calendar settings** (financial-year start, week start, date format), filters (installer, direction, type, search), a **missing documents** filter with "request" button, and CSV export |
| **Customer Page** (B2C) | The installer's lead | Personal savings & payback, battery option, financing, price-lock deadline, self-serve booking |
| **Pay Page** (B2C) | The installer's customer | Invoice details, pay by card / bank transfer / 3 instalments (homeowners), report a problem. Test payments only; no money moves |
| **🥊 Arena** | Anyone watching the demo | Lina vs. eight tough customers (the Sceptic, the Price Hawk, the CFO, the Angry Opt-out, "I Already Paid" …). Each match plays out live, then a code-checked scorecard (booked? only real numbers? respected a no? no threats?) awards stars and a medal |

The whole app is built to be fun to watch: cold leads are 😴 asleep and wake up ☀️ when they reply, a
"€ woken up this session" counter counts up with every booking and payment, bookings and payments get a
short sun-burst and confetti (skipped for reduced motion), and payment reminders read as a mood scale
from 😊 to 🫡: firmer each step, never rude.

Links in real emails open the right page directly: `/?p=C-1006` (quote page) and `/?i=INV-2026-0102` (pay page).

Every lead is handled by its own **playbook**:
- 🏠 **Homeowner (B2C):** friendly tone, bill savings, financing, price-lock deadline.
- 🏢 **Business (B2B):** professional tone, ROI and payback, depreciation, CO₂ for ESG reporting, books the call with the CFO/owner.

Each lead also has a **channel**. Many companies ignore vendor WhatsApps, so every lead defaults to
✉️ **email** (inbox-style thread with subject lines and formal sign-offs). You can switch any lead to
💬 **WhatsApp** in the console before the conversation starts. The console opens on a business lead so the
email inbox is the first thing judges see.

**Lina writes English or Deutsch** (toggle in the Leads toolbar). German conversations use formal "Sie",
German openers, quick replies, answers, slot offers, sign-off ("Mit freundlichen Grüßen") and unsubscribe
footer, and the keyword rules read German replies ("zu teuer", "anderes Angebot", "Mittwoch passt uns",
"Stopp"). A conversation keeps the language it started in.

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

No external CRM: leads live in the app. Small serverless functions keep your API keys off the browser.

```
index.html       the whole app (React via CDN, no build step)
api/chat.js      optional AI proxy -> OpenAI Responses API (holds your key, picks the model)
api/email.js     real test emails via Resend (dummy recipients only, one test inbox)
dev-server.mjs   local server that runs the page and api/*.js like Vercel
package.json     `npm run local`; lets Vercel recognise the project
```

---

## Test locally (before deploying)

1. Optional, for real emails and/or AI replies: create a file named `.env.local` in this folder (it is git-ignored):
   ```
   RESEND_API_KEY=re_...
   EMAIL_TEST_INBOX=you@gmail.com
   OPENAI_API_KEY=sk-...
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
  1. **Console:** point at the KPI row. "€X of pipeline the installer already paid for." The leads are 😴 asleep.
  2. Click **⏰ Wake up all cold leads**. Openers go out, alarms ring, and replies come in on the activity feed
     (replies are simulated); the leads that answer wake up ☀️.
  3. Open a homeowner lead -> **Send reactivation email** (or switch it to WhatsApp first) -> tap the suggested
     replies. The agent shares the customer-page link.
  4. Click the link -> **Customer Page**: drag the bill slider, toggle the battery, pick a slot, confirm.
  5. Back in the Console: confetti, the lead is **Booked**, the "€ woken up" counter jumps and an
     **advisor handoff brief** appears.
  6. Switch **Lina writes** to **Deutsch**, open a commercial lead and **Send reactivation email**. Reply as the
     company from the inbox to show the CFO playbook in German.
  7. **🥊 Arena → Run all eight**: Lina handles every tough customer and the scorecards fill with medals.
  8. Finish on the **ROI calculator** with the installer's own numbers.

## Cost
Free by default: the templates need no AI provider, and Resend's free plan covers the test emails.

## Optional: OpenAI
To let AI write the replies, reminders and advisor briefs:
1. Create a key at https://platform.openai.com (an account with credit).
2. Add `OPENAI_API_KEY` in Vercel -> Settings -> Environment Variables (or in `.env.local` for
   `npm run local`), then redeploy. Nothing in the code needs to change: the page asks `GET /api/chat` on load
   and switches on by itself; the header badge then reads "AI replies · OpenAI <model>".
3. Optional: `OPENAI_MODEL` (default `gpt-6-luna`, OpenAI's lowest-cost model as of October 2026; check
   https://developers.openai.com/api/docs/models for current names) and `OPENAI_REASONING_EFFORT` (e.g. `low`).

What stays in place with AI on:
- **Rules run first.** STOP / unsubscribe, wrong person and disputes are handled by code before any AI call.
- **No invented numbers.** If an AI reply quotes a € amount that isn't in the customer's own data, it is
  thrown away and the template answers instead (the activity feed says so).
- **Templates as fallback.** Any failed call, cut-off reply or invalid JSON falls back to the templates.
  Rehearsal mode always uses the templates.
- **The key stays server-side.** The browser can't choose the model; tokens and message sizes are capped.

To switch AI off without removing the key, set `const ALLOW_AI = false;` in `index.html`.
