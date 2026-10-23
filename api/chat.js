// Serverless proxy (Vercel). Keeps your Anthropic key on the server — never in the browser.
// The browser calls POST /api/chat with { model, max_tokens, system, messages, output_config }.
// Only those fields are forwarded, the model is allow-listed and max_tokens is capped,
// so a public demo URL can't be used to run arbitrary requests on your key.
const ALLOWED_MODELS = ["claude-sonnet-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
const MAX_TOKENS_CAP = 4000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Set the ANTHROPIC_API_KEY environment variable in Vercel." });
    return;
  }
  const { model, max_tokens, system, messages, output_config } = req.body || {};
  if (!ALLOWED_MODELS.includes(model) || !Array.isArray(messages) || messages.length > 60) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Number(max_tokens) || 1000, MAX_TOKENS_CAP),
        system,
        messages,
        ...(output_config ? { output_config } : {}),
      }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
