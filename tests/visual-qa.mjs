import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { strict as assert } from "node:assert";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = ".artifacts/visual-qa";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function inspectPage(name, path, viewport, interaction) {
  console.log(`Inspecting ${name}...`);
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text() === "Failed to load resource: net::ERR_CONNECTION_REFUSED") return;
    errors.push(`${name} console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("http://127.0.0.1:24680/")) return;
    errors.push(`${name} requestfailed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
  });
  page.on("pageerror", (error) => errors.push(`${name} pageerror: ${error.message}`));

  await page.goto(`${baseUrl}/#${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  if (interaction) await interaction(page);

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    visibleText: document.body.innerText.length,
  }));
  assert(layout.visibleText > 250, `${name}: 页面文本异常为空`);
  assert(layout.scroll <= layout.viewport + 1, `${name}: 存在横向溢出 ${layout.scroll} > ${layout.viewport}`);

  await page.screenshot({ path: `${outputDir}/${name}-viewport.png`, fullPage: false });
  await context.close();
}

async function assertPracticeColumns(page) {
  const bounds = await page.evaluate(() => {
    const practice = document.querySelector(".practice-layout")?.getBoundingClientRect();
    const answer = document.querySelector(".answer-pane")?.getBoundingClientRect();
    return practice && answer ? { practiceRight: practice.right, answerRight: answer.right, viewportRight: window.innerWidth } : null;
  });
  assert(bounds, "刷题页关键布局元素不存在");
  assert(bounds.answerRight <= bounds.practiceRight + 1, `答案栏被裁切：${bounds.answerRight} > ${bounds.practiceRight}`);
  assert(bounds.answerRight <= bounds.viewportRight + 1, `答案栏超出 viewport：${bounds.answerRight} > ${bounds.viewportRight}`);
}

await inspectPage("desktop-map", "/map", { width: 1440, height: 1000 }, async (page) => {
  assert.equal(await page.locator(".track-list > button").count(), 12, "知识地图首层必须只显示 12 个 Track");
  assert((await page.locator(".module-path li").count()) < 20, "首屏不应渲染全部 118 个节点");
  await page.getByRole("button", { name: "收起侧栏" }).click();
  const width = await page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().width);
  assert(width <= 73, `收起后的侧栏过宽：${width}`);
  await page.reload({ waitUntil: "networkidle" });
  const persistedWidth = await page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().width);
  assert(persistedWidth <= 73, `侧栏收起偏好未持久化：${persistedWidth}`);
  await page.getByRole("button", { name: "展开侧栏" }).click();
  const expandedWidth = await page.locator(".sidebar").evaluate((element) => element.getBoundingClientRect().width);
  assert(expandedWidth >= 240 && expandedWidth <= 250, `展开后的侧栏宽度不符合目标：${expandedWidth}`);
});

await inspectPage("desktop-attention", "/learn/transformer.attention.scaling", { width: 1440, height: 1000 }, async (page) => {
  const routeHash = await page.evaluate(() => window.location.hash);
  const tocItems = page.locator(".rail-block--toc button");
  for (let index = 0; index < await tocItems.count(); index += 1) {
    const item = tocItems.nth(index);
    const label = (await item.textContent())?.trim();
    await item.click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.location.hash), routeHash, `TOC「${label}」修改了路由 hash`);
  }
  await page.getByRole("button", { name: "为什么需要" }).click();
  await page.waitForFunction(() => {
    const top = document.getElementById("motivation")?.getBoundingClientRect().top ?? -1;
    return top >= 60 && top <= 100;
  });
  const sectionTop = await page.locator("#motivation").evaluate((element) => element.getBoundingClientRect().top);
  assert(sectionTop >= 60 && sectionTop <= 100, `TOC 滚动位置未避开 sticky header：${sectionTop}`);
  assert(await page.getByText("缩放项来自方差，而不是经验凑数").isVisible(), "Attention Math Insight 未渲染");
  const button = page.getByRole("button", { name: /展开完整推导|收起详细步骤/ }).first();
  if ((await button.textContent())?.includes("展开")) await button.click();
  assert(await page.getByText("累加方差").isVisible(), "Attention 推导中间步骤不可见");
});

await inspectPage("desktop-tokenizer", "/learn/tokenization.granularity", { width: 1440, height: 1000 }, async (page) => {
  await page.getByLabel("输入文本").fill("Math2LLM 测试 tokenizer");
  assert(await page.getByText("token 数").isVisible(), "Tokenizer 实验未渲染");
});

await inspectPage("desktop-kv-cache", "/learn/inference.cache.memory-bandwidth", { width: 1440, height: 1000 }, async (page) => {
  const heading = page.getByText("从缓存 Shape 推到 GiB");
  await heading.scrollIntoViewIfNeeded();
  assert(await heading.isVisible(), "KV Cache 推导不可见");
});

await inspectPage("desktop-ppo", "/learn/posttraining.ppo.clipping", { width: 1440, height: 1000 }, async (page) => {
  assert(await page.getByRole("heading", { name: "PPO Clipped Objective" }).first().isVisible(), "PPO PRO 预览标题未显示");
  assert(await page.getByRole("button", { name: "解锁 Math2LLM Pro" }).isVisible(), "PPO Paywall 缺少升级入口");
  assert.equal(await page.getByText("从 policy gradient 到 clipped surrogate").count(), 0, "匿名客户端不应渲染完整 PPO 推导");
});

await inspectPage("desktop-dpo", "/learn/posttraining.dpo.derivation", { width: 1440, height: 1000 }, async (page) => {
  assert(await page.getByRole("button", { name: "解锁 Math2LLM Pro" }).isVisible(), "DPO Paywall 缺少升级入口");
  assert.equal(await page.getByText("反解隐式奖励").count(), 0, "匿名客户端不应渲染 DPO 受保护推导");
});

await inspectPage("desktop-practice", "/practice/tr-02", { width: 1280, height: 900 }, async (page) => {
  const selectedOption = page.getByRole("button", { name: /使内积方差从约/ });
  await selectedOption.click();
  assert(await selectedOption.locator(".choice-state.is-selected").isVisible(), "选中选项的右侧圆点不可见");
  const indicator = await selectedOption.locator(".choice-state.is-selected").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  assert(indicator.width >= 17 && indicator.height >= 17, `选项圆点尺寸异常：${indicator.width}x${indicator.height}`);
  await page.getByRole("button", { name: "提交答案" }).click();
  assert(await page.getByText("回答正确").isVisible(), "答题反馈未显示");
  assert(await page.getByText("查看完整知识节点").isVisible(), "题目未链接详细知识点");
  await assertPracticeColumns(page);
});

await inspectPage("desktop-code", "/code/stable-softmax", { width: 1440, height: 1000 }, async (page) => {
  await page.getByText(/等待配对|未连接/).first().waitFor();
  assert.equal(await page.locator(".challenge-tabs").count(), 0, "代码页不应平铺 30 个标签");
  assert(await page.locator(".coding-curriculum-bar").isVisible(), "结构化代码题单不可见");
  assert(await page.getByText("代码在你的设备本地运行").first().isVisible(), "本地执行安全说明未显示");
  await page.getByRole("button", { name: "本地完整测试" }).click();
  assert(await page.getByRole("heading", { name: "连接 Math2LLM Local Runner" }).isVisible(), "未连接时没有打开安装与配对界面");
  assert(await page.getByRole("tab", { name: "Windows" }).isVisible(), "Runner 安装平台标签缺失");
  await page.getByRole("button", { name: "关闭 Local Runner 设置" }).click();
});

await inspectPage("desktop-navigation", "/map", { width: 1440, height: 1000 }, async (page) => {
  const journeys = [
    ["开始学习", "#/learn/"],
    ["面试刷题", "#/practice"],
    ["代码实战", "#/code/"],
    ["复习中心", "#/review"],
  ];
  for (const [label, expected] of journeys) {
    await page.getByRole("button", { name: new RegExp(label) }).first().click();
    await page.waitForTimeout(100);
    assert((await page.evaluate(() => window.location.hash)).startsWith(expected), `${label} 路由错误`);
    assert(await page.locator(".nav-item.is-active").getByText(label).isVisible(), `${label} 侧栏状态错误`);
    await page.goBack();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.location.hash), "#/map", `${label} 后退未返回知识地图`);
  }
  await page.locator(".module-path li button").first().click();
  assert((await page.evaluate(() => window.location.hash)).startsWith("#/learn/"), "知识地图节点未进入学习页");
  await page.goBack();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.location.hash), "#/map", "知识节点后退未返回知识地图");
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder(/KV Cache/).fill("DPO 隐式奖励推导");
  await page.locator(".command-results button").filter({ hasText: "DPO 隐式奖励推导" }).first().click();
  assert.equal(await page.evaluate(() => window.location.hash), "#/learn/posttraining.dpo.derivation", "搜索结果路由错误");
  const beforeNext = await page.evaluate(() => window.location.hash);
  await page.locator(".lesson-footer button").last().click();
  await page.waitForTimeout(100);
  const afterNext = await page.evaluate(() => window.location.hash);
  assert(afterNext.startsWith("#/learn/") && afterNext !== beforeNext, "下一知识点导航错误");
  await page.goBack();
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.location.hash), beforeNext, "章节后退行为错误");
});

await inspectPage("desktop-code-knowledge-link", "/code/stable-softmax", { width: 1440, height: 1000 }, async (page) => {
  await page.locator(".knowledge-link").click();
  assert.equal(await page.evaluate(() => window.location.hash), "#/learn/transformer.attention.softmax-stability", "代码题未跳到精确知识节点");
  await page.goto(`${baseUrl}/#/code/top-k`, { waitUntil: "networkidle" });
  await page.locator(".knowledge-link").click();
  assert.equal(await page.evaluate(() => window.location.hash), "#/learn/inference.generation.topk-topp", "Top-K 代码题未跳到共享知识节点");
});

