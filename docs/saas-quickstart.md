# Math2LLM 登录与付费启用清单

当前代码已经包含 Supabase Auth、RLS、FREE/PRO entitlement、Stripe Checkout、Customer Portal 和签名 Webhook。真正启用需要你创建自己的 Supabase/Stripe 资源并填写 `.env`。

## 1. 复制环境变量

```bash
cp .env.example .env
```

先运行：

```bash
npm run check:saas
```

它会明确告诉你还缺哪些配置。

## 2. Supabase

需要获得：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 只能存在服务端 `.env`，绝对不要加 `VITE_` 前缀，也不要提交到 Git。

然后把 `supabase/migrations/` 中现有 migration 应用到项目数据库。当前 migration 已包含 profiles、subscriptions、progress、submissions、bookmarks、review_items 与 RLS。

第一轮只测试 Email/Password：

1. 创建用户。
2. 如果启用邮件确认，完成邮箱确认。
3. 登录。
4. 完成一个知识点并刷新页面。
5. 退出再登录，确认 progress 仍在。
6. 用第二个账号验证不能读取第一个账号的数据。

Google/GitHub OAuth 等邮箱登录稳定后再开。

## 3. Stripe TEST MODE

先只使用 Test Mode，禁止直接接真钱。

创建一个 Math2LLM PRO subscription product，并至少创建 monthly recurring Price。将 Price ID 写入：

```text
STRIPE_PRO_MONTHLY_PRICE_ID
```

服务端还需要：

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

`APP_BASE_URL` 必须是当前真实访问地址，例如本地：

```text
http://127.0.0.1:4173
```

部署后改成正式 HTTPS 域名。

## 4. Webhook 闭环

必须验证这条链：

```text
FREE
→ Pricing
→ Stripe TEST Checkout
→ verified webhook
→ subscriptions.status=active
→ entitlement=PRO
→ PRO article can be fetched
```

访问 `/payment/success` 本身不会开通 PRO；只有签名验证通过的 webhook 才能更新订阅状态。

同时测试：

- 重复 webhook（必须幂等）
- invalid signature（必须拒绝）
- past_due（不能继续授予 PRO）
- cancellation
- Customer Portal

## 5. PRO 内容保护

PPO / DPO / GRPO 的 Gold Standard Markdown 现在位于：

```text
server/saas/premium-articles/
```

它们不会作为完整正文打进公开前端 bundle。PRO 用户通过：

```text
GET /api/premium/article/:topicId
```

在服务端完成 session + active PRO 验证后获取。

## 6. 上线前

至少通过：

```bash
npm run typecheck
npm run lint
npm test
npm run test:runner
npm run build
```

并手工检查：注册、登录、跨设备进度、Local Runner、TEST Checkout、Webhook、取消订阅、FREE/PRO 隔离。
