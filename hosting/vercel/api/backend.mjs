import { Sandbox } from "@vercel/sandbox";

const root = "/vercel/sandbox/oy-orders";
async function startBackend(sandbox) {
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["hosting/vercel/start-backend.sh"],
    cwd: root,
  });
  if (result.exitCode !== 0) throw new Error("BACKEND_START_FAILED");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (
    [
      "https://oy-orders.vercel.app",
      "https://orca-orders-origins-2026.orcabay.chatgpt.site",
    ].includes(req.headers.origin)
  ) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }
  const url = new URL(req.url, "https://oy-orders.vercel.app");
  const path = url.searchParams.get("path") ?? "";
  if (
    !["health", "api/orders", "api/challenges", "paid/report"].includes(path) &&
    !/^api\/shop\/(?:plan|checkout|status|pass|redeem)$/.test(path) &&
    !/^api\/challenges\/[a-f0-9-]{36}$/.test(path) &&
    !/^api\/orders\/[a-f0-9-]{36}(?:\/(?:start|events|evidence|refund|refund-transaction))?$/.test(
      path,
    )
  )
    return res.status(404).json({ error: "ROUTE_NOT_FOUND" });
  if (!["GET", "POST", "OPTIONS"].includes(req.method))
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  if (req.method === "OPTIONS") return res.status(204).end();
  let body;
  if (req.method === "POST") {
    body = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(body) > 16384)
      return res.status(413).json({ error: "BODY_TOO_LARGE" });
  }
  try {
    const sandbox = await Sandbox.get({
      name: "oy-orders-backend",
      resume: true,
      onResume: startBackend,
    });
    const origin = new URL(sandbox.domain(8787));
    if (
      origin.protocol !== "https:" ||
      !origin.hostname.endsWith(".vercel.run")
    )
      throw new Error("INVALID_BACKEND_ORIGIN");
    url.searchParams.delete("path");
    const destination = new URL(`/${path}${url.search}`, origin);
    const headers = {};
    for (const key of ["content-type", "payment-signature", "x-payment"])
      if (typeof req.headers[key] === "string") headers[key] = req.headers[key];
    const response = await fetch(destination, {
      method: req.method,
      headers,
      body,
      redirect: "error",
      // A paid x402 response waits for Cardano confirmation. Read-only API
      // calls stay short; the payment route gets the existing 180-second bound.
      signal: AbortSignal.timeout(path === "paid/report" ? 185000 : 25000),
    });
    for (const key of [
      "content-type",
      "payment-required",
      "payment-response",
      "x-payment-response",
    ])
      if (response.headers.has(key))
        res.setHeader(key, response.headers.get(key));
    return res
      .status(response.status)
      .send(Buffer.from(await response.arrayBuffer()));
  } catch {
    return res
      .status(503)
      .json({ error: "LIVE_BACKEND_UNAVAILABLE", retryable: true });
  }
}
