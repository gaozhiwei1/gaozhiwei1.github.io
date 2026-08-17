import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { handleJudgeRequest } from "./index.mjs";
import { handleSaasRequest } from "./saas/http.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4173);

const vite = await createViteServer({
  appType: "spa",
  server: {
    middlewareMode: true,
    ws: { port: PORT + 10_000, clientPort: PORT + 10_000 },
  },
});

const server = createServer(async (request, response) => {
  if (
    request.url?.startsWith("/api/") &&
    (await handleSaasRequest(request, response))
  )
    return;
  if (
    request.url?.startsWith("/api/") &&
    (await handleJudgeRequest(request, response))
  )
    return;
  vite.middlewares(request, response);
});

server.listen(PORT, HOST, () => {
  console.log(`LLM Interview Lab: http://${HOST}:${PORT}`);
  console.log(
    "Vite UI, SaaS API and legacy local judge share the development server.",
  );
});

async function shutdown() {
  await vite.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
