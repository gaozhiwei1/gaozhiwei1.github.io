import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { executeChallenge } from "./executor.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.JUDGE_PORT ?? 4174);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 150_000) throw new Error("请求体超过限制");
  }
  return JSON.parse(body || "{}");
}

export async function handleJudgeRequest(request, response) {
  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true, runtime: "python3", localOnly: true });
    return true;
  }

  if (request.method === "POST" && request.url === "/api/run") {
    try {
      const payload = await readJson(request);
      const result = await executeChallenge(payload);
      sendJson(response, result.ok ? 200 : 422, result);
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    }
    return true;
  }

  return false;
}

export function createJudgeServer() {
  return createServer(async (request, response) => {
    if (await handleJudgeRequest(request, response)) return;
    sendJson(response, 404, { ok: false, error: "Not found" });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createJudgeServer().listen(PORT, HOST, () => {
    console.log(`Local Python judge: http://${HOST}:${PORT}`);
  });
}
