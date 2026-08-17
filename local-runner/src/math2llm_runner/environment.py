from __future__ import annotations

import importlib.metadata
import os
import platform
from functools import lru_cache
from typing import Any


def _package_version(package: str) -> str | None:
    try:
        return importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        return None


@lru_cache(maxsize=1)
def detect_environment() -> dict[str, Any]:
    """Return an allowlisted environment summary without local paths or identities."""

    torch_version = _package_version("torch")
    cuda_available = False
    cuda_version = None
    gpu_model = None

    if torch_version:
        try:
            import torch

            cuda_available = bool(torch.cuda.is_available())
            cuda_version = torch.version.cuda
            if cuda_available:
                gpu_model = torch.cuda.get_device_name(0)
        except Exception:
            # A broken optional PyTorch install must not take down health/pairing.
            pass

    cpu_model = platform.processor().strip() or platform.machine()
    return {
        "pythonVersion": platform.python_version(),
        "pytorchVersion": torch_version,
        "numpyVersion": _package_version("numpy"),
        "os": platform.system(),
        "cpu": cpu_model,
        "cpuCount": os.cpu_count(),
        "cudaAvailable": cuda_available,
        "gpuModel": gpu_model,
        "cudaVersion": cuda_version,
    }
