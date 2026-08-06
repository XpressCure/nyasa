import { createHash, createHmac } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const apiUrl = process.env.NYAS_SMS_API_URL;
const secret = process.env.NYAS_SMS_INGEST_SECRET;
const senderTerms = (process.env.NYAS_SMS_SENDERS || "UCOBANK,UCOBNK").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
const pollMs = Number(process.env.NYAS_SMS_POLL_MS || 30000);
const statePath = process.env.NYAS_SMS_STATE_FILE || ".nyas-sms-state.json";

if (!apiUrl || !secret || secret.length < 24) {
  throw new Error("Set NYAS_SMS_API_URL and a NYAS_SMS_INGEST_SECRET of at least 24 characters.");
}

async function loadState() {
  try { return new Set(JSON.parse(await readFile(statePath, "utf8"))); } catch { return new Set(); }
}

function messageId(message) {
  return String(message._id || message.id || createHash("sha256").update(`${message.address}|${message.received}|${message.body}`).digest("hex"));
}

function receivedAt(message) {
  const raw = message.received || message.date || message.timestamp;
  const numeric = Number(raw);
  const date = Number.isFinite(numeric) ? new Date(numeric > 1e12 ? numeric : numeric * 1000) : new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function forward(message) {
  const payload = JSON.stringify({
    messageId: messageId(message),
    sender: String(message.address || message.sender || ""),
    body: String(message.body || ""),
    receivedAt: receivedAt(message).toISOString()
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nyas-timestamp": timestamp, "x-nyas-signature": signature },
    body: payload
  });
  if (!response.ok) throw new Error(`Nyas rejected SMS ${messageId(message)}: ${response.status} ${await response.text()}`);
}

async function poll() {
  const seen = await loadState();
  const { stdout } = await execFileAsync("termux-sms-list", ["-t", "inbox", "-l", "30"]);
  const messages = JSON.parse(stdout);
  const candidates = messages
    .filter((message) => senderTerms.some((term) => String(message.address || message.sender || "").toLowerCase().includes(term)))
    .filter((message) => !seen.has(messageId(message)))
    .sort((a, b) => receivedAt(a) - receivedAt(b));

  for (const message of candidates) {
    await forward(message);
    seen.add(messageId(message));
  }
  await writeFile(statePath, JSON.stringify([...seen].slice(-500)), "utf8");
}

console.log("Nyas bank SMS forwarder started.");
for (;;) {
  try { await poll(); } catch (error) { console.error(new Date().toISOString(), error.message); }
  await new Promise((resolve) => setTimeout(resolve, pollMs));
}
