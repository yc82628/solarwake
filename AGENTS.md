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
index.html       the whole app (~2800 lines): React 18 + Babel standalone from a CDN, no build step
api/chat.js      optional AI proxy to OpenAI's Responses API. GET says whether OPENAI_API_KEY is set;
                 the server picks the model (OPENAI_MODEL, default gpt-6-luna), caps tokens and
                 forwards only plain user/assistant messages; returns { text }
api/email.js     serverless email sender via Resend; only accepts @example.com recipients,
                 redirects every email to one test inbox, and adds an unsubscribe link
                 (/?u=<contact id>) plus a List-Unsubscribe header to every email
dev-server.mjs   local server that serves index.html and runs api/*.js like Vercel does
package.json     `npm run local` script; lets Vercel recognise the project
README.md        features, setup, deploy and a 3-minute demo script
```

## How index.html is organised

Sections are marked with `// ================== NAME ==================` comments. Line numbers drift,
so search for the header names:

- **CONFIG:** `ALLOW_AI` (default `true`). AI is actually on only when `/api/chat` reports a key and the
  app isn't in Rehearsal (`aiOn` in `App()`). Without a key everything runs on the free templates.
- **CRM DATA:** `COMPANIES` (4 installers), `CONTACTS` (16 leads with `seg`, `kw`, `quote`, `bill`,
  `lost` = why the deal stalled, `dm` = decision-maker for businesses, `consent` = opted in to
  follow-up marketing; C-1004 and C-1014 are `false`). `ECON` holds the solar economics,
  and `solarModel()` computes savings, payback and CO₂ from it.
- **PLAYBOOKS:** `PLAYBOOKS.Residential` (B2C homeowner) and `PLAYBOOKS.Commercial` (B2B), each with
  `quick` and simulated campaign `replies` per language (`{ en:[…], de:[…] }`), openers per channel
  (`email` / `whatsapp`) that switch on `lead.lang`, and a `system(lead, co, channel)` prompt (with
  `LANG_RULE`). `leadFacts()` is the only source of numbers the agent may quote. `JSON_RULES` defines the
  reply format: `{"message","status":"contacting|warm|booked","appointment"}`.
- **Language:** a lead gets `lang` ("en" | "de") stamped when Lina starts (toolbar toggle `agentLang`,
  saved as `sw-agent-lang`); the conversation keeps it. Helpers: `de(l)`, `greet(l)`, `kwOf(l)`,
  `yearsOf(l,p)`, `signoff(co,biz,lang)`. Billing emails, the advisor brief and the UI stay English.
- **Number guard:** `figs()` extracts € amounts (normalising "€1,246" / "1.246 €" to `eur()` style),
  `leadFigures()` / `invFigures()` list the only amounts allowed, `strayFigures()` finds the rest. Every AI
  reply with a stray figure is dropped for the template, and the Arena scores with the same functions.
- **REPLY TEMPLATES:** the free "brain". `classifyLead()` uses English + German keyword regexes to find
  the intent (upset, book, price, competitor, decider, cashflow, numbers, timing, interest),
  `leadAnswer()` answers it from templates and `leadReply()` builds the message and moves toward a
  booking ("upset" gets an honest where-your-details-came-from answer, never a pitch or slot ask).
  `parseAgent()` parses AI JSON and defaults to `warm` on bad output.
- **AI seam:** `callAI(system, messages, max_tokens)` is the only function that talks to the AI (POST
  `/api/chat`). It is used in 4 places, each with a template fallback: lead replies (`agentReply`),
  reminder emails (`sendReminder`), billing replies (`invAgentReply`) and the advisor brief (`makeBrief`).
- **FUN LAYER:** `STATUS_ICON` (😴 ⏰ ☀️ 🎉), `WakeAvatar`, `useCountUp` + `WokenCounter` (session € from
  booked quotes + `TX-L…` payments), `Celebration` (sun-burst + confetti via `celebrate()` in `App()`,
  skipped when `REDUCED`), `MoodMeter` and the `mood` emoji on each `LADDER` step.
- **CUSTOMER ARENA:** `PERSONAS` (8 scripted customers), `arenaRun(p)` replays one against the real
  engine (`leadGuard` → `leadReply`, or `classifyReply` → `replyScript`) and returns turns + code checks,
  `ArenaView` animates it. Nothing is sent and console state is untouched. Add a persona = add a row.
- **SENDING RULES:** `POLICY_DEFAULT` (quiet hours 08–21, weekdays only for businesses, at most 1
  proactive message per customer every 3 days), `isQuiet()` / `nextWindow()`, `STOP_WORDS`,
  `WRONG_PERSON`, `leadGuard()` (runs before any reply, EN + DE) and `contactInfo()`. In `App()`, `sendRule()` gates every proactive message (openers, campaigns,
  reminders): unsubscribed → nothing, lead without `consent` → nothing, over the limit → not sent, quiet hours → held and released later
  (staff can override). Replies to a customer's own message skip the limit and quiet hours but never
  go to unsubscribed contacts. Unsubscribes and the policy live in localStorage (`sw-optouts`,
  `sw-policy`); the UI is `SendingRules`, `UnsubscribePage`, `DeliveryNote` and `UnsubFooter`.
- **ADVISOR HANDOFF BRIEF:** `BRIEF_SYSTEM` prompt, plus `heuristicBrief()` as the no-AI version.
- **BILLING:** `BILLING` → `INITIAL_INVOICES`, the reminder `LADDER` (heads-up → due → polite → firm →
  final), `classifyReply()` for payment replies, `billingSystem()` prompt (with rules: never invent
  amounts or legal consequences, never threaten), `reminderScript()` / `replyScript()` templates.
- **APP:** `App()` holds all state. Tabs: Leads console, Invoices, Transactions (accountant ledger),
  Customer Page, Pay Page and Arena. `runCampaign()` sends openers to all cold leads; **replies in the
  campaign are simulated**. `mailOut()` sends real emails through `/api/email` in Live mode.
- **Views:** `Console`, `EmailPane`, `ROICalc`, `Portal` (customer page), `InvoicesView`, `PayPage`,
  `LedgerView`, `ArenaView`, `Landing` (public landing page, EN/DE via the `LT` strings).

Modes: the header toggle switches between **Live mode** (real test emails) and **Rehearsal** (nothing
sent, templates only). Deep links: `/?p=C-1006` opens a customer page, `/?i=INV-...` a pay page,
`/?u=C-1006` (or a billing contact like `K-01`) the unsubscribe page, `/#app` the app.

## Running and checking

- `npm run local` (Node 22.9+, no `npm install`) → http://localhost:3000. Secrets go in `.env.local`
  (gitignored by `.env*`).
- There is no unit-test suite. Babel compiles in the browser, so **a syntax error only shows up as a
  blank page**. After every change to `index.html`, load the page and check the browser console,
  then click through the flow you touched.
- **The Arena is the regression check for reply logic.** After touching `classifyLead`, `leadAnswer`,
  `leadReply`, `leadGuard` or the billing templates, open 🥊 Arena → Run all eight: every persona should
  stay at 4/4. Top-level names are reachable from the browser console, e.g.
  `PERSONAS.map(p=>arenaRun(p).passed)`.
- To try the AI path without spending money, run the server with a fake `OPENAI_API_KEY` (the page then
  believes AI is on) and stub `window.fetch` for `POST /api/chat` in the browser console.
- The page needs internet (React and Babel come from unpkg, pinned to exact versions).

## Rules

1. **Never put an API key in browser code or in git.** Keys live in `.env.local` locally and in
   Vercel env vars when deployed. Only `api/*.js` may read them.
2. **Keep the templates as the fallback.** Every AI call must fall back to the template path if it
   fails, times out or returns invalid JSON. Rehearsal mode must always complete a booking and a
   payment flow with no network.
3. **No invented facts.** The agent may only quote numbers from `leadFacts()` / `invFacts()` (which come
   from `ECON` and the data). Never let the model state subsidies, prices, savings or legal
   consequences of its own. The number guard (`strayFigures`) enforces this for € amounts; keep it on
   every AI path.
4. **Keep the protections in `api/`.** `api/email.js` only accepts `@example.com` recipients,
   redirects to the test inbox and refuses to send without a contact id for the unsubscribe link;
   `api/chat.js` picks the model server-side, caps tokens and message sizes and forwards only plain
   user/assistant messages. A public demo URL must not let strangers spend the API key on arbitrary requests.
5. **Free by default.** The owner doesn't want paid AI running unless they add a key themselves. Never
   claim "AI" in the UI when `aiOn` is false.
6. **Safety decisions stay deterministic.** Opt-outs ("STOP", "Stopp", "unsubscribe") and disputes
   are detected with rules *before* any LLM call, and they always win over what the model says.
7. **Honest UI.** Labels must match reality: the provider badge, "Written by …" on briefs, the
   `CRM {company.api}` badge (there is no real CRM), and simulated campaign replies.
8. Keep the no-build, single-file setup. Make targeted edits; don't reformat or reorganise the file.
   One commit per feature.

## Design lens: fun and inviting

Even a basic business task (chasing an invoice, following up a quote) should feel playful to watch.
Test every change with: *would someone watching from the back of the room smile or lean in?* Prefer
visible moments of delight (motion, a counter going up, a satisfying "booked!") over hidden features.
Keep it tasteful: the product still has to look trustworthy to an installer, and animations must respect
`prefers-reduced-motion` (handled globally in the CSS; JS-driven effects check `REDUCED`).

## Status (27 Oct 2026)

Built after the DevDay Exchange hackathon (24 Oct 2026), in this order:
1. ✅ **Safety rails:** marketing consent, STOP/Stopp, unsubscribe links, sending limit, quiet hours.
2. ✅ **Fun layer:** sleeping → waking leads, "€ woken up" counter, celebrations, reminder mood scale.
3. ✅ **Customer Arena:** 8 scripted personas against the real engine, code-checked scorecards,
   "Run all eight". Writing it exposed two engine gaps (pitching to an upset customer, no wrong-person
   handling), both fixed.
4. ✅ **German agent:** EN/DE toggle, German templates and keyword rules, German unsubscribe footer.
5. ✅ **OpenAI switch:** `api/chat.js` on the Responses API, auto-on when `OPENAI_API_KEY` is set,
   number guard on every AI reply, templates as fallback. Tested with a stubbed upstream; not yet
   tried against the real API (no key on this project).

## Next ideas
- **AI customer in the Arena:** when `aiOn`, let a second model play the persona (and a judge type a
  one-line persona of their own); keep the scripted runs as the offline fallback.
- **German in the Arena:** a few German personas, so the regression check covers both languages.
- An `.ics` calendar download when a lead books.
- A QR code on the console that opens the customer page on a phone (`/?p=C-...`). State is per-browser,
  so a booking on the phone won't update the laptop unless shared state is added.

## Known limitations (be upfront about these in the demo)
- Leads and invoices live in browser memory; a reload resets everything.
- Campaign replies are simulated; replies to real emails don't flow back into the app.
- Phone numbers in the data look realistic but are fictional; never send real WhatsApp messages to them.
