from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from . import PROTOCOL_VERSION, RUNNER_VERSION
from .environment import detect_environment
from .execution import ExecutionError, IsolatedExecutor
from .security import PairingManager, SecurityError


LOGGER = logging.getLogger("math2llm_runner")
MAX_REQUEST_BYTES = 150 * 1024


@dataclass(frozen=True)
class RunnerConfig:
    allowed_origins: frozenset[str]
    host: str = "127.0.0.1"
    port: int = 24680


class RequestError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.status = status


class RunnerService:
    def __init__(
        self,
        config: RunnerConfig,
        pairing: PairingManager,
        executor: IsolatedExecutor,
    ) -> None:
        self.config = config
        self.pairing = pairing
        self.executor = executor

    def validate_origin(self, origin: str | None) -> str:
        if not origin or origin not in self.config.allowed_origins:
            raise SecurityError("invalid_origin", "Origin is not approved for this runner", 403)
        return origin

    @staticmethod
    def bearer_token(headers: Any) -> str | None:
        authorization = headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        return token if scheme.lower() == "bearer" and token else None

    @staticmethod
    def validate_run_payload(payload: dict[str, Any]) -> tuple[str, str, str, str]:
        allowed_keys = {"problemId", "language", "sourceCode", "testMode"}
        if set(payload) != allowed_keys:
            raise RequestError("malformed_request", "Run request fields must exactly match the protocol")
        problem_id = payload.get("problemId")
        language = payload.get("language")
        source_code = payload.get("sourceCode")
        test_mode = payload.get("testMode")
        if not all(isinstance(value, str) for value in (problem_id, language, source_code, test_mode)):
            raise RequestError("malformed_request", "Run request fields must be strings")
        return problem_id, language, source_code, test_mode


class RunnerHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], service: RunnerService):
        self.service = service
        super().__init__(address, RunnerRequestHandler)


class RunnerRequestHandler(BaseHTTPRequestHandler):
    server: RunnerHTTPServer
    protocol_version = "HTTP/1.1"
    server_version = "Math2LLMRunner"
    sys_version = ""

    def log_message(self, format_string: str, *args: object) -> None:
        LOGGER.info("%s - %s", self.client_address[0], format_string % args)

    def _origin(self) -> str:
        return self.server.service.validate_origin(self.headers.get("Origin"))

    def _cors_headers(self, origin: str) -> dict[str, str]:
        return {
            "Access-Control-Allow-Origin": origin,
            "Vary": "Origin, Access-Control-Request-Private-Network",
        }

    def _send_json(self, status: int, payload: dict[str, Any], origin: str | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if origin:
            for name, value in self._cors_headers(origin).items():
                self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _send_error_payload(self, error: Exception, origin: str | None = None) -> None:
        status = getattr(error, "status", 500)
        code = getattr(error, "code", "internal_error")
        message = str(error) if status < 500 else "Runner encountered an internal error"
        self._send_json(status, {"error": {"code": code, "message": message}}, origin)

    def _read_json(self) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise RequestError("malformed_request", "Invalid Content-Length") from error
        if length <= 0 or length > MAX_REQUEST_BYTES:
            raise RequestError("malformed_request", "Request body is empty or too large", 413)
        try:
            payload = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RequestError("malformed_request", "Request body must be valid JSON") from error
        if not isinstance(payload, dict):
            raise RequestError("malformed_request", "Request body must be a JSON object")
        return payload

    def do_OPTIONS(self) -> None:
        try:
            origin = self._origin()
            if self.path not in {"/health", "/environment", "/pair", "/run", "/run-tests", "/disconnect"}:
                raise RequestError("not_found", "Unknown runner endpoint", 404)
            self.send_response(HTTPStatus.NO_CONTENT)
            for name, value in self._cors_headers(origin).items():
                self.send_header(name, value)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            if self.headers.get("Access-Control-Request-Private-Network", "").lower() == "true":
                self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Content-Length", "0")
            self.end_headers()
        except (SecurityError, RequestError) as error:
            self._send_error_payload(error)

    def do_GET(self) -> None:
        origin = None
        try:
            origin = self._origin()
            if self.path == "/health":
                self._send_json(200, {
                    "status": "ready",
                    "runner_version": RUNNER_VERSION,
                    "protocol_version": PROTOCOL_VERSION,
                }, origin)
                return
            if self.path == "/environment":
                token = self.server.service.bearer_token(self.headers)
                self.server.service.pairing.authorize(origin, token, "environment")
                self._send_json(200, detect_environment(), origin)
                return
            raise RequestError("not_found", "Unknown runner endpoint", 404)
        except (SecurityError, RequestError) as error:
            self._send_error_payload(error, origin)
        except Exception:
            LOGGER.exception("Unhandled GET failure")
            self._send_error_payload(RuntimeError("internal error"), origin)

    def do_POST(self) -> None:
        origin = None
        try:
            origin = self._origin()
            payload = self._read_json()
            if self.path == "/pair":
                self._handle_pair(origin, payload)
                return
            token = self.server.service.bearer_token(self.headers)
            if self.path == "/disconnect":
                if payload != {"action": "revoke"}:
                    raise RequestError("malformed_request", "Disconnect request must contain action=revoke")
                self.server.service.pairing.revoke(origin, token)
                self._send_json(200, {"status": "revoked"}, origin)
                return
            if self.path in {"/run", "/run-tests"}:
                self.server.service.pairing.authorize(origin, token, "execute")
                problem_id, language, source_code, test_mode = self.server.service.validate_run_payload(payload)
                if self.path == "/run" and test_mode != "public":
                    raise RequestError("invalid_test_mode", "/run only accepts public testMode")
                result = self.server.service.executor.execute(problem_id, language, source_code, test_mode)
                self._send_json(200 if result.get("ok") else 422, result, origin)
                return
            raise RequestError("not_found", "Unknown runner endpoint", 404)
        except (SecurityError, RequestError, ExecutionError) as error:
            self._send_error_payload(error, origin)
        except Exception:
            LOGGER.exception("Unhandled POST failure")
            self._send_error_payload(RuntimeError("internal error"), origin)

    def _handle_pair(self, origin: str, payload: dict[str, Any]) -> None:
        action = payload.get("action")
        if action == "request" and set(payload) == {"action", "clientName", "requestedScopes"}:
            if not isinstance(payload["clientName"], str) or not isinstance(payload["requestedScopes"], list):
                raise RequestError("malformed_request", "Invalid pairing request")
            response = self.server.service.pairing.request_pairing(origin, payload["requestedScopes"])
            self._send_json(200, response, origin)
            return
        if action == "confirm" and set(payload) == {"action", "pairingId", "code"}:
            if not isinstance(payload["pairingId"], str) or not isinstance(payload["code"], str):
                raise RequestError("malformed_request", "Invalid pairing confirmation")
            response = self.server.service.pairing.confirm_pairing(origin, payload["pairingId"], payload["code"])
            self._send_json(200, response, origin)
            return
        raise RequestError("malformed_request", "Unknown pairing action or fields")


def create_server(config: RunnerConfig, pairing: PairingManager, executor: IsolatedExecutor) -> RunnerHTTPServer:
    service = RunnerService(config, pairing, executor)
    return RunnerHTTPServer((config.host, config.port), service)
