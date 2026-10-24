# AGENTS.md: SolarWake

Context for coding agents (Codex). Read this before changing anything.

## What this is

SolarWake recovers revenue for solar installers in two ways:
1. **Leads:** quotes that went quiet. An agent ("Lina") follows up by email or WhatsApp, handles
   objections and books a call with a human advisor.
2. **Invoices:** bills that haven't been paid. Reminders get firmer over time, and replies like
   "already paid" or "there's a problem with the installation" are handled automatically.

It is a **demo** with fictional companies and contacts. No real customer is ever messaged.

## Files

```
index.html       the whole app (~2200 lines): React 18 + Babel standalone from a CDN, no build step
api/chat.js      serverless proxy to the LLM (currently Anthropic, switched off by default)
api/email.js     serverless email sender via Resend; only accepts @example.com recipients and
                 redirects every email to one test inbox
dev-server.mjs   local server that serves index.html and runs api/*.js like Vercel does
package.json     `npm run local` script; lets Vercel recognise the project
README.md        features, setup, deploy and a 3-minute demo script
```

## How index.html is organised

Sections are marked with `// ================== NAME ==================` comments. Line numbers drift,
so search for the header names:

- **CONFIG:** `USE_CLAUDE` (currently `false`) and `MODEL`.
- **CRM DATA:** `COMPANIES` (4 installers), `CONTACTS` (16 leads with `seg`, `kw`, `quote`, `bill`,
  `lost` = why the deal stalled, `dm` = decision-maker for businesses). `ECON` holds the solar economics,
  and `solarModel()` computes savings, payback and CO₂ from it.
- **PLAYBOOKS:** `PLAYBOOKS.Residential` (B2C homeowner) and `PLAYBOOKS.Commercial` (B2B), each with
  quick replies, openers per channel (`email` / `whatsapp`) and a `system(lead, co, channel)` prompt.
  `leadFacts()` is the only source of numbers the agent may quote. `JSON_RULES` defines the reply format:
  `{"message","status":"contacting|warm|booked","appointment"}`.
- **REPLY TEMPLATES:** the current "brain". `classifyLead()` uses keyword regexes to find the intent
  (book, price, competitor, decider, cashflow, numbers, timing, interest), `leadAnswer()` answers it
  from templates and `leadReply()` builds the message and moves toward a booking. `parseAgent()` parses
  LLM JSON and defaults to `warm` on bad output.
- **AI seam:** `callClaude(system, messages, max_tokens)` is the only function that talks to the LLM.
  It is used in 4 places, each with a template fallback: lead replies (`agentReply`), reminder emails
  (`sendReminder`), billing replies (`invAgentReply`) and the advisor handoff brief (`makeBrief`).
  `toApi()` adds a dummy first user turn because Anthropic's API requires one.
- **ADVISOR HANDOFF BRIEF:** `BRIEF_SYSTEM` prompt, plus `heuristicBrief()` as the no-AI version.
- **BILLING:** `BILLING` → `INITIAL_INVOICES`, the reminder `LADDER` (heads-up → due → polite → firm →
  final), `classifyReply()` for payment replies, `billingSystem()` prompt (with rules: never invent
  amounts or legal consequences, never threaten), `reminderScript()` / `replyScript()` templates.
- **APP:** `App()` holds all state. Tabs: Leads console, Invoices, Transactions (accountant ledger),
  Customer Page and Pay Page. `runCampaign()` sends openers to all cold leads; **replies in the
  campaign are simulated**. `mailOut()` sends real emails through `/api/email` in Live mode.
- **Views:** `Console`, `EmailPane`, `ROICalc`, `Portal` (customer page), `InvoicesView`, `PayPage`,
  `LedgerView`, `Landing` (public landing page, EN/DE via the `LT` strings).

Modes: the header toggle switches between **Live mode** (real test emails) and **Rehearsal** (nothing
sent, templates only). Deep links: `/?p=C-1006` opens a customer page, `/?i=INV-...` a pay page,
`/#app` the app.

## Running and checking

- `npm run local` (Node 22.9+, no `npm install`) → http://localhost:3000. Secrets go in `.env.local`
  (gitignored by `.env*`).
- There is no test suite. Babel compiles in the browser, so **a syntax error only shows up as a
  blank page**. After every change to `index.html`, load the page and check the browser console,
  then click through the flow you touched.
- The page needs internet (React and Babel come from unpkg, pinned to exact versions).

## Rules

1. **Never put an API key in browser code or in git.** Keys live in `.env.local` locally and in
   Vercel env vars when deployed. Only `api/*.js` may read them.
2. **Keep the templates as the fallback.** Every AI call must fall back to the template path if it
   fails, times out or returns invalid JSON. Rehearsal mode must always complete a booking and a
   payment flow with no network.
3. **No invented facts.** The agent may only quote numbers from `leadFacts()` / `invFacts()` (which come
   from `ECON` and the data). Never let the model state subsidies, prices, savings or legal
   consequences of its own.
4. **Keep the protections in `api/`.** `api/email.js` only accepts `@example.com` recipients and
   redirects to the test inbox; `api/chat.js` allow-lists models, caps tokens and forwards only known
   fields. A public demo URL must not let strangers spend the API key on arbitrary requests.
