# Math2LLM Local Runner Architecture

## Purpose

Math2LLM 的公开网站保持为普通静态/前端应用。代码实战不把源码提交到网站服务器，而是由浏览器显式连接用户机器上的 loopback Runner：

```text
Public Math2LLM Website (HTTPS)
              |
              | fetch + exact Origin + Bearer token
              v
Browser -> http://127.0.0.1:24680
              |
              | known problemId + Python source + fixed testMode
              v
Math2LLM Local Runner -> isolated Python subprocess
```

知识地图、学习、刷题和复习页不依赖 Runner。Runner 未安装或停止时，只有代码执行不可用。

## Components

### Web execution layer

`src/execution/ExecutionProvider.ts` 定义统一请求、测试结果和环境类型。`LocalRunnerProvider` 是当前实现，令牌只保存在 JavaScript 模块内存中。

`CloudJudgeProvider` 目前只有接口。后续可以实现：

```text
Run          -> LocalRunnerProvider
Cloud Submit -> CloudJudgeProvider
```

编辑器、题目说明和结果渲染不需要因此改写。

### Runner package

`local-runner/` 是独立 Python 包，安装后提供：

```bash
math2llm-runner
```

它固定绑定 `127.0.0.1`，默认端口 `24680`，不会监听 `0.0.0.0` 或局域网接口。V1 使用 Python 标准库 HTTP server，避免为了运行 Runner 强制安装 Web 框架。

### Problem manifest

Runner 不接受命令名或自定义 harness。`problemId` 必须存在于随包分发的 `problems.json`。该清单由现有 Node 题库机械生成：

```bash
npm run sync:runner-problems
```

清单只包含函数名、公开测试和本地测试，不包含参考答案。

## API protocol

Protocol version: `1.0`.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/health` | Origin | 最小版本与就绪信息 |
| `POST` | `/pair` | Origin + one-time code | 请求/确认配对 |
| `GET` | `/environment` | `environment` scope | 安全环境摘要 |
| `POST` | `/run` | `execute` scope | 仅公开测试 |
| `POST` | `/run-tests` | `execute` scope | `public/local/benchmark` 模式 |
| `POST` | `/disconnect` | `execute` scope | 撤销当前会话 |

不存在 `/shell`、文件读写或任意命令端点。

执行请求严格包含：

```json
{
  "problemId": "stable-softmax",
  "language": "python",
  "sourceCode": "...",
  "testMode": "public"
}
```

多余字段、未知题号、未知语言和未知模式均被拒绝。

## Pairing sequence

```text
Website POST /pair { action: request }
       -> Runner terminal displays six-digit code
Website user enters code intentionally
Website POST /pair { action: confirm, pairingId, code }
       -> random scoped session token
Website Authorization: Bearer <token>
```

配对码默认两分钟失效并限制尝试次数。Session 默认八小时失效，只保存 token 的 SHA-256 digest。Runner 重启会清除 pending pairings 和 sessions。

## Browser local-network behavior

Runner 对标准 CORS preflight 返回精确 `Access-Control-Allow-Origin`，绝不使用 `*`。它也兼容携带 `Access-Control-Request-Private-Network` 的旧 PNA preflight。较新的 Chromium 可能显示 Local Network Access/loopback 权限提示，用户需要在安全上下文中明确授权。

参考：[MDN CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)、[MDN Local network access](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access)、[Chrome Local Network Access](https://developer.chrome.com/blog/local-network-access)。

## Failure and reconnect behavior

网页每四秒进行一次短超时健康检测：

- Runner 停止：状态切换为“未连接”，其他页面继续可用。
- Runner 启动但未配对：显示“等待配对”。
- Protocol 不匹配：显示“版本不兼容”，不会执行。
- Runner 重启：旧 token 返回 `401`，网页清除内存会话并要求重新配对。
