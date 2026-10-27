// Local test server: serves index.html and runs api/*.js the way Vercel would.
// Optionally put OPENAI_API_KEY=sk-... (AI replies) and RESEND_API_KEY / EMAIL_TEST_INBOX (real test emails) in .env.local
// (git-ignored), then: npm run local
import http from "node:http";
import { readFile } from "node:fs/promises";
import chat from "./api/chat.js";
import email from "./api/email.js";

const PORT = Number(process.env.PORT) || 3000;
const API = { "/api/chat": chat, "/api/email": email };

http.createServer(async (req, res) => {
  // Minimal shim for the Vercel response helpers the handlers use.
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };

  const path = req.url.split("?")[0];
  if (API[path]) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    return API[path](req, res);
  }
  if (path === "/" || path === "/index.html") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.end(await readFile(new URL("./index.html", import.meta.url)));
  }
  res.status(404).end("Not found");
}).listen(PORT, "127.0.0.1", () => {
  console.log(`SolarWake running at http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? `AI replies: on (${process.env.OPENAI_MODEL || "gpt-6-luna"})` : "No OPENAI_API_KEY: replies come from the free templates");
  console.log(process.env.RESEND_API_KEY ? `Live email: on -> ${process.env.EMAIL_TEST_INBOX || "delivered@resend.dev"}` : "No RESEND_API_KEY: emails stay in the app");
});
