# Math2LLM Local Runner

Math2LLM Local Runner 是只监听 `127.0.0.1:24680` 的 Python 代码执行服务。它仅接受已配置的 Math2LLM Origin，并要求通过终端显示的一次性配对码换取短期会话令牌。

```bash
python -m pip install -e ./local-runner
math2llm-runner
```

开发模式默认允许 `localhost/127.0.0.1` 的 `4173` 与 `4174` 端口。生产使用时必须显式配置官方站点：

```bash
math2llm-runner --production --allow-origin https://your-official-domain.example
```

Runner 会执行用户明确提交的 Python 代码。V1 提供进程、超时、输出、临时目录和环境变量边界，但不是面向敌意代码的完整容器沙箱。不要运行来源不明的代码。
