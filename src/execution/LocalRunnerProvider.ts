import type {
  ExecutionProvider,
  ExecutionRequest,
  ExecutionResult,
  LocalEnvironment,
  PairingRequest,
  PairingSession,
  RunnerHealth,
} from "./ExecutionProvider";

const DEFAULT_RUNNER_URL = "http://127.0.0.1:24680";

interface RunnerErrorPayload {
  error?: { code?: string; message?: string };
}

type LoopbackRequestInit = RequestInit & { targetAddressSpace?: "loopback" };

export class RunnerClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RunnerClientError";
  }
}

export class LocalRunnerProvider implements ExecutionProvider {
  readonly id = "local-runner";
  readonly label = "Math2LLM Local Runner";
  private sessionToken: string | null = null;

  constructor(private readonly baseUrl = DEFAULT_RUNNER_URL) {}

  hasSession() {
    return Boolean(this.sessionToken);
  }

  private async request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    if (this.sessionToken) headers.set("Authorization", `Bearer ${this.sessionToken}`);

    let response: Response;
    try {
      const requestInit: LoopbackRequestInit = {
        ...init,
        signal,
        headers,
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        targetAddressSpace: "loopback",
      };
      response = await fetch(`${this.baseUrl}${path}`, requestInit);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new RunnerClientError("runner_disconnected", "无法连接本机 Local Runner");
    }

    const payload = await response.json().catch(() => ({})) as T & RunnerErrorPayload;
    if (!response.ok) {
      const code = payload.error?.code ?? "runner_error";
      if (response.status === 401) this.sessionToken = null;
      throw new RunnerClientError(code, payload.error?.message ?? "Local Runner 请求失败", response.status);
    }
    return payload;
  }

  health(signal?: AbortSignal) {
    return this.request<RunnerHealth>("/health", { method: "GET" }, signal);
  }

  environment(signal?: AbortSignal) {
    return this.request<LocalEnvironment>("/environment", { method: "GET" }, signal);
  }

  requestPairing() {
    return this.request<PairingRequest>("/pair", {
      method: "POST",
      body: JSON.stringify({
        action: "request",
        clientName: "Math2LLM Web",
        requestedScopes: ["environment", "execute"],
      }),
    });
  }

  async confirmPairing(pairingId: string, code: string) {
    const session = await this.request<PairingSession>("/pair", {
      method: "POST",
      body: JSON.stringify({ action: "confirm", pairingId, code }),
    });
    this.sessionToken = session.sessionToken;
    return session;
  }

  runTests(request: ExecutionRequest) {
    return this.request<ExecutionResult>("/run-tests", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async disconnect() {
    if (!this.sessionToken) return;
    try {
      await this.request<{ status: string }>("/disconnect", {
        method: "POST",
        body: JSON.stringify({ action: "revoke" }),
      });
    } finally {
      this.sessionToken = null;
    }
  }
}

export const localRunnerProvider = new LocalRunnerProvider();
