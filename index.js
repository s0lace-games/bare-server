import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";
import https from "https";
import http from "http";
import { URL } from "url";

const bare = createBareServer("/", { logErrors: true });

const STRIP = [
  "x-frame-options", "content-security-policy",
  "content-security-policy-report-only",
  "cross-origin-embedder-policy", "cross-origin-opener-policy",
  "cross-origin-resource-policy",
];

function simpleProxy(targetUrl, res) {
  let u;
  try { u = new URL(targetUrl); } catch(e) {
    res.writeHead(400); res.end("Bad URL"); return;
  }
  const lib = u.protocol === "https:" ? https : http;
  const req2 = lib.request({
    hostname: u.hostname,
    port: u.port || (u.protocol === "https:" ? 443 : 80),
    path: u.pathname + u.search,
    method: "GET",
    headers: {
      "Host": u.hostname,
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Referer": "https://cinemaos.tech/",
      "Origin": "https://cinemaos.tech",
    }
  }, (r) => {
    const headers = Object.assign({}, r.headers);
    STRIP.forEach(k => { delete headers[k]; });
    headers["access-control-allow-origin"] = "*";
    headers["access-control-allow-headers"] = "*";
    res.writeHead(r.statusCode, headers);
    r.pipe(res);
  });
  req2.on("error", (e) => { res.writeHead(502); res.end(e.message); });
  req2.end();
}

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // /proxy MUST come before bare.shouldRoute — bare is mounted at "/" and
  // will swallow everything otherwise
  if (req.url.startsWith("/proxy")) {
    const params = new URL(req.url, "http://localhost").searchParams;
    const target = params.get("url");
    if (!target) { res.writeHead(400); res.end("Missing url param"); return; }
    simpleProxy(target, res);
    return;
  }

  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

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
