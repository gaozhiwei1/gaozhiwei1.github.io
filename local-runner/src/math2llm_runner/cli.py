from __future__ import annotations

import argparse
import logging

from . import PROTOCOL_VERSION, RUNNER_VERSION
from .execution import ExecutionLimits, IsolatedExecutor
from .problems import PROBLEM_REGISTRY
from .security import PairingManager
from .server import RunnerConfig, create_server


DEVELOPMENT_ORIGINS = frozenset({
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:4174",
    "http://127.0.0.1:4174",
})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the loopback-only Math2LLM Python execution service")
    parser.add_argument("--port", type=int, default=24680, help="Loopback port (default: 24680)")
    parser.add_argument("--allow-origin", action="append", default=[], help="Exact website Origin to approve")
    parser.add_argument("--production", action="store_true", help="Disable default development Origins")
    parser.add_argument("--timeout", type=float, default=5.0, help="Execution timeout in seconds")
    parser.add_argument("--max-output-kb", type=int, default=64, help="Combined stdout/stderr limit")
    return parser


def _print_pairing_code(code: str, origin: str, pairing_id: str) -> None:
    print("\nMath2LLM pairing request", flush=True)
    print(f"  Origin: {origin}", flush=True)
    print(f"  Code:   {code}", flush=True)
    print("  Enter this code only in the Math2LLM page you intentionally opened.", flush=True)


def main() -> None:
    args = build_parser().parse_args()
    configured_origins = frozenset(args.allow_origin)
    if args.production and not configured_origins:
        raise SystemExit("--production requires at least one --allow-origin")
    allowed_origins = configured_origins if args.production else DEVELOPMENT_ORIGINS | configured_origins
    if not (1 <= args.port <= 65535):
        raise SystemExit("--port must be between 1 and 65535")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    pairing = PairingManager(on_pairing_code=_print_pairing_code)
    limits = ExecutionLimits(
        timeout_seconds=max(0.1, args.timeout),
        output_bytes=max(1, args.max_output_kb) * 1024,
    )
    executor = IsolatedExecutor(PROBLEM_REGISTRY, limits)
    config = RunnerConfig(allowed_origins=allowed_origins, port=args.port)
    server = create_server(config, pairing, executor)

    print(f"Math2LLM Local Runner {RUNNER_VERSION} · protocol {PROTOCOL_VERSION}", flush=True)
    print(f"Listening only on http://127.0.0.1:{args.port}", flush=True)
    print(f"Loaded {len(PROBLEM_REGISTRY)} supported exercises", flush=True)
    print("Approved Origins:", flush=True)
    for origin in sorted(allowed_origins):
        print(f"  - {origin}", flush=True)

    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        print("\nStopping Math2LLM Local Runner", flush=True)
    finally:
        server.server_close()
