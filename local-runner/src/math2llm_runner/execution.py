from __future__ import annotations

import json
import math
import os
import signal
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class ExecutionError(Exception):
    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass(frozen=True)
class ExecutionLimits:
    timeout_seconds: float = 5.0
    output_bytes: int = 64 * 1024
    source_bytes: int = 100 * 1024
    max_parallel_processes: int = 2


def _build_launcher(timeout_seconds: float, output_bytes: int) -> str:
    cpu_seconds = max(1, math.ceil(timeout_seconds) + 1)
    return f'''import os
import runpy

if os.name == "posix":
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, ({cpu_seconds}, {cpu_seconds}))
        resource.setrlimit(resource.RLIMIT_FSIZE, ({output_bytes * 2}, {output_bytes * 2}))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        if hasattr(resource, "RLIMIT_NPROC"):
            resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    except (ImportError, OSError, ValueError):
        pass

runpy.run_path("solution.py", run_name="__main__")
'''


def _build_harness(
    source_code: str,
    function_name: str,
    tests: list[dict[str, Any]],
    result_filename: str,
) -> str:
    serialized_tests = json.dumps(tests, ensure_ascii=False, separators=(",", ":"))
    return f'''{source_code}

# ---- Math2LLM Local Runner harness ----
import json as __m2l_json
import math as __m2l_math
import time as __m2l_time

__m2l_tests = __m2l_json.loads({serialized_tests!r})

def __m2l_close(actual, expected, tolerance):
    if isinstance(expected, list):
        return (
            isinstance(actual, (list, tuple))
            and len(actual) == len(expected)
            and all(__m2l_close(a, e, tolerance) for a, e in zip(actual, expected))
        )
    if isinstance(expected, dict):
        return (
            isinstance(actual, dict)
            and actual.keys() == expected.keys()
            and all(__m2l_close(actual[key], expected[key], tolerance) for key in expected)
        )
    if isinstance(expected, (int, float)) and not isinstance(expected, bool):
        return (
            isinstance(actual, (int, float))
            and __m2l_math.isfinite(float(actual))
            and abs(float(actual) - float(expected)) <= tolerance
        )
    return actual == expected

def __m2l_safe(value):
    try:
        __m2l_json.dumps(value, allow_nan=False)
        return value
    except Exception:
        return repr(value)[:500]

__m2l_results = []
for __m2l_index, __m2l_case in enumerate(__m2l_tests):
    __m2l_started = __m2l_time.perf_counter()
    try:
        __m2l_actual = {function_name}(*__m2l_case["args"])
        __m2l_tolerance = __m2l_case.get("tolerance", 1e-6)
        __m2l_passed = __m2l_close(__m2l_actual, __m2l_case["expected"], __m2l_tolerance)
        __m2l_error = None
    except Exception as __m2l_exception:
        __m2l_actual = None
        __m2l_passed = False
        __m2l_error = f"{{type(__m2l_exception).__name__}}: {{__m2l_exception}}"
    __m2l_private = __m2l_case.get("visibility") != "public"
    __m2l_results.append({{
        "index": __m2l_index + 1,
        "visibility": __m2l_case.get("visibility", "local"),
        "hidden": __m2l_private,
        "passed": __m2l_passed,
        "durationMs": round((__m2l_time.perf_counter() - __m2l_started) * 1000, 3),
        "input": None if __m2l_private else __m2l_safe(__m2l_case["args"]),
        "expected": None if __m2l_private else __m2l_safe(__m2l_case["expected"]),
        "actual": None if __m2l_private else __m2l_safe(__m2l_actual),
        "error": __m2l_error,
    }})

with open({result_filename!r}, "w", encoding="utf-8") as __m2l_result_file:
    __m2l_json.dump({{
        "passed": all(item["passed"] for item in __m2l_results),
        "passedCount": sum(1 for item in __m2l_results if item["passed"]),
        "totalCount": len(__m2l_results),
        "tests": __m2l_results,
    }}, __m2l_result_file, ensure_ascii=False, allow_nan=False)
'''


