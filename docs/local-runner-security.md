# Math2LLM Local Runner Security

## Trust boundary

Local Runner 会在用户自己的机器上执行用户明确从 Math2LLM 编辑器提交的 Python 代码。它不是云端多租户沙箱，也不声称可以安全运行来源不明的敌意代码。

安全目标是阻止普通网页未经同意把 localhost 当作远程控制接口，并限制意外失控代码的运行时间、输出和进程范围。

## Controls

### Loopback binding

服务端地址写死为 `127.0.0.1`。CLI 只允许修改端口，不提供 `--host`，从而避免误绑定到局域网。

### Exact Origin allowlist

所有端点，包括 `/health`，都验证浏览器的 `Origin`。响应只回显已经存在于配置集合中的精确 Origin；没有反射任意 Origin，也没有 `Access-Control-Allow-Origin: *`。

开发模式仅允许：

- `http://localhost:4173`
- `http://127.0.0.1:4173`
- `http://localhost:4174`
- `http://127.0.0.1:4174`

生产模式必须显式提供官方 HTTPS Origin：

```bash
math2llm-runner --production --allow-origin https://official.example
```

MDN 建议需要受控跨域访问时只返回指定 Origin，而不是无条件通配或反射请求值：[CORS security guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CORS)。

### Pairing and sessions

- 六位配对码由 `secrets` 生成，只显示在 Runner 终端。
- 配对请求绑定发起 Origin，默认 120 秒失效，每个请求最多尝试五次。
- 同一 Origin 最多同时保留三个 pending pairing，减少无界请求。
- Session token 使用 32-byte 级随机材料，只在 Runner 内存中保存 SHA-256 digest。
- Token 同时绑定 Origin 和 scopes：`environment`、`execute`。
- `/disconnect` 可立即撤销；Runner 重启会撤销全部会话。
- 网页不写入 Local Storage、Session Storage、Cookie 或 URL。

### Narrow API

Runner 只接受固定题库、Python 源码和枚举模式。没有 shell、命令执行、通用文件读写、环境变量或路径查询接口。环境端点使用字段白名单，不返回用户名、home、PATH、SSH 或任意环境变量。

### Subprocess execution

用户源码永远不在 HTTP server 进程内 `exec`：

- 每次执行创建新的 `TemporaryDirectory`；
- 使用当前环境的绝对 Python executable 和 `-I -B`；
- 工作目录限制在临时目录；
- 传入最小环境变量集合；
- stdin 关闭；
- 默认五秒 wall timeout；
- stdout + stderr 默认 64 KB；
- 源码默认 100 KB；
- 最多两个并行子进程；
- POSIX 下使用独立 process group，超时后 kill group；
- POSIX 下尽力限制 CPU、文件大小、打开文件数与进程数；
- finally/TemporaryDirectory 负责清理。

## Important V1 limitations

V1 的工作目录隔离不是 OS 级文件系统沙箱。Python 子进程仍以当前用户身份运行，理论上可以访问该用户本来有权访问的资源，也可能发起网络请求。Windows V1 只保证终止主 Python 进程，不保证完整 Job Object 级子进程树隔离。

因此：

1. 只运行用户亲自查看并提交的代码。
2. 不要把 Runner Origin 白名单加入不受控制的网站。
3. 不要把 V1 Runner 用作云端或多用户 Judge。
4. Cloud Submit 必须使用低权限容器/微虚拟机、只读基础镜像、网络隔离、cgroup/Job Object、独立队列与审计。

## Threats not solved by pairing alone

如果官方网站本身发生 XSS 或供应链入侵，攻击脚本可能在已配对会话内调用执行接口。内存令牌降低持久泄露面，但不能消除已授权页面被攻破的风险。生产网站仍必须使用严格 CSP、依赖审计、HTTPS、最小第三方脚本和发布完整性控制。
