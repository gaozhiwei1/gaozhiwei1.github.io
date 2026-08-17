import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAuthService } from "./auth.mjs";
import {
  loadSaasConfig,
  publicCommerceConfig,
  requireServerConfiguration,
} from "./config.mjs";
import { StripePaymentProvider } from "./payments.mjs";
import { premiumTopicContent } from "./premium-content.mjs";
import { loadPremiumArticle } from "./premium-articles.mjs";
import { createSubscriptionRepository } from "./repository.mjs";
import { applicationPlan, hasProAccess } from "./subscriptions.mjs";

const MAX_JSON_BODY = 180_000;
let solutionCache;
let questionAnswerCache;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request, maxBytes = MAX_JSON_BODY) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes)
      throw Object.assign(new Error("请求体超过限制"), {
        code: "body_too_large",
        status: 413,
      });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const body = await readBody(request);
  try {
    return JSON.parse(body.toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("请求 JSON 格式无效"), {
      code: "malformed_request",
      status: 400,
    });
  }
}

async function loadSolutions() {
  if (!solutionCache) {
    const raw = await readFile(
      new URL("./solutions.json", import.meta.url),
      "utf8",
    );
    solutionCache = JSON.parse(raw);
  }
  return solutionCache;
}

async function loadQuestionAnswers() {
  if (!questionAnswerCache) {
    const raw = await readFile(
      new URL("./question-answers.json", import.meta.url),
      "utf8",
    );
    questionAnswerCache = JSON.parse(raw);
  }
  return questionAnswerCache;
}

function createRuntime(config, injected = {}) {
  requireServerConfiguration(config, "supabase");
  const supabase =
    injected.supabase ??
    createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  const repository =
    injected.repository ?? createSubscriptionRepository(supabase);
  const auth = injected.auth ?? createAuthService(supabase);
  return { supabase, repository, auth };
}

function createPayments(config, runtime, injected = {}) {
  requireServerConfiguration(config, "stripe");
  const stripe = injected.stripe ?? new Stripe(config.stripe.secretKey);
  return (
    injected.payments ??
    new StripePaymentProvider({
      stripe,
      repository: runtime.repository,
      config,
    })
  );
}

async function requirePro(request, runtime) {
  const identity = await runtime.auth.authenticate(request);
  const subscription = await runtime.repository.getSubscription(
    identity.user.id,
  );
  if (!hasProAccess(subscription)) {
    throw Object.assign(new Error("该内容需要 Math2LLM PRO"), {
      code: "pro_required",
      status: 403,
    });
  }
  return { ...identity, subscription };
}

