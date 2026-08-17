from __future__ import annotations

import hashlib
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Callable, Iterable


class SecurityError(Exception):
    def __init__(self, code: str, message: str, status: int = 403):
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass
class PendingPairing:
    code_digest: str
    origin: str
    scopes: frozenset[str]
    expires_at: float
    attempts_remaining: int = 5


@dataclass
class Session:
    token_digest: str
    origin: str
    scopes: frozenset[str]
    expires_at: float


class PairingManager:
    ALLOWED_SCOPES = frozenset({"environment", "execute"})

    def __init__(
        self,
        *,
        pairing_ttl_seconds: int = 120,
        session_ttl_seconds: int = 8 * 60 * 60,
        clock: Callable[[], float] = time.time,
        on_pairing_code: Callable[[str, str, str], None] | None = None,
    ) -> None:
        self.pairing_ttl_seconds = pairing_ttl_seconds
        self.session_ttl_seconds = session_ttl_seconds
        self.clock = clock
        self.on_pairing_code = on_pairing_code
        self._pending: dict[str, PendingPairing] = {}
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _digest(value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _purge_expired(self) -> None:
        now = self.clock()
        self._pending = {key: value for key, value in self._pending.items() if value.expires_at > now}
        self._sessions = {key: value for key, value in self._sessions.items() if value.expires_at > now}

    def request_pairing(self, origin: str, requested_scopes: Iterable[str]) -> dict[str, object]:
        scopes = frozenset(requested_scopes)
        if not scopes or not scopes.issubset(self.ALLOWED_SCOPES):
            raise SecurityError("invalid_scope", "Pairing requested an unsupported scope", 400)

        with self._lock:
            self._purge_expired()
            active_for_origin = sum(1 for value in self._pending.values() if value.origin == origin)
            if active_for_origin >= 3:
                raise SecurityError("pairing_rate_limited", "Too many pending pairing requests", 429)

            pairing_id = secrets.token_urlsafe(18)
            code = f"{secrets.randbelow(1_000_000):06d}"
            expires_at = self.clock() + self.pairing_ttl_seconds
            self._pending[pairing_id] = PendingPairing(
                code_digest=self._digest(code),
                origin=origin,
                scopes=scopes,
                expires_at=expires_at,
            )

        if self.on_pairing_code:
            self.on_pairing_code(code, origin, pairing_id)
        return {
            "pairingId": pairing_id,
            "expiresIn": self.pairing_ttl_seconds,
            "scopes": sorted(scopes),
            "confirmationRequired": True,
        }

    def confirm_pairing(self, origin: str, pairing_id: str, code: str) -> dict[str, object]:
        with self._lock:
            self._purge_expired()
            pending = self._pending.get(pairing_id)
            if not pending or pending.origin != origin:
                raise SecurityError("invalid_pairing", "Pairing request is missing or expired", 401)
            if not secrets.compare_digest(pending.code_digest, self._digest(code)):
                pending.attempts_remaining -= 1
                if pending.attempts_remaining <= 0:
                    self._pending.pop(pairing_id, None)
                raise SecurityError("invalid_pairing_code", "Pairing code is invalid", 401)

            self._pending.pop(pairing_id, None)
            token = secrets.token_urlsafe(32)
            token_digest = self._digest(token)
            expires_at = self.clock() + self.session_ttl_seconds
            self._sessions[token_digest] = Session(
                token_digest=token_digest,
                origin=origin,
                scopes=pending.scopes,
                expires_at=expires_at,
            )

        return {
            "sessionToken": token,
            "expiresAt": int(expires_at),
            "scopes": sorted(pending.scopes),
        }

    def authorize(self, origin: str, token: str | None, required_scope: str) -> Session:
        if not token:
            raise SecurityError("missing_token", "A paired session token is required", 401)
        token_digest = self._digest(token)
        with self._lock:
            self._purge_expired()
            session = self._sessions.get(token_digest)
            if not session or session.origin != origin:
                raise SecurityError("invalid_token", "Session token is invalid or expired", 401)
            if required_scope not in session.scopes:
                raise SecurityError("insufficient_scope", "Session token lacks the required scope", 403)
            return session

    def revoke(self, origin: str, token: str | None) -> None:
        session = self.authorize(origin, token, "execute")
        with self._lock:
            self._sessions.pop(session.token_digest, None)
