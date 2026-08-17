from __future__ import annotations

import json
from importlib.resources import files
from typing import Any


def load_problem_registry() -> dict[str, dict[str, Any]]:
    manifest = files("math2llm_runner").joinpath("problems.json")
    with manifest.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise RuntimeError("Runner problem manifest must be a JSON object")
    return payload


PROBLEM_REGISTRY = load_problem_registry()