await inspectPage("desktop-review", "/review", { width: 1440, height: 1000 }, async (page) => {
  assert(await page.getByText("今天应该复习什么？").isVisible(), "复习中心未以今日行动开场");
  assert(await page.getByRole("button", { name: /开始今日复习/ }).isVisible(), "今日复习入口不可见");
});

await inspectPage("tablet-map", "/map", { width: 768, height: 1024 });
await inspectPage("tablet-practice", "/practice/pt-04", { width: 768, height: 1024 }, async (page) => {
  assert(await page.getByRole("button", { name: /题目列表/ }).isVisible(), "平板题目抽屉入口不可见");
});
await inspectPage("mobile-attention", "/learn/transformer.attention.scaling", { width: 390, height: 844 }, async (page) => {
  assert(await page.getByText("Tensor Shape").first().isVisible(), "移动端 Tensor Shape 不可见");
});
await inspectPage("mobile-practice", "/practice/inf-01", { width: 390, height: 844 }, async (page) => {
  await page.locator('input[type="number"]').fill("4");
  await page.getByRole("button", { name: "提交答案" }).click();
  assert(await page.getByText("回答正确").isVisible(), "移动端计算题反馈未显示");
});
await inspectPage("mobile-code", "/code/stable-softmax", { width: 390, height: 844 }, async (page) => {
  assert(await page.getByLabel("Python 代码编辑器").isVisible(), "移动端代码编辑器未显示");
  assert(await page.getByRole("button", { name: "本地完整测试" }).isVisible(), "移动端本地测试按钮不可见");
});

await inspectPage("wide-learning", "/learn/transformer.attention.scaling", { width: 1920, height: 1080 }, async (page) => {
  const sizes = await page.evaluate(() => ({
    section: Number.parseFloat(getComputedStyle(document.querySelector(".node-section h2")).fontSize),
    intro: Number.parseFloat(getComputedStyle(document.querySelector(".node-header p")).fontSize),
    body: Number.parseFloat(getComputedStyle(document.querySelector(".node-section > p")).fontSize),
  }));
  assert(sizes.section >= 19 && sizes.section <= 24, `章节标题字号不符合紧凑阅读目标：${sizes.section}`);
  assert(sizes.intro >= 16 && sizes.intro <= 19, `引言字号不符合紧凑阅读目标：${sizes.intro}`);
  assert(sizes.body >= 15 && sizes.body <= 18, `正文字号不符合紧凑阅读目标：${sizes.body}`);
});

await browser.close();
assert.deepEqual(errors, [], `浏览器控制台错误：\n${errors.join("\n")}`);
console.log("Visual QA passed: 17 navigation and responsive scenarios across 390/768/1440/1920, with no horizontal overflow.");
