// Serverless AI proxy (Vercel) for OpenAI's Responses API. Keeps your key on the server — never in the browser.
// GET  /api/chat -> { enabled, model } so the page knows whether AI replies are on.
// POST /api/chat with { system, messages, max_tokens } -> { text } (or { error }, and the page uses its templates).
//
// The model is chosen here, not by the browser, the token budget is capped and only plain user/assistant
// messages are forwarded, so a public demo URL can't be used to run arbitrary requests on your key.
//
// Env vars:
//   OPENAI_API_KEY            turns AI replies on. Without it the app runs on its free templates.
//   OPENAI_MODEL              optional, defaults to gpt-6-luna (OpenAI's lowest-cost model in Oct 2026).
//   OPENAI_REASONING_EFFORT   optional, e.g. "low", for reasoning models.
const DEFAULT_MODEL = "gpt-6-luna";
const MAX_TOKENS_CAP = 4000;
const MAX_CHARS = 6000;

export default async function handler(req, res) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (req.method === "GET") {
    res.status(200).json({ enabled: Boolean(key), model: key ? model : null });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use GET or POST" });
    return;
  }
  if (!key) {
    res.status(503).json({ error: "AI replies are off: set OPENAI_API_KEY in Vercel." });
    return;
  }

  const { system, messages, max_tokens } = req.body || {};
  const ok = typeof system === "string" && system.length <= MAX_CHARS * 2
    && Array.isArray(messages) && messages.length > 0 && messages.length <= 60
    && messages.every(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= MAX_CHARS);
  if (!ok) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const effort = process.env.OPENAI_REASONING_EFFORT;
  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        input: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))],
        max_output_tokens: Math.min(Number(max_tokens) || 1000, MAX_TOKENS_CAP),
        text: { format: { type: "json_object" } },   // every SolarWake prompt asks for JSON
        ...(effort ? { reasoning: { effort } } : {}),
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: (data.error && data.error.message) || "OpenAI rejected the request." });
      return;
    }
    const text = (data.output || [])
      .filter(o => o.type === "message")
      .flatMap(o => o.content || [])
      .filter(c => c.type === "output_text")
      .map(c => c.text)
      .join("\n");
    if (!text) {
      res.status(502).json({ error: data.status === "incomplete" ? "The reply was cut off (token limit)." : "Empty reply." });
      return;
    }
    res.status(200).json({ text, model });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
