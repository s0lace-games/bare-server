import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";

const bare = createBareServer("/", { logErrors: true });

const STRIP_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
];

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (bare.shouldRoute(req)) {
    // Wrap res.writeHead to strip restrictive headers from proxied responses
    const _writeHead = res.writeHead.bind(res);
    res.writeHead = function(statusCode, statusMessage, headers) {
      const h = (typeof statusMessage === "object" ? statusMessage : headers) || {};
      STRIP_HEADERS.forEach(k => { delete h[k]; delete h[k.toLowerCase()]; });
      h["Access-Control-Allow-Origin"] = "*";
      h["Access-Control-Allow-Headers"] = "*";
      if (typeof statusMessage === "object") return _writeHead(statusCode, h);
      return _writeHead(statusCode, statusMessage, h);
    };
    bare.routeRequest(req, res);
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

// Keep Render free tier awake - ping self every 14 minutes
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    import("https").then(({ default: https }) => {
      https.get(SELF_URL, (res) => {
        console.log("Keep-alive ping:", res.statusCode);
      }).on("error", (e) => console.error("Ping error:", e.message));
    });
  }, 14 * 60 * 1000);
}

const PORT = process.env.PORT || 8081;
server.listen(PORT, "0.0.0.0", () => console.log("Bare server on port", PORT));
