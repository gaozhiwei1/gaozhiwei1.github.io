import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const runner = spawn("python3", ["-m", "math2llm_runner", "--allow-origin", new URL(baseUrl).origin], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PYTHONPATH: `${process.cwd()}/local-runner/src`,
    PYTHONUNBUFFERED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let runnerOutput = "";
let runnerError = "";
runner.stdout.on("data", (chunk) => { runnerOutput += chunk.toString("utf8"); });
runner.stderr.on("data", (chunk) => { runnerError += chunk.toString("utf8"); });

async function waitForOutput(pattern, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const match = runnerOutput.match(pattern);
    if (match) return match;
    if (runner.exitCode !== null) throw new Error(`Runner exited early (${runner.exitCode}): ${runnerError}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for runner output ${pattern}: ${runnerOutput}\n${runnerError}`);
}

let browser;
try {
  await mkdir(".artifacts/visual-qa", { recursive: true });
  await waitForOutput(/Listening only on http:\/\/127\.0\.0\.1:24680/);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/#/code/stable-softmax`, { waitUntil: "networkidle" });
  await page.getByText("等待配对").first().waitFor();
  await page.locator(".runner-status").click();
  await page.getByRole("button", { name: "生成配对请求" }).click();
  const codeMatch = await waitForOutput(/Code:\s+(\d{6})/);
  await page.getByLabel("输入 Runner 终端中的六位代码").waitFor();
  await page.screenshot({ path: ".artifacts/visual-qa/local-runner-pairing.png", fullPage: false });
  await page.getByLabel("输入 Runner 终端中的六位代码").fill(codeMatch[1]);
  await page.getByRole("button", { name: "确认配对" }).click();

  await page.getByText("Local Runner connected").first().waitFor();
  assert(await page.getByText("Local Environment").first().isVisible(), "environment summary not visible");
  assert(await page.getByText("Python", { exact: true }).first().isVisible(), "Python version row missing");
  await page.screenshot({ path: ".artifacts/visual-qa/local-runner-connected.png", fullPage: false });

  await page.getByLabel("Python 代码编辑器").fill(`import math

def stable_softmax(values, temperature=1.0):
    scaled = [value / temperature for value in values]
    maximum = max(scaled)
    exponentials = [math.exp(value - maximum) for value in scaled]
    denominator = sum(exponentials)
    return [value / denominator for value in exponentials]
`);
  await page.getByRole("button", { name: "运行公开测试" }).click();
  await page.getByText("全部测试通过").waitFor();
  assert(await page.getByText("2/2 通过", { exact: false }).isVisible(), "public tests did not run locally");

  await page.getByRole("button", { name: "本地完整测试" }).click();
  await page.getByText("5/5 通过", { exact: false }).waitFor();
  await page.screenshot({ path: ".artifacts/visual-qa/local-runner-results.png", fullPage: false });
  assert.deepEqual(consoleErrors, [], `Browser errors before disconnect:\n${consoleErrors.join("\n")}`);

  runner.kill("SIGTERM");
  await new Promise((resolve) => runner.once("exit", resolve));
  await page.getByText("未连接").first().waitFor({ timeout: 10_000 });
  assert(await page.getByLabel("Python 代码编辑器").isVisible(), "coding page stopped working after disconnect");
  assert(consoleErrors.every((message) => message.includes("ERR_CONNECTION_REFUSED")), `Unexpected browser errors after disconnect:\n${consoleErrors.join("\n")}`);
  await context.close();
  console.log("Local Runner E2E passed: pair, environment, public tests, local tests, disconnect detection.");
} finally {
  if (runner.exitCode === null) runner.kill("SIGTERM");
  if (browser) await browser.close();
}
