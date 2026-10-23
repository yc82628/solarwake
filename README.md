# SolarWake — live demo site

**AI revenue recovery for solar installers.** Installers pay for leads, send quotes, and most go quiet.
SolarWake works that dead pipeline over WhatsApp or email and books advisor calls, with no new ad spend.
The conversation is generated **live by Anthropic's Claude API**.

The app has two sides:

| Tab | Who it's for | What it shows |
|---|---|---|
| **Installer Console** (B2B) | The solar company (SolarWake's paying customer) | Pipeline KPIs (dormant €, reply rate, bookings, revenue recovered, ad spend avoided), funnel, one-click campaign across all cold leads, email/WhatsApp agent, AI advisor handoff brief, live activity feed, ROI calculator for the sales pitch |
| **Customer Page** (B2C) | The installer's lead (homeowner or business) | White-labelled page the agent links to: personal savings & payback, battery option, financing vs. savings, price-lock deadline, self-serve booking |

Every lead is handled by its own **playbook**:
- 🏠 **Homeowner (B2C):** friendly tone, bill savings, financing, price-lock deadline.
- 🏢 **Business (B2B):** professional tone, ROI and payback, depreciation, CO₂ for ESG reporting, books the call with the CFO/owner.

Each lead also has a **channel**. Many companies ignore vendor WhatsApps, so every lead defaults to
✉️ **email** (inbox-style thread with subject lines and formal sign-offs). You can switch any lead to
💬 **WhatsApp** in the console before the conversation starts. Emails are shown in the app and are not
actually sent. The console opens on a business lead so the email inbox is the first thing judges see.

No external CRM: leads live in the app. A small serverless function keeps your API key off the browser.

```
index.html      the whole app (React via CDN, no build step)
api/chat.js      serverless proxy -> api.anthropic.com (holds your key)
package.json     lets Vercel recognise the project
```

---

## Test locally with the live AI (before deploying)

1. Create a file named `.env.local` in this folder containing one line (it is git-ignored):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Run `npm run local` (Node 22.9+; no `npm install` needed).
3. Open http://localhost:3000 and leave the toggle on **Live AI**.

`dev-server.mjs` serves the page and runs `api/chat.js` exactly as Vercel will.

---

## Deploy to a live URL (Vercel, ~5 min, no git needed)

1. Get an API key at https://console.anthropic.com  ->  API Keys  ->  Create Key (starts with `sk-ant-`).
2. Install the CLI and log in:
   ```
   npm i -g vercel
   vercel login
   ```
3. From inside this folder, deploy:
   ```
   vercel
   ```
   Accept the defaults. You'll get a preview URL.
4. Add your key as an environment variable, then ship production:
   ```
   vercel env add ANTHROPIC_API_KEY
   # paste your sk-ant-... key, choose "Production" (and Preview if asked)
   vercel --prod
   ```
5. Open the `https://<your-project>.vercel.app` URL it prints. **That's your live demo link.**

### Alternative: Vercel via GitHub
Push this folder to a GitHub repo -> import it at https://vercel.com/new -> add the
`ANTHROPIC_API_KEY` environment variable in Project Settings -> Deploy.

### Custom domain (optional)
In the Vercel project -> Settings -> Domains -> add a domain you own. The free
`*.vercel.app` URL already works for presenting; a custom domain is just nicer branding.

---

## Presenting live — read this

- **Test on the venue wifi before you go on.** The app loads React from a CDN, so it needs internet.
- **Demo Mode toggle (top-right):** switch to *Demo Mode (scripted)* for a rehearsed, no-network run
  that always books. Use *Live AI* to show the real Claude API. If a live call ever fails mid-demo,
  the app auto-falls back to the script so it never freezes.
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

## Change the model
In `index.html`, edit one line:
```js
const MODEL = "claude-sonnet-5";   // best conversation
// or "claude-haiku-5-5"           // cheaper & faster
```
Also add the new name to `ALLOWED_MODELS` in `api/chat.js` (the proxy only forwards allow-listed models).

## Cost
Each reply is a short Claude call (a few cents at most on Sonnet, less on Haiku). A whole demo
run is well under a euro. Set a spend limit in the Anthropic console if you want a hard cap.
