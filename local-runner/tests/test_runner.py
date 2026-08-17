from __future__ import annotations

import http.client
import json
import threading
import unittest

from math2llm_runner import PROTOCOL_VERSION, RUNNER_VERSION
from math2llm_runner.execution import ExecutionLimits, IsolatedExecutor
from math2llm_runner.problems import PROBLEM_REGISTRY
from math2llm_runner.security import PairingManager, SecurityError
from math2llm_runner.server import RunnerConfig, create_server


ORIGIN = "http://127.0.0.1:4173"
EVIL_ORIGIN = "https://malicious.example"
TEST_PROBLEMS = {
    "test-problem": {
        "functionName": "solve",
        "publicTests": [{"args": [2], "expected": 4}],
        "localTests": [{"args": [5], "expected": 10}],
    },
}


class RunnerAPITest(unittest.TestCase):
    def setUp(self) -> None:
        self.pairing_codes: list[str] = []
        pairing = PairingManager(
            pairing_ttl_seconds=30,
            session_ttl_seconds=300,
            on_pairing_code=lambda code, _origin, _pairing_id: self.pairing_codes.append(code),
        )
        executor = IsolatedExecutor(
            TEST_PROBLEMS,
            ExecutionLimits(timeout_seconds=0.8, output_bytes=1024, max_parallel_processes=1),
        )
        config = RunnerConfig(allowed_origins=frozenset({ORIGIN}), port=0)
        self.server = create_server(config, pairing, executor)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)

    def request(
        self,
        method: str,
        path: str,
        payload: object | None = None,
        *,
        origin: str = ORIGIN,
        token: str | None = None,
        raw_body: bytes | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, object], dict[str, str]]:
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        headers = {"Origin": origin}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if extra_headers:
            headers.update(extra_headers)
        body = raw_body
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        connection.request(method, path, body=body, headers=headers)
        response = connection.getresponse()
        response_body = response.read()
        response_headers = {name: value for name, value in response.getheaders()}
        connection.close()
        parsed = json.loads(response_body) if response_body else {}
        return response.status, parsed, response_headers

    def pair(self) -> str:
        status, pending, _ = self.request("POST", "/pair", {
            "action": "request",
            "clientName": "Runner tests",
            "requestedScopes": ["environment", "execute"],
        })
        self.assertEqual(status, 200)
        self.assertNotIn("code", pending)
        status, session, _ = self.request("POST", "/pair", {
            "action": "confirm",
            "pairingId": pending["pairingId"],
            "code": self.pairing_codes[-1],
        })
        self.assertEqual(status, 200)
        return str(session["sessionToken"])

    def test_health_is_minimal_and_origin_specific(self) -> None:
        status, payload, headers = self.request("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload, {
            "status": "ready",
            "runner_version": RUNNER_VERSION,
            "protocol_version": PROTOCOL_VERSION,
        })
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        self.assertNotEqual(headers["Access-Control-Allow-Origin"], "*")

    def test_pairing_issues_random_expiring_session(self) -> None:
        first = self.pair()
        second = self.pair()
        self.assertNotEqual(first, second)
        self.assertGreaterEqual(len(first), 32)

    def test_invalid_pairing_code_and_token_are_rejected(self) -> None:
        _, pending, _ = self.request("POST", "/pair", {
            "action": "request",
            "clientName": "Runner tests",
            "requestedScopes": ["environment", "execute"],
        })
        status, payload, _ = self.request("POST", "/pair", {
            "action": "confirm",
            "pairingId": pending["pairingId"],
            "code": "999999" if self.pairing_codes[-1] != "999999" else "000000",
        })
        self.assertEqual(status, 401)
        self.assertEqual(payload["error"]["code"], "invalid_pairing_code")

        status, payload, _ = self.request("GET", "/environment", token="not-a-valid-token")
        self.assertEqual(status, 401)
        self.assertEqual(payload["error"]["code"], "invalid_token")

    def test_invalid_origin_is_rejected_without_cors_grant(self) -> None:
        status, payload, headers = self.request("GET", "/health", origin=EVIL_ORIGIN)
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "invalid_origin")
        self.assertNotIn("Access-Control-Allow-Origin", headers)

    def test_private_network_preflight_is_explicit(self) -> None:
        status, _, headers = self.request(
            "OPTIONS",
            "/run-tests",
            extra_headers={
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
                "Access-Control-Request-Private-Network": "true",
            },
        )
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        self.assertEqual(headers["Access-Control-Allow-Private-Network"], "true")

    def test_environment_detection_exposes_only_allowlisted_fields(self) -> None:
        token = self.pair()
        status, payload, _ = self.request("GET", "/environment", token=token)
        self.assertEqual(status, 200)
        self.assertEqual(set(payload), {
            "pythonVersion",
            "pytorchVersion",
            "numpyVersion",
            "os",
            "cpu",
            "cpuCount",
            "cudaAvailable",
            "gpuModel",
            "cudaVersion",
        })
        serialized = json.dumps(payload).lower()
        for forbidden in ("home", "username", "ssh", "path"):
            self.assertNotIn(forbidden, serialized)

    def test_public_and_local_tests_execute_in_subprocess(self) -> None:
        token = self.pair()
        request = {
            "problemId": "test-problem",
            "language": "python",
            "sourceCode": "def solve(value):\n    return value * 2\n",
            "testMode": "local",
        }
        status, payload, _ = self.request("POST", "/run-tests", request, token=token)
        self.assertEqual(status, 200)
        self.assertTrue(payload["judge"]["passed"])
        self.assertEqual(payload["judge"]["totalCount"], 2)
        hidden = payload["judge"]["tests"][1]
        self.assertTrue(hidden["hidden"])
        self.assertIsNone(hidden["input"])

    def test_timeout_is_killed(self) -> None:
        token = self.pair()
        status, payload, _ = self.request("POST", "/run-tests", {
            "problemId": "test-problem",
            "language": "python",
            "sourceCode": "while True:\n    pass\n\ndef solve(value):\n    return value * 2\n",
            "testMode": "public",
        }, token=token)
        self.assertEqual(status, 422)
        self.assertEqual(payload["error"]["code"], "timeout")

    def test_oversized_output_is_killed(self) -> None:
        token = self.pair()
        status, payload, _ = self.request("POST", "/run-tests", {
            "problemId": "test-problem",
            "language": "python",
            "sourceCode": "print('x' * 5000)\n\ndef solve(value):\n    return value * 2\n",
            "testMode": "public",
        }, token=token)
        self.assertEqual(status, 422)
        self.assertEqual(payload["error"]["code"], "output_limit")

    def test_unknown_problem_and_malformed_request(self) -> None:
        token = self.pair()
        status, payload, _ = self.request("POST", "/run-tests", {
            "problemId": "not-registered",
            "language": "python",
            "sourceCode": "def solve(value): return value",
            "testMode": "public",
        }, token=token)
        self.assertEqual(status, 404)
        self.assertEqual(payload["error"]["code"], "unknown_problem")

        status, payload, _ = self.request(
            "POST",
            "/run-tests",
            token=token,
            raw_body=b"{broken-json",
            extra_headers={"Content-Type": "application/json"},
        )
        self.assertEqual(status, 400)
        self.assertEqual(payload["error"]["code"], "malformed_request")

    def test_disconnect_revokes_session(self) -> None:
        token = self.pair()
        status, _, _ = self.request("POST", "/disconnect", {"action": "revoke"}, token=token)
        self.assertEqual(status, 200)
        status, payload, _ = self.request("GET", "/environment", token=token)
        self.assertEqual(status, 401)
        self.assertEqual(payload["error"]["code"], "invalid_token")


