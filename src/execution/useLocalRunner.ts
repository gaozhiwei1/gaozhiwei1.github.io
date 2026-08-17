import { useCallback, useEffect, useState } from "react";
import type {
  ExecutionRequest,
  LocalEnvironment,
  PairingRequest,
  RunnerConnectionState,
  RunnerHealth,
} from "./ExecutionProvider";
import { localRunnerProvider, RunnerClientError } from "./LocalRunnerProvider";

const SUPPORTED_PROTOCOL = "1.0";

export function useLocalRunner() {
  const [status, setStatus] = useState<RunnerConnectionState>("detecting");
  const [health, setHealth] = useState<RunnerHealth | null>(null);
  const [environment, setEnvironment] = useState<LocalEnvironment | null>(null);
  const [pairing, setPairing] = useState<PairingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (showDetecting = false) => {
    if (showDetecting) setStatus("detecting");
    const healthController = new AbortController();
    const healthTimeout = window.setTimeout(() => healthController.abort(), 1_800);
    try {
      const nextHealth = await localRunnerProvider.health(healthController.signal);
      window.clearTimeout(healthTimeout);
      setHealth(nextHealth);
      if (nextHealth.protocol_version !== SUPPORTED_PROTOCOL) {
        setEnvironment(null);
        setStatus("incompatible");
        return;
      }
      if (!localRunnerProvider.hasSession()) {
        setEnvironment(null);
        setStatus("unpaired");
        return;
      }
      try {
        const environmentController = new AbortController();
        const environmentTimeout = window.setTimeout(() => environmentController.abort(), 5_000);
        try {
          const nextEnvironment = await localRunnerProvider.environment(environmentController.signal);
          setEnvironment(nextEnvironment);
          setStatus("connected");
          setError(null);
        } finally {
          window.clearTimeout(environmentTimeout);
        }
      } catch (environmentError) {
        if (environmentError instanceof RunnerClientError && ["invalid_token", "missing_token"].includes(environmentError.code)) {
          setEnvironment(null);
          setStatus("unpaired");
        } else {
          throw environmentError;
        }
      }
    } catch (nextError) {
      if (!(nextError instanceof DOMException && nextError.name === "AbortError")) {
        setError(nextError instanceof Error ? nextError.message : "Local Runner 检测失败");
      }
      setHealth(null);
      setEnvironment(null);
      setStatus("disconnected");
    } finally {
      window.clearTimeout(healthTimeout);
    }
  }, []);

  useEffect(() => {
    const initialDetection = window.setTimeout(() => void detect(true), 0);
    const interval = window.setInterval(() => void detect(false), 4_000);
    return () => {
      window.clearTimeout(initialDetection);
      window.clearInterval(interval);
    };
  }, [detect]);

  const requestPairing = useCallback(async () => {
    setError(null);
    try {
      const nextPairing = await localRunnerProvider.requestPairing();
      setPairing(nextPairing);
      setStatus("unpaired");
      return nextPairing;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "无法发起配对");
      throw nextError;
    }
  }, []);

  const confirmPairing = useCallback(async (code: string) => {
    if (!pairing) throw new RunnerClientError("missing_pairing", "请先生成配对请求");
    setError(null);
    try {
      await localRunnerProvider.confirmPairing(pairing.pairingId, code);
      setPairing(null);
      await detect(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "配对失败");
      throw nextError;
    }
  }, [detect, pairing]);

  const disconnect = useCallback(async () => {
    await localRunnerProvider.disconnect().catch(() => undefined);
    setEnvironment(null);
    setPairing(null);
    setStatus(health ? "unpaired" : "disconnected");
  }, [health]);

  const runTests = useCallback(async (request: ExecutionRequest) => {
    try {
      return await localRunnerProvider.runTests(request);
    } catch (nextError) {
      if (nextError instanceof RunnerClientError && nextError.code === "runner_disconnected") {
        setStatus("disconnected");
        setEnvironment(null);
      }
      if (nextError instanceof RunnerClientError && ["invalid_token", "missing_token"].includes(nextError.code)) {
        setStatus("unpaired");
        setEnvironment(null);
      }
      throw nextError;
    }
  }, []);

  return {
    status,
    health,
    environment,
    pairing,
    error,
    detect: () => detect(true),
    requestPairing,
    confirmPairing,
    disconnect,
    runTests,
  };
}

export type LocalRunnerController = ReturnType<typeof useLocalRunner>;
