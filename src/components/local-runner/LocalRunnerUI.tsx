import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Unplug,
  X,
} from "lucide-react";
import type { RunnerConnectionState } from "../../execution/ExecutionProvider";
import type { LocalRunnerController } from "../../execution/useLocalRunner";

const statusCopy: Record<RunnerConnectionState, string> = {
  detecting: "正在检测",
  disconnected: "未连接",
  unpaired: "等待配对",
  connected: "Local Runner connected",
  incompatible: "版本不兼容",
};

export function LocalRunnerStatusButton({ status, onClick }: { status: RunnerConnectionState; onClick: () => void }) {
  const className = status === "connected"
    ? "runner-status is-online"
    : status === "detecting"
      ? "runner-status is-checking"
      : "runner-status is-offline";
  return (
    <button className={className} type="button" onClick={onClick} aria-live="polite">
      <i /><span>{statusCopy[status]}</span><Info />
    </button>
  );
}

export function LocalRunnerConnection({ controller, onOpenSetup }: { controller: LocalRunnerController; onOpenSetup: () => void }) {
  const { status, environment, health } = controller;
  if (status === "connected" && environment) {
    const device = environment.gpuModel ?? `${environment.cpu || "CPU"}${environment.cpuCount ? ` · ${environment.cpuCount} cores` : ""}`;
    return (
      <section className="local-runner-band is-connected" aria-label="Local Environment">
        <div className="local-runner-band__identity"><CheckCircle2 /><span><b>Local Environment</b><small>代码在你的设备本地运行</small></span></div>
        <dl>
          <div><dt>Python</dt><dd>{environment.pythonVersion}</dd></div>
          <div><dt>PyTorch</dt><dd>{environment.pytorchVersion ?? "未安装"}</dd></div>
          <div><dt>Device</dt><dd>{device}</dd></div>
          <div><dt>CUDA</dt><dd>{environment.cudaAvailable ? environment.cudaVersion ?? "Available" : "Not available"}</dd></div>
        </dl>
        <button type="button" onClick={onOpenSetup}>连接设置</button>
      </section>
    );
  }

  return (
    <section className={`local-runner-band is-${status}`} aria-label="连接本地 Python 环境">
      <div className="local-runner-band__identity">
        {status === "incompatible" ? <AlertTriangle /> : status === "detecting" ? <RefreshCw /> : <Link2Off />}
        <span>
          <b>{status === "incompatible" ? "Local Runner 版本不兼容" : "连接本地 Python 环境"}</b>
          <small>{status === "unpaired" ? `已发现 Runner ${health?.runner_version ?? ""}，需要一次性配对` : "运行 Python / PyTorch 题需要 Math2LLM Local Runner"}</small>
        </span>
      </div>
      <p><ShieldCheck />代码在你的设备本地运行。Math2LLM 不需要访问你的个人文件。</p>
      <button type="button" onClick={onOpenSetup}>{status === "unpaired" ? "开始配对" : "查看安装方式"}</button>
    </section>
  );
}

const platformCommands = {
  windows: {
    label: "Windows",
    install: "py -m pip install -e .\\local-runner",
    start: "math2llm-runner",
  },
  macos: {
    label: "macOS",
    install: "python3 -m pip install -e ./local-runner",
    start: "math2llm-runner",
  },
  linux: {
    label: "Linux",
    install: "python3 -m pip install -e ./local-runner",
    start: "math2llm-runner",
  },
} as const;

type PlatformId = keyof typeof platformCommands;

