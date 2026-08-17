import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = ".artifacts/saas-visual-qa";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

const routes = [
  ["login", "/login", "登录"],
  ["signup", "/signup", "创建账号"],
  ["account", "/account", "登录后查看账号"],
  ["pricing", "/pricing", "选择适合你的训练深度"],
  ["locked", "/learn/posttraining.dpo.derivation", "解锁 Math2LLM Pro"],
  ["payment-success", "/payment/success", "正在确认订阅"],
  ["payment-error", "/payment/error", "支付未完成"],
];
const viewports = [
  ["mobile", { width: 390, height: 844 }],
  ["tablet", { width: 768, height: 1024 }],
  ["desktop", { width: 1440, height: 1000 }],
];

for (const [viewportName, viewport] of viewports) {
  for (const [routeName, path, expectedText] of routes) {
    const name = `${viewportName}-${routeName}`;
    console.log(`Inspecting ${name}...`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      errors.push(`${name} pageerror: ${error.message}`),
    );
    page.on("requestfailed", (request) => {
      if (request.url().startsWith("http://127.0.0.1:24680/")) return;
      errors.push(
        `${name} requestfailed: ${request.url()} ${request.failure()?.errorText}`,
      );
    });
    await page.goto(`${baseUrl}/#${path}`, { waitUntil: "networkidle" });
    await page
      .locator(".main-content")
      .getByText(expectedText, { exact: false })
      .first()
      .waitFor();
    const layout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyText: document.body.innerText.length,
    }));
    assert(layout.bodyText > 120, `${name}: 页面内容异常为空`);
    assert(
      layout.scrollWidth <= layout.viewportWidth + 1,
      `${name}: 横向溢出 ${layout.scrollWidth} > ${layout.viewportWidth}`,
    );
    await page.screenshot({
      path: `${outputDir}/${name}.png`,
      fullPage: false,
    });
    await context.close();
  }
}

await browser.close();
assert.deepEqual(errors, [], errors.join("\n"));
console.log(
  "SaaS visual QA passed: 21 auth/account/pricing/paywall/payment states across 390/768/1440.",
);
