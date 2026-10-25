// Serverless email sender (Vercel) via Resend — https://resend.com
// GET  /api/email -> { enabled, inbox } so the page can show whether live email is on.
// POST /api/email with { to, subject, text, fromName, contactId, company } -> { id }
// Every email gets an unsubscribe link (/?u=<contactId>) in the text and a List-Unsubscribe header.
//
// Data protection: leads only ever have dummy @example.com addresses, and nothing is sent to them.
// Every email is redirected to ONE test inbox (EMAIL_TEST_INBOX), with the dummy recipient in the subject.
//
// Env vars:
//   RESEND_API_KEY      required to send (re_...)
//   EMAIL_TEST_INBOX    where all emails land. Without a verified domain Resend only delivers to the
//                       address you signed up with. Defaults to Resend's sink address delivered@resend.dev.
//   EMAIL_FROM_ADDRESS  sender address. Defaults to onboarding@resend.dev (works without a domain).
const DUMMY_RECIPIENT = /^[a-z0-9._+-]+@example\.com$/i;
const CONTACT_ID = /^[A-Z]-[A-Za-z0-9-]{1,20}$/; // lead ids like C-1006, billing customers like K-01

const mask = email => email.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");
const clean = (s, max) => String(s || "").replace(/[\r\n<>"]/g, " ").trim().slice(0, max);

export default async function handler(req, res) {
  const key = process.env.RESEND_API_KEY;
  const inbox = process.env.EMAIL_TEST_INBOX || "delivered@resend.dev";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";

  if (req.method === "GET") {
    res.status(200).json({ enabled: Boolean(key), inbox: key ? mask(inbox) : null });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use GET or POST" });
    return;
  }
  if (!key) {
    res.status(503).json({ error: "Live email is off: set RESEND_API_KEY in Vercel." });
    return;
  }

  const { to, subject, text, fromName, contactId, company } = req.body || {};
  if (!DUMMY_RECIPIENT.test(to || "")) {
    res.status(400).json({ error: "Only dummy @example.com recipients are allowed." });
    return;
  }
  if (!subject || !text || String(text).length > 5000) {
    res.status(400).json({ error: "Missing subject/text, or text too long." });
    return;
  }
  // Every email must carry an unsubscribe link, so it needs a contact to unsubscribe.
  if (!CONTACT_ID.test(contactId || "")) {
    res.status(400).json({ error: "Missing contactId for the unsubscribe link." });
    return;
  }
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
    res.status(400).json({ error: "Unknown host." });
    return;
  }
  const proto = req.headers["x-forwarded-proto"] || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  const unsubscribeUrl = `${proto}://${host}/?u=${contactId}`;

  try {
    const upstream = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${clean(fromName, 80) || "SolarWake Demo"} <${fromAddress}>`,
        to: [inbox],
        subject: `[Test → ${to}] ${clean(subject, 200)}`,
        text: `${text}\n\n—\nYou're receiving this about your solar project with ${clean(company, 80) || "your installer"}. `
          + `Don't want these emails? Unsubscribe: ${unsubscribeUrl}\n`
          + `SolarWake demo: test email for the fictional contact ${to}. No real customer data is used.`,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.message || data.error || "Resend rejected the email." });
      return;
    }
    res.status(200).json({ id: data.id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