export function LocalRunnerSetupDialog({
  controller,
  open,
  onClose,
}: {
  controller: LocalRunnerController;
  open: boolean;
  onClose: () => void;
}) {
  const [platform, setPlatform] = useState<PlatformId>("windows");
  const [pairingCode, setPairingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const command = useMemo(() => platformCommands[platform], [platform]);
  if (!open) return null;

  const requestPairing = async () => {
    setBusy(true);
    try {
      await controller.requestPairing();
    } catch {
      // The controller exposes the actionable error inside the dialog.
    } finally {
      setBusy(false);
    }
  };

  const confirmPairing = async () => {
    if (!/^\d{6}$/.test(pairingCode)) return;
    setBusy(true);
    try {
      await controller.confirmPairing(pairingCode);
      setPairingCode("");
      onClose();
    } catch {
      // Keep the dialog open so the user can correct or regenerate the code.
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await controller.disconnect();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="runner-setup-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="runner-setup" role="dialog" aria-modal="true" aria-labelledby="runner-setup-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><TerminalSquare /><span><small>LOCAL ENVIRONMENT</small><h2 id="runner-setup-title">连接 Math2LLM Local Runner</h2></span></div>
          <button type="button" onClick={onClose} aria-label="关闭 Local Runner 设置"><X /></button>
        </header>

        {controller.status === "connected" && controller.environment ? (
          <div className="runner-connected-detail">
            <div><CheckCircle2 /><span><b>已连接</b><small>Runner {controller.health?.runner_version} · Protocol {controller.health?.protocol_version}</small></span></div>
            <dl>
              <div><dt>Python</dt><dd>{controller.environment.pythonVersion}</dd></div>
              <div><dt>NumPy</dt><dd>{controller.environment.numpyVersion ?? "未安装"}</dd></div>
              <div><dt>PyTorch</dt><dd>{controller.environment.pytorchVersion ?? "未安装"}</dd></div>
              <div><dt>OS</dt><dd>{controller.environment.os}</dd></div>
              <div><dt>CPU</dt><dd>{controller.environment.cpu}</dd></div>
              <div><dt>GPU</dt><dd>{controller.environment.gpuModel ?? "未检测到 CUDA GPU"}</dd></div>
            </dl>
            <div className="runner-security-note"><ShieldCheck /><p><b>本地执行边界</b>令牌只保存在当前页面内存，关闭或刷新页面后需要重新配对。Runner 重启会撤销全部会话。</p></div>
            <div className="runner-setup__actions">
              <button type="button" className="secondary-action" onClick={disconnect} disabled={busy}><Unplug />断开连接</button>
              <button type="button" className="primary-action" onClick={async () => { await disconnect(); await requestPairing(); }} disabled={busy}><RefreshCw />重新配对</button>
            </div>
          </div>
        ) : (
          <>
            <div className="runner-platform-tabs" role="tablist" aria-label="操作系统">
              {(Object.keys(platformCommands) as PlatformId[]).map((id) => <button type="button" role="tab" aria-selected={platform === id} className={platform === id ? "is-active" : ""} onClick={() => setPlatform(id)} key={id}>{platformCommands[id].label}</button>)}
            </div>

            <ol className="runner-steps">
              <li><span>1</span><div><b>安装 Runner</b><small>V1 使用项目源码进行可编辑安装，尚未提供独立安装器。</small><code>{command.install}</code></div></li>
              <li><span>2</span><div><b>启动</b><small>服务仅监听 127.0.0.1:24680。</small><code>{command.start}</code></div></li>
              <li><span>3</span><div><b>返回网页并配对</b><small>Runner 会在终端显示一个两分钟内有效的六位代码。</small></div></li>
            </ol>

            {controller.status === "unpaired" && !controller.pairing && <button type="button" className="runner-pair-start" onClick={requestPairing} disabled={busy}><Link2 />{busy ? "正在请求" : "生成配对请求"}</button>}

            {controller.pairing && (
              <div className="runner-pair-confirm">
                <label htmlFor="runner-pair-code">输入 Runner 终端中的六位代码</label>
                <div><input id="runner-pair-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={pairingCode} onChange={(event) => setPairingCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /><button type="button" onClick={confirmPairing} disabled={busy || pairingCode.length !== 6}>{busy ? "正在确认" : "确认配对"}</button></div>
                <small>配对请求约 {controller.pairing.expiresIn} 秒后失效。不要输入其他网站要求的代码。</small>
              </div>
            )}

            {controller.error && <p className="runner-setup-error"><AlertTriangle />{controller.error}</p>}
            <button type="button" className="runner-redetect" onClick={() => void controller.detect()}><RefreshCw />重新检测</button>
          </>
        )}

        <footer><ShieldCheck /><p><b>代码在你的设备本地运行。</b>Math2LLM 网站没有 shell、文件读取或系统命令接口。</p></footer>
      </section>
    </div>
  );
}