class ProblemManifestTest(unittest.TestCase):
    def test_manifest_contains_all_existing_exercises(self) -> None:
        self.assertEqual(len(PROBLEM_REGISTRY), 33)
        for problem_id, problem in PROBLEM_REGISTRY.items():
            self.assertTrue(problem["functionName"], problem_id)
            self.assertTrue(problem["publicTests"], problem_id)
            self.assertTrue(problem["localTests"], problem_id)


class PairingLifetimeTest(unittest.TestCase):
    def test_session_token_expires(self) -> None:
        now = [1_000.0]
        codes: list[str] = []
        manager = PairingManager(
            pairing_ttl_seconds=10,
            session_ttl_seconds=20,
            clock=lambda: now[0],
            on_pairing_code=lambda code, _origin, _pairing_id: codes.append(code),
        )
        pending = manager.request_pairing(ORIGIN, ["environment"])
        session = manager.confirm_pairing(ORIGIN, str(pending["pairingId"]), codes[-1])

        manager.authorize(ORIGIN, str(session["sessionToken"]), "environment")
        now[0] += 21

        with self.assertRaisesRegex(SecurityError, "invalid or expired") as context:
            manager.authorize(ORIGIN, str(session["sessionToken"]), "environment")
        self.assertEqual(context.exception.code, "invalid_token")


if __name__ == "__main__":
    unittest.main()
