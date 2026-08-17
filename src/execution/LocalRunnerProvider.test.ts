import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalRunnerProvider } from "./LocalRunnerProvider";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LocalRunnerProvider", () => {
  it("reports a disconnected runner without falling back to a public API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const provider = new LocalRunnerProvider("http://127.0.0.1:24680");

    await expect(provider.health()).rejects.toMatchObject({
      code: "runner_disconnected",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("pairs in memory and sends a scoped bearer token to run-tests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        pairingId: "pairing-id",
        expiresIn: 120,
        scopes: ["environment", "execute"],
        confirmationRequired: true,
      }))
      .mockResolvedValueOnce(jsonResponse({
        sessionToken: "random-session-token",
        expiresAt: 9999999999,
        scopes: ["environment", "execute"],
      }))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        judge: { passed: true, passedCount: 1, totalCount: 1, tests: [] },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new LocalRunnerProvider("http://127.0.0.1:24680");

    const pending = await provider.requestPairing();
    await provider.confirmPairing(pending.pairingId, "123456");
    const result = await provider.runTests({
      problemId: "stable-softmax",
      language: "python",
      sourceCode: "def stable_softmax(values): return values",
      testMode: "public",
    });

    expect(provider.hasSession()).toBe(true);
    expect(result.judge?.passed).toBe(true);
    const [url, init] = fetchMock.mock.calls[2] as [string, RequestInit & { targetAddressSpace?: string }];
    expect(url).toBe("http://127.0.0.1:24680/run-tests");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer random-session-token");
    expect(init.credentials).toBe("omit");
    expect(init.targetAddressSpace).toBe("loopback");
  });

  it("drops an expired token after a 401 response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        sessionToken: "expired-token",
        expiresAt: 1,
        scopes: ["environment", "execute"],
      }))
      .mockResolvedValueOnce(jsonResponse({
        error: { code: "invalid_token", message: "expired" },
      }, 401));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new LocalRunnerProvider();

    await provider.confirmPairing("pairing-id", "123456");
    expect(provider.hasSession()).toBe(true);
    await expect(provider.environment()).rejects.toMatchObject({ code: "invalid_token" });
    expect(provider.hasSession()).toBe(false);
  });
});
