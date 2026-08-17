import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serverChallenges } from "./challenges.mjs";

const TIMEOUT_MS = 5_000;
const OUTPUT_LIMIT = 64 * 1024;
const RESULT_MARKER = "__LLM_INTERVIEW_RESULT__";

function buildHarness(challenge, code, mode) {
  const visible = challenge.visibleTests.map((test) => ({ ...test, hidden: false }));
  const hidden = mode === "submit"
    ? challenge.hiddenTests.map((test) => ({ ...test, hidden: true }))
    : [];
  const tests = [...visible, ...hidden];

  return `${code}\n\n# ---- local judge harness ----\nimport json as __judge_json\nimport math as __judge_math\nimport time as __judge_time\n\n__judge_tests = __judge_json.loads(${JSON.stringify(JSON.stringify(tests))})\n\ndef __judge_close(actual, expected, tolerance):\n    if isinstance(expected, list):\n        return (\n            isinstance(actual, (list, tuple))\n            and len(actual) == len(expected)\n            and all(__judge_close(a, e, tolerance) for a, e in zip(actual, expected))\n        )\n    if isinstance(expected, (int, float)) and not isinstance(expected, bool):\n        return (\n            isinstance(actual, (int, float))\n            and __judge_math.isfinite(float(actual))\n            and abs(float(actual) - float(expected)) <= tolerance\n        )\n    return actual == expected\n\ndef __judge_safe(value):\n    try:\n        __judge_json.dumps(value, allow_nan=False)\n        return value\n    except Exception:\n        return repr(value)[:500]\n\n__judge_results = []\nfor __judge_index, __judge_case in enumerate(__judge_tests):\n    __judge_start = __judge_time.perf_counter()\n    try:\n        __judge_actual = ${challenge.functionName}(*__judge_case["args"])\n        __judge_tolerance = __judge_case.get("tolerance", 1e-6)\n        __judge_passed = __judge_close(__judge_actual, __judge_case["expected"], __judge_tolerance)\n        __judge_error = None\n    except Exception as __judge_exc:\n        __judge_actual = None\n        __judge_passed = False\n        __judge_error = f"{type(__judge_exc).__name__}: {__judge_exc}"\n    __judge_hidden = __judge_case.get("hidden", False)\n    __judge_results.append({\n        "index": __judge_index + 1,\n        "hidden": __judge_hidden,\n        "passed": __judge_passed,\n        "durationMs": round((__judge_time.perf_counter() - __judge_start) * 1000, 3),\n        "input": None if __judge_hidden else __judge_safe(__judge_case["args"]),\n        "expected": None if __judge_hidden else __judge_safe(__judge_case["expected"]),\n        "actual": None if __judge_hidden else __judge_safe(__judge_actual),\n        "error": __judge_error,\n    })\n\nprint("${RESULT_MARKER}" + __judge_json.dumps({\n    "passed": all(item["passed"] for item in __judge_results),\n    "passedCount": sum(1 for item in __judge_results if item["passed"]),\n    "totalCount": len(__judge_results),\n    "tests": __judge_results,\n}, ensure_ascii=False, allow_nan=False))\n`;
}

function terminateProcess(child) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill("SIGKILL");
    else process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

export async function executeChallenge({ challengeId, code, mode = "run" }) {
  const challenge = serverChallenges[challengeId];
  if (!challenge) throw new Error("未知代码题");
  if (typeof code !== "string" || code.length === 0) throw new Error("代码不能为空");
  if (code.length > 100_000) throw new Error("代码超过 100 KB 限制");
  if (!new Set(["run", "submit"]).has(mode)) throw new Error("未知运行模式");

  const directory = await mkdtemp(join(tmpdir(), "llm-interview-judge-"));
  const sourcePath = join(directory, "solution.py");
  await writeFile(sourcePath, buildHarness(challenge, code, mode), "utf8");

  try {
    return await new Promise((resolve) => {
      const child = spawn("python3", ["-I", "-u", sourcePath], {
        cwd: directory,
        detached: process.platform !== "win32",
        env: {
          PATH: process.env.PATH,
          PYTHONIOENCODING: "utf-8",
          PYTHONHASHSEED: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let finished = false;
      let timer;
      const startedAt = performance.now();

      const finish = (payload) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({ ...payload, elapsedMs: Math.round(performance.now() - startedAt) });
      };

      const appendOutput = (current, chunk) => {
        const next = current + chunk.toString("utf8");
        if (next.length > OUTPUT_LIMIT) {
          terminateProcess(child);
          finish({ ok: false, error: "输出超过 64 KB，进程已终止", stdout: stdout.slice(0, OUTPUT_LIMIT), stderr });
          return current;
        }
        return next;
      };

      child.stdout.on("data", (chunk) => { stdout = appendOutput(stdout, chunk); });
      child.stderr.on("data", (chunk) => { stderr = appendOutput(stderr, chunk); });
      child.on("error", (error) => finish({ ok: false, error: `无法启动 Python：${error.message}`, stdout, stderr }));
      child.on("close", (exitCode) => {
        if (finished) return;
        const markerIndex = stdout.lastIndexOf(RESULT_MARKER);
        if (markerIndex === -1) {
          finish({ ok: false, error: stderr || `程序退出，状态码 ${exitCode}`, stdout, stderr });
          return;
        }
        try {
          const judge = JSON.parse(stdout.slice(markerIndex + RESULT_MARKER.length).trim());
          finish({ ok: true, judge, stdout: stdout.slice(0, markerIndex).trim(), stderr });
        } catch (error) {
          finish({ ok: false, error: `判题结果解析失败：${error.message}`, stdout, stderr });
        }
      });

      timer = setTimeout(() => {
        terminateProcess(child);
        finish({ ok: false, error: `运行超过 ${TIMEOUT_MS / 1000} 秒，进程已终止`, stdout, stderr, timedOut: true });
      }, TIMEOUT_MS);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
