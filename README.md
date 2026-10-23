# SolarWake — live demo site

An AI lead-reactivation agent. The WhatsApp conversation is generated **live by Anthropic's Claude API**.
No external CRM — leads live in the app. A small serverless function keeps your API key off the browser.

```
index.html      the whole app (React via CDN, no build step)
api/chat.js      serverless proxy -> api.anthropic.com (holds your key)
package.json     lets Vercel recognise the project
```

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
- Flow: pick a company -> click a dormant lead -> **Start reactivation** -> tap the grey quick-reply
  chips (faster than typing) -> watch it book -> the lead flips to **Booked** and the stats update.

## Change the model
In `index.html`, edit one line:
```js
const MODEL = "claude-sonnet-5";   // best conversation
// or "claude-haiku-4-5-20251001"  // cheaper & faster
```
Verify the current model names at https://docs.claude.com if a call returns a model error.

## Cost
Each reply is a short Claude call (a few cents at most on Sonnet, less on Haiku). A whole demo
run is well under a euro. Set a spend limit in the Anthropic console if you want a hard cap.
