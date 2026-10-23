// Local test server: serves index.html and runs api/chat.js the way Vercel would.
// Put ANTHROPIC_API_KEY=sk-ant-... in .env.local (git-ignored), then: npm run local
import http from "node:http";
import { readFile } from "node:fs/promises";
import handler from "./api/chat.js";

const PORT = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  // Minimal shim for the Vercel response helpers the handler uses.
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };

  if (req.url === "/api/chat") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    return handler(req, res);
  }
  if (req.url === "/" || req.url === "/index.html") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.end(await readFile(new URL("./index.html", import.meta.url)));
  }
  res.status(404).end("Not found");
}).listen(PORT, "127.0.0.1", () => {
  console.log(`SolarWake running at http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? "Live AI: API key loaded" : "No ANTHROPIC_API_KEY: live calls fall back to the script");
});