class IsolatedExecutor:
    def __init__(self, problem_registry: dict[str, dict[str, Any]], limits: ExecutionLimits | None = None):
        self.problem_registry = problem_registry
        self.limits = limits or ExecutionLimits()
        self._slots = threading.BoundedSemaphore(self.limits.max_parallel_processes)

    def _select_tests(self, problem: dict[str, Any], test_mode: str) -> list[dict[str, Any]]:
        public_tests = [{**test, "visibility": "public"} for test in problem["publicTests"]]
        if test_mode in {"public", "benchmark"}:
            return public_tests
        if test_mode == "local":
            return public_tests + [{**test, "visibility": "local"} for test in problem["localTests"]]
        raise ExecutionError("invalid_test_mode", "testMode must be public, local, or benchmark", 400)

    @staticmethod
    def _sanitized_environment(workspace: str) -> dict[str, str]:
        environment = {
            "PATH": os.defpath,
            "PYTHONHASHSEED": "0",
            "PYTHONIOENCODING": "utf-8",
            "PYTHONUTF8": "1",
            "MATH2LLM_RUNNER": "1",
            "TMP": workspace,
            "TEMP": workspace,
        }
        if os.name == "nt":
            for name in ("SystemRoot", "WINDIR"):
                if value := os.environ.get(name):
                    environment[name] = value
        return environment

    @staticmethod
    def _kill_process_tree(process: subprocess.Popen[bytes]) -> None:
        if process.poll() is not None:
            return
        try:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
        except (OSError, ProcessLookupError):
            process.kill()

    def execute(self, problem_id: str, language: str, source_code: str, test_mode: str) -> dict[str, Any]:
        if language.lower() not in {"python", "python3"}:
            raise ExecutionError("unsupported_language", "Only Python is supported in Local Runner V1", 400)
        if not isinstance(source_code, str) or not source_code.strip():
            raise ExecutionError("invalid_source", "sourceCode must be a non-empty string", 400)
        if len(source_code.encode("utf-8")) > self.limits.source_bytes:
            raise ExecutionError("source_too_large", "sourceCode exceeds the 100 KB limit", 413)

        problem = self.problem_registry.get(problem_id)
        if not problem:
            raise ExecutionError("unknown_problem", "Unknown problemId", 404)
        tests = self._select_tests(problem, test_mode)

        if not self._slots.acquire(blocking=False):
            raise ExecutionError("runner_busy", "Runner process limit reached; try again shortly", 429)
        try:
            return self._execute_in_workspace(problem_id, problem, tests, source_code, test_mode)
        finally:
            self._slots.release()

    def _execute_in_workspace(
        self,
        problem_id: str,
        problem: dict[str, Any],
        tests: list[dict[str, Any]],
        source_code: str,
        test_mode: str,
    ) -> dict[str, Any]:
        with tempfile.TemporaryDirectory(prefix="math2llm-runner-") as workspace:
            result_filename = f"result-{uuid.uuid4().hex}.json"
            source_path = Path(workspace, "solution.py")
            launcher_path = Path(workspace, "launcher.py")
            stdout_path = Path(workspace, "stdout.txt")
            stderr_path = Path(workspace, "stderr.txt")
            result_path = Path(workspace, result_filename)
            source_path.write_text(
                _build_harness(source_code, problem["functionName"], tests, result_filename),
                encoding="utf-8",
            )
            launcher_path.write_text(
                _build_launcher(self.limits.timeout_seconds, self.limits.output_bytes),
                encoding="utf-8",
            )

            popen_options: dict[str, Any] = {
                "cwd": workspace,
                "env": self._sanitized_environment(workspace),
                "stdin": subprocess.DEVNULL,
            }
            if os.name == "posix":
                popen_options["start_new_session"] = True
            elif os.name == "nt":
                popen_options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP

            started = time.monotonic()
            timed_out = False
            oversized_output = False
            with stdout_path.open("wb") as stdout_handle, stderr_path.open("wb") as stderr_handle:
                process = subprocess.Popen(
                    [sys.executable, "-I", "-B", str(launcher_path)],
                    stdout=stdout_handle,
                    stderr=stderr_handle,
                    **popen_options,
                )
                while process.poll() is None:
                    elapsed = time.monotonic() - started
                    output_size = stdout_path.stat().st_size + stderr_path.stat().st_size
                    if output_size > self.limits.output_bytes:
                        oversized_output = True
                        self._kill_process_tree(process)
                        break
                    if elapsed > self.limits.timeout_seconds:
                        timed_out = True
                        self._kill_process_tree(process)
                        break
                    time.sleep(0.02)
                try:
                    process.wait(timeout=1)
                except subprocess.TimeoutExpired:
                    self._kill_process_tree(process)
                    process.wait(timeout=1)

            final_output_size = stdout_path.stat().st_size + stderr_path.stat().st_size
            oversized_output = oversized_output or final_output_size > self.limits.output_bytes

            elapsed_ms = round((time.monotonic() - started) * 1000)
            stdout = stdout_path.read_bytes()[: self.limits.output_bytes].decode("utf-8", errors="replace")
            stderr = stderr_path.read_bytes()[: self.limits.output_bytes].decode("utf-8", errors="replace")
            if oversized_output:
                raise ExecutionError("output_limit", "Program output exceeded the 64 KB limit")
            if timed_out:
                raise ExecutionError("timeout", f"Execution exceeded {self.limits.timeout_seconds:g} seconds")
            if not result_path.exists():
                detail = stderr.strip() or f"Python exited with status {process.returncode}"
                return {
                    "ok": False,
                    "problemId": problem_id,
                    "testMode": test_mode,
                    "error": {"code": "runtime_error", "message": detail[:2000]},
                    "stdout": stdout,
                    "stderr": stderr,
                    "elapsedMs": elapsed_ms,
                }

            try:
                judge = json.loads(result_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as error:
                raise ExecutionError("invalid_result", f"Runner could not parse the test result: {error}") from error

            return {
                "ok": True,
                "problemId": problem_id,
                "testMode": test_mode,
                "judge": judge,
                "stdout": stdout,
                "stderr": stderr,
                "elapsedMs": elapsed_ms,
                "benchmark": {"wallTimeMs": elapsed_ms} if test_mode == "benchmark" else None,
            }
