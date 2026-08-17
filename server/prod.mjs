import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleSaasRequest } from "./saas/http.mjs";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4173);
const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function serveStatic(request, response) {
  const requestPath = decodeURIComponent(
    new URL(request.url ?? "/", "http://localhost").pathname,
  );
  const relative = normalize(requestPath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  let target = join(DIST, relative || "index.html");
  try {
    if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    await access(target);
  } catch {
    target = join(DIST, "index.html");
  }
  response.writeHead(200, {
    "Content-Type": MIME[extname(target)] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": target.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
  });
  createReadStream(target).pipe(response);
}

const server = createServer(async (request, response) => {
  if (request.url?.startsWith("/api/")) {
    if (await handleSaasRequest(request, response)) return;
    response.writeHead(404, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  await serveStatic(request, response);
});

server.listen(PORT, HOST, () =>
  console.log(`Math2LLM production server: http://${HOST}:${PORT}`),
);