5. **Safety decisions stay deterministic.** Opt-outs ("STOP", "Stopp", "unsubscribe") and disputes
   are detected with rules *before* any LLM call, and they always win over what the model says.
6. **Honest UI.** Labels must match reality: the provider badge, "Written by …" on briefs, the
   `CRM {company.api}` badge (there is no real CRM), and simulated campaign replies.
7. Keep the no-build, single-file setup for today. Make targeted edits; don't reformat or reorganise
   the file. One commit per step below.

## Judging lens: fun and inviting

Judges reward demos that are **fun and inviting**, where even a basic business task (chasing an invoice,
following up a quote) feels playful. Everything below should pass this test: *would someone watching
from the back of the room smile or lean in?* Prefer visible moments of delight (motion, a counter going
up, a satisfying "booked!") over hidden features. Keep it tasteful: the product still has to look
trustworthy to an installer, and animations must respect `prefers-reduced-motion` (already handled
globally in the CSS).

## Build plan for today (DevDay Exchange hackathon, Berlin, 24 Oct 2026, demos at about 18:00)

Order matters. Steps 1–3 are a complete, fun demo; step 4 is the showstopper.
**Feature freeze at 16:30**: after that, only fixes and demo rehearsal.

### 1. Switch the AI to OpenAI (~30 min)
- `api/chat.js`: call the OpenAI API with `OPENAI_API_KEY` (check the current recommended endpoint and
  model names in OpenAI's docs; don't guess). Keep the model allow-list and token cap. Use structured
  JSON output (a JSON schema) where the API supports it, so replies parse reliably.
- Return a provider-neutral `{ text }` to the browser.
- In `index.html`: rename `callClaude` → `callAI` and `USE_CLAUDE` → `USE_AI`, drop the
  Anthropic-only `output_config`, and update every label that says Claude (header badge and tooltip,
  "Written by Claude" on briefs, CONFIG comments). Update `dev-server.mjs` logs, `package.json`
  description and the README's "Optional: Claude" section.
- Done when: with `USE_AI = true` and a key in `.env.local`, a lead conversation books and a billing
  reply is handled by the AI; with the key removed, both still work via templates.

### 2. Safety rails (~45 min)
- Add a `consent` field to each lead (most `true`, one or two `false` for the demo). Without consent,
  "Send reactivation email" is disabled and says why (UWG §7 / GDPR: marketing to old leads needs
  opt-in), and `runCampaign()` skips the lead.
- Rule-based opt-out: "STOP" / "Stopp" / "unsubscribe" ends the thread with a short confirmation,
  marks the lead `Opted out` and never messages it again, before any AI call.
- Done when: both can be shown in the demo in under 20 seconds.

### 3. Make it fun (~1.5 h): the "wake-up" moments
Pick the ones that read best on a projector; don't do all of them half-way.
- **Sleeping → awake leads:** cold leads look asleep (😴, dimmed); on a reply they "wake up" with a
  short sunrise animation (☀️), and booked leads glow.
- **Recovered € counter:** a big number in the console header that counts up with an easing animation
  whenever a lead books or an invoice is paid ("€48,500 woken up today").
- **Booking celebration:** a small, tasteful confetti or sun-burst on booking and on payment, on top of
  the existing toast.
- **Friendlier reminder ladder:** show the five reminder steps as a mood scale (🙂 → 😐 → 😬 → 🫡) so
  "chasing invoices" looks approachable instead of aggressive.
- Done when: the 3-minute demo script in the README has at least three moments that get a reaction.

### 4. Customer Arena (~2 h): AI vs. AI, scored live
The showstopper, and it doubles as our evaluation suite.
- A new view where **an OpenAI model plays a difficult customer** from a list of personas (the sceptic,
  "too expensive", "already got another quote", the CFO who needs numbers, wrong number, angry opt-out,
  "I already paid") and **Lina** handles them. The conversation plays out live on screen.
- Each run gets a scorecard, checked by code where possible: booked?, every € figure in the reply
  appears in `leadFacts()` / `invFacts()`?, opt-out honoured?, no threats in billing?, valid JSON every
  turn? Show it as a playful result card (stars or a medal), plus a leaderboard across personas.
- Let the audience or a judge pick the persona (or type their own one-line persona) to invite
  participation.
- Rehearsal fallback: ship 2–3 pre-recorded arena runs so the view works with no network.
- Done when: one click runs a persona end to end and shows its scorecard; "Run all" fills the
  leaderboard.

### 5. German in the app (~45 min, if time)
- The landing page already has EN/DE. Add a language toggle for the agent: when on, openers, quick
  replies and AI replies are German (the AI writes German from the same facts; templates get German
  versions for the most-used intents).
- Done when: one full German lead conversation books.

### 6. Optional polish (only if ahead of schedule)
- An `.ics` calendar download when a lead books.
- A QR code on the console that opens the customer page on a judge's phone (`/?p=C-...`). Note the state
  is per-browser, so a booking on the phone won't update the laptop unless shared state is added.

## Known limitations (be upfront about these in the demo)
- Leads and invoices live in browser memory; a reload resets everything.
- Campaign replies are simulated; replies to real emails don't flow back into the app.
- Phone numbers in the data look realistic but are fictional; never send real WhatsApp messages to them.
