# Math2LLM / LLM 面试训练场

面向 LLM 算法工程师的数学化交互训练平台。当前版本包含 12 条课程主线、118 个稳定知识节点、150 道结构化面试题、30 道本地 Python 代码题，以及账号同步、FREE/PRO 权限和 Stripe TEST MODE 订阅链路。

核心学习循环：`动机 → 数学直觉 → 推导 → 实现 → 实验 → 面试`。

## 环境

- Node.js 20+
- npm 10+
- Python 3.10+（仅 Local Runner）

## 开发

```bash
npm install
npm run dev
```

`npm run dev` 会在 `http://127.0.0.1:4173` 启动统一的本机开发服务。开发模式保留旧判题接口用于回归测试；生产服务不暴露该入口，公开网站通过 Local Runner 在用户设备上执行代码。

端口被占用时可以指定其他端口：

```bash
PORT=4174 npm run dev
```

### Local Runner

面向公开网站的代码执行使用独立 Python Runner，而不是网站服务器：

```bash
python3 -m pip install -e ./local-runner
math2llm-runner
```

Runner 仅监听 `127.0.0.1:24680`。打开代码实战页后，网页会检测 Runner；点击配对后，将 Runner 终端显示的六位短期代码输入网页。会话令牌只保存在页面内存，刷新页面或重启 Runner 后需要重新配对。

生产域名需要显式加入 Origin 白名单：

```bash
math2llm-runner --production --allow-origin https://official.example
```

### Supabase 与 Stripe

复制 `.env.example` 为本地 `.env`，填写 Supabase 项目地址、浏览器可用的 anon key，以及仅供服务器读取的 service-role key。Stripe 开发必须使用 TEST MODE 的 Secret Key、Price ID 和 Webhook Secret；浏览器变量中不得出现任何服务端密钥。

完整配置顺序、数据库迁移与 Webhook 转发命令见：

- `docs/payment-setup.md`
- `docs/deployment-checklist.md`

没有凭证时，学习、免费题库与 Local Runner 仍可匿名使用；登录和支付页面会显示明确的未配置状态。

## 验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:runner
npm run test:runner:e2e
npm run test:saas:e2e
```

Supabase CLI 和容器运行时可用时，再执行数据库策略测试：

```bash
npm run test:db
```

## 目录

- `src/data/curriculum.ts`：Track → Module → Topic 的中心化课程模型
- `src/data/challengeGroups/`：按领域拆分的代码题定义
- `src/data/questions.ts`：面试树与知识节点检查题
- `src/components/`：知识地图、学习、刷题、代码与复习页面
- `src/content/PriorityDeepDive.tsx`：Attention、KV Cache、PPO、DPO、GRPO 等重点推导
- `src/components/labs/`：可交互原理实验
- `src/lib/`：显存、softmax、GRPO 与教学分词计算
- `server/saas/`：认证校验、订阅、Stripe Webhook 与受保护内容 API
- `server/prod.mjs`：生产静态站点及 SaaS API，不包含通用代码执行端点
- `local-runner/`：可独立安装、配对并执行固定题库的 Python Runner
- `supabase/`：PostgreSQL schema、RLS 策略和数据库测试
- `src/execution/`：Local/未来 Cloud 执行提供器协议
- `docs/content-audit.md`：Phase 2 内容与信息架构审计
- `docs/content-sources.md`：主要技术主题的一手资料索引
- `docs/local-runner-architecture.md`：浏览器到 localhost 的协议与未来 Cloud Submit 边界
- `docs/local-runner-security.md`：Origin、配对、进程隔离与 V1 限制
- `docs/auth-architecture.md`：Supabase Auth、会话与匿名进度迁移
- `docs/subscription-architecture.md`：FREE/PRO 权限和支付提供器边界
- `LLM_Interview_Handbook/`：现有 XeLaTeX 手册源文件
- `assets/`：现有讲义图片资产

## 当前边界

重点节点提供完整推导与实验，其余节点使用统一知识模板并已接入先修关系、面试题和层级进度。后续版本仍需将更多通用节点升级为独立手写深度内容，而不是增加首屏信息量。

Local Runner 使用临时目录、独立进程、运行超时、输出限制、清理和 Origin/会话校验，但不提供容器级文件系统或网络隔离，只适合在本地运行使用者明确提交的代码。未来公网 Cloud Submit 必须使用独立容器或微虚拟机判题架构。
