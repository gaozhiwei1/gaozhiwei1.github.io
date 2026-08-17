export type TestMode = "public" | "local" | "benchmark";
export type RunnerConnectionState = "detecting" | "disconnected" | "unpaired" | "connected" | "incompatible";

export interface RunnerHealth {
  status: "ready";
  runner_version: string;
  protocol_version: string;
}

export interface LocalEnvironment {
  pythonVersion: string;
  pytorchVersion: string | null;
  numpyVersion: string | null;
  os: string;
  cpu: string;
  cpuCount: number | null;
  cudaAvailable: boolean;
  gpuModel: string | null;
  cudaVersion: string | null;
}

export interface PairingRequest {
  pairingId: string;
  expiresIn: number;
  scopes: string[];
  confirmationRequired: boolean;
}

export interface PairingSession {
  sessionToken: string;
  expiresAt: number;
  scopes: string[];
}

export interface ExecutionRequest {
  problemId: string;
  language: "python";
  sourceCode: string;
  testMode: TestMode;
}

export interface ExecutionTest {
  index: number;
  visibility: "public" | "local";
  hidden: boolean;
  passed: boolean;
  durationMs: number;
  input: unknown;
  expected: unknown;
  actual: unknown;
  error?: string | null;
}

export interface ExecutionResult {
  ok: boolean;
  problemId?: string;
  testMode?: TestMode;
  elapsedMs?: number;
  stdout?: string;
  stderr?: string;
  error?: { code: string; message: string };
  judge?: {
    passed: boolean;
    passedCount: number;
    totalCount: number;
    tests: ExecutionTest[];
  };
  benchmark?: { wallTimeMs: number } | null;
}

export interface ExecutionProvider {
  readonly id: string;
  readonly label: string;
  hasSession(): boolean;
  health(signal?: AbortSignal): Promise<RunnerHealth>;
  environment(signal?: AbortSignal): Promise<LocalEnvironment>;
  requestPairing(): Promise<PairingRequest>;
  confirmPairing(pairingId: string, code: string): Promise<PairingSession>;
  runTests(request: ExecutionRequest): Promise<ExecutionResult>;
  disconnect(): Promise<void>;
}

// Future cloud submission providers implement this contract without changing CodeLabPage.
export interface CloudJudgeProvider {
  readonly id: string;
  readonly label: string;
  submit(request: ExecutionRequest): Promise<{ submissionId: string }>;
}