export function createSaasHandler({
  config = loadSaasConfig(),
  ...injected
} = {}) {
  let runtime;
  let payments;
  const getRuntime = () => (runtime ??= createRuntime(config, injected));
  const getPayments = () =>
    (payments ??= createPayments(config, getRuntime(), injected));

  return async function handleSaasRequest(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = url.pathname;
    const isSaasRoute =
      path.startsWith("/api/commerce/") ||
      path.startsWith("/api/billing/") ||
      path.startsWith("/api/premium/") ||
      path === "/api/subscription" ||
      path === "/api/stripe/webhook";
    if (!isSaasRoute) return false;

    try {
      if (request.method === "GET" && path === "/api/commerce/config") {
        sendJson(response, 200, publicCommerceConfig(config));
        return true;
      }

      if (request.method === "GET" && path === "/api/subscription") {
        const identity = await getRuntime().auth.authenticate(request);
        const subscription = await getRuntime().repository.getSubscription(
          identity.user.id,
        );
        sendJson(response, 200, {
          plan: applicationPlan(subscription),
          status: subscription?.status ?? "free",
          provider: subscription?.provider ?? null,
          currentPeriodEnd: subscription?.current_period_end ?? null,
        });
        return true;
      }

      if (request.method === "POST" && path === "/api/billing/checkout") {
        const identity = await getRuntime().auth.authenticate(request);
        const body = await readJson(request);
        if (!["monthly", "annual"].includes(body.interval)) {
          throw Object.assign(new Error("interval 必须是 monthly 或 annual"), {
            code: "invalid_interval",
            status: 400,
          });
        }
        sendJson(
          response,
          200,
          await getPayments().createCheckout({
            user: identity.user,
            interval: body.interval,
          }),
        );
        return true;
      }

      if (request.method === "POST" && path === "/api/billing/portal") {
        const identity = await getRuntime().auth.authenticate(request);
        sendJson(
          response,
          200,
          await getPayments().createPortal({ user: identity.user }),
        );
        return true;
      }

      if (request.method === "POST" && path === "/api/stripe/webhook") {
        requireServerConfiguration(config, "webhook");
        const rawBody = await readBody(request, 1_000_000);
        const signature = request.headers["stripe-signature"];
        if (!signature)
          throw Object.assign(new Error("缺少 Stripe-Signature"), {
            code: "missing_signature",
            status: 400,
          });
        const event = getPayments().stripe.webhooks.constructEvent(
          rawBody,
          signature,
          config.stripe.webhookSecret,
        );
        const result = await getPayments().processEvent(event);
        sendJson(response, 200, {
          received: true,
          duplicate: result.duplicate,
        });
        return true;
      }

      if (request.method === "GET" && path.startsWith("/api/premium/article/")) {
        await requirePro(request, getRuntime());
        const topicId = decodeURIComponent(
          path.slice("/api/premium/article/".length),
        );
        const markdown = await loadPremiumArticle(topicId);
        if (!markdown)
          throw Object.assign(new Error("高级文章不存在"), {
            code: "premium_article_missing",
            status: 404,
          });
        sendJson(response, 200, { topicId, markdown });
        return true;
      }

      if (request.method === "GET" && path.startsWith("/api/premium/topic/")) {
        await requirePro(request, getRuntime());
        const topicId = decodeURIComponent(
          path.slice("/api/premium/topic/".length),
        );
        const content = premiumTopicContent[topicId];
        if (!content)
          throw Object.assign(new Error("高级内容不存在"), {
            code: "premium_content_missing",
            status: 404,
          });
        sendJson(response, 200, content);
        return true;
      }

      if (
        request.method === "GET" &&
        path.startsWith("/api/premium/problem/")
      ) {
        await requirePro(request, getRuntime());
        const suffix = path.slice("/api/premium/problem/".length);
        const problemId = decodeURIComponent(suffix.replace(/\/solution$/, ""));
        if (!suffix.endsWith("/solution"))
          throw Object.assign(new Error("Premium problem route not found"), {
            code: "not_found",
            status: 404,
          });
        const solution = (await loadSolutions())[problemId];
        if (!solution)
          throw Object.assign(new Error("参考解不存在"), {
            code: "solution_missing",
            status: 404,
          });
        sendJson(response, 200, { problemId, sourceCode: solution });
        return true;
      }

      if (
        request.method === "GET" &&
        path.startsWith("/api/premium/question/")
      ) {
        await requirePro(request, getRuntime());
        const suffix = path.slice("/api/premium/question/".length);
        const questionId = decodeURIComponent(suffix.replace(/\/answer$/, ""));
        if (!suffix.endsWith("/answer"))
          throw Object.assign(new Error("Premium question route not found"), {
            code: "not_found",
            status: 404,
          });
        const answer = (await loadQuestionAnswers())[questionId];
        if (!answer)
          throw Object.assign(new Error("高级题目答案不存在"), {
            code: "answer_missing",
            status: 404,
          });
        sendJson(response, 200, answer);
        return true;
      }

      sendJson(response, 405, {
        error: { code: "method_not_allowed", message: "Method not allowed" },
      });
      return true;
    } catch (error) {
      const isSignatureError =
        error?.type === "StripeSignatureVerificationError";
      const status = isSignatureError ? 400 : Number(error?.status ?? 500);
      const code = isSignatureError
        ? "invalid_signature"
        : (error?.code ?? "server_error");
      const message =
        status >= 500 && code === "server_error"
          ? "服务器暂时无法处理该请求"
          : String(error?.message ?? error);
      sendJson(response, status, { error: { code, message } });
      return true;
    }
  };
}

export const handleSaasRequest = createSaasHandler();
