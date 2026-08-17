import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleX,
  Code2,
  Eye,
  ListFilter,
  Play,
  RotateCcw,
  Send,
  TerminalSquare,
  X,
} from "lucide-react";
import { challengeKnowledgeNodeOverrides, codeChallengeById, codeChallenges } from "../data/codeChallenges";
import { useAuth } from "../auth/authContext";
import { curriculumTracks, knowledgeNodeById, knowledgeNodes, resolveTrackId, trackById } from "../data/curriculum";
import { useEntitlements } from "../entitlements/entitlementContext";
import type { ExecutionResult, TestMode } from "../execution/ExecutionProvider";
import { RunnerClientError } from "../execution/LocalRunnerProvider";
import { useLocalRunner } from "../execution/useLocalRunner";
import type { ProgressState } from "../types";
import { apiRequest } from "../lib/api";
import { useLearningProgress } from "../progress/learningProgressContext";
import { LocalRunnerConnection, LocalRunnerSetupDialog, LocalRunnerStatusButton } from "./local-runner/LocalRunnerUI";
import { ProPreview } from "./ProPreview";

interface CodeLabPageProps {
  challengeId?: string;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function CodeLabPage({ challengeId, progress, setProgress, navigate }: CodeLabPageProps) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const learning = useLearningProgress();
  const challenge = codeChallengeById[challengeId ?? ""] ?? codeChallenges[0];
  const accessible = entitlements.canAccessProblem(challenge.id);
  const [code, setCode] = useState(challenge.starterCode);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [running, setRunning] = useState<"public" | "local" | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const [runnerSetupOpen, setRunnerSetupOpen] = useState(false);
  const localRunner = useLocalRunner();
  const selectedTrackId = resolveTrackId(challenge.topicId);
  const trackChallenges = codeChallenges.filter((item) => resolveTrackId(item.topicId) === selectedTrackId);
  const relatedNode = knowledgeNodes.find((node) => node.codeChallengeId === challenge.id)
    ?? knowledgeNodeById[challengeKnowledgeNodeOverrides[challenge.id]];

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(code.split("\n").length, 18) }, (_, index) => index + 1),
    [code],
  );

  const execute = async (testMode: Extract<TestMode, "public" | "local">) => {
    if (localRunner.status !== "connected") {
      setRunnerSetupOpen(true);
      return;
    }
    setRunning(testMode);
    setResult(null);
    try {
      const payload = await localRunner.runTests({
        problemId: challenge.id,
        language: "python",
        sourceCode: code,
        testMode,
      });
      setResult(payload);
      void learning.recordSubmission(challenge.id, code, payload);
      if (testMode === "local" && payload.judge?.passed) {
        setProgress((current) => ({
          ...current,
          completedChallenges: current.completedChallenges.includes(challenge.id)
            ? current.completedChallenges
            : [...current.completedChallenges, challenge.id],
        }));
      }
    } catch (error) {
      const errorCode = error instanceof RunnerClientError ? error.code : "runner_error";
      const message = error instanceof Error ? error.message : "Local Runner 执行失败";
      const failedResult: ExecutionResult = { ok: false, error: { code: errorCode, message } };
      setResult(failedResult);
      void learning.recordSubmission(challenge.id, code, failedResult);
      if (["runner_disconnected", "invalid_token", "missing_token"].includes(errorCode)) setRunnerSetupOpen(true);
    } finally {
      setRunning(null);
    }
  };

  const loadSolution = async () => {
    if (!entitlements.canViewSolution()) {
      navigate("/pricing");
      return;
    }
    if (!auth.session) {
      navigate("/login");
      return;
    }
    if (showSolution) {
      setShowSolution(false);
      return;
    }
    setSolutionLoading(true);
    try {
      const payload = await apiRequest<{ sourceCode: string }>(`/api/premium/problem/${encodeURIComponent(challenge.id)}/solution`, {}, auth.session.access_token);
      setCode(payload.sourceCode);
      setShowSolution(true);
      setResult(null);
    } catch (solutionError) {
      setResult({ ok: false, error: { code: "solution_load_failed", message: solutionError instanceof Error ? solutionError.message : "参考解加载失败" } });
    } finally {
      setSolutionLoading(false);
    }
  };

  return (
    <div className="page page--code">
      <header className="code-page-header">
        <div><span className="eyebrow">LOCAL PYTHON JUDGE</span><h1>代码实战</h1></div>
        <LocalRunnerStatusButton status={localRunner.status} onClick={() => setRunnerSetupOpen(true)} />
      </header>

      <div className="coding-curriculum-bar" aria-label="代码训练课程导航">
        <div className="coding-curriculum-bar__label"><ListFilter /><span><b>结构化题单</b><small>{progress.completedChallenges.length}/{codeChallenges.length} 已通过</small></span></div>
        <label><span>训练方向</span><select value={selectedTrackId} onChange={(event) => {
          const first = codeChallenges.find((item) => resolveTrackId(item.topicId) === event.target.value);
          if (first) navigate(`/code/${first.id}`);
        }}>{curriculumTracks.filter((track) => codeChallenges.some((item) => resolveTrackId(item.topicId) === track.id)).map((track) => <option value={track.id} key={track.id}>{track.index} · {track.title}</option>)}</select></label>
        <label className="coding-problem-select"><span>当前题目</span><select value={challenge.id} onChange={(event) => navigate(`/code/${event.target.value}`)}>{trackChallenges.map((item, index) => <option value={item.id} key={item.id}>{progress.completedChallenges.includes(item.id) ? "✓" : String(index + 1).padStart(2, "0")} · {item.title} · {item.difficulty}</option>)}</select></label>
        <div className="coding-curriculum-bar__position"><strong>{codeChallenges.findIndex((item) => item.id === challenge.id) + 1}</strong><span>/ {codeChallenges.length}</span></div>
      </div>

      {!accessible && <ProPreview title={challenge.title} description={challenge.summary} inclusions={["完整题目约束与边界测试", "Local Runner 完整测试集", "受保护的参考实现", "复杂度与常见失败分析"]} navigate={navigate} />}

      {accessible && <LocalRunnerConnection controller={localRunner} onOpenSetup={() => setRunnerSetupOpen(true)} />}

      {accessible && <button className="problem-toggle" onClick={() => setProblemOpen(!problemOpen)}>
        <Code2 />题目与推导<ChevronDown />
      </button>}

      {accessible && <div className="code-lab-layout">
        <aside className={problemOpen ? "problem-pane is-open" : "problem-pane"}>
          <button className="problem-close" onClick={() => setProblemOpen(false)} aria-label="关闭题目说明"><X /></button>
          <div className="problem-heading">
            <div className="question-tags"><span className={`difficulty difficulty--${challenge.difficulty}`}>{challenge.difficulty}</span><span>{trackById[selectedTrackId].title}</span></div>
            <h2>{challenge.title}</h2>
            <p>{challenge.summary}</p>
          </div>

          <section><span>为什么要做这道题？</span><p>{challenge.motivation}</p></section>
          <section><span>函数签名</span><code className="signature-code">{challenge.functionSignature}</code></section>
          <section><span>实现要求</span><ol>{challenge.description.map((item) => <li key={item}>{item}</li>)}</ol></section>
          <section>
            <span>变量与 Shape</span>
            <dl className="parameter-list">{challenge.parameters.map((parameter) => <div key={parameter.name}><dt>{parameter.name}</dt><dd>{parameter.meaning}{parameter.shape && <small>{parameter.shape}</small>}</dd></div>)}</dl>
          </section>
          <section><span>样例</span>{challenge.examples.map((example, index) => <div className="code-example" key={example.input}><b>示例 {index + 1}</b><code>输入：{example.input}</code><code>输出：{example.output}</code><p>{example.explanation}</p></div>)}</section>
          <section><span>约束</span><ul>{challenge.constraints.map((item) => <li key={item}>{item}</li>)}</ul></section>
          {challenge.complexity && <section><span>复杂度</span><p>{challenge.complexity}</p></section>}
          {challenge.commonFailures?.length && <section><span>常见失败</span><ul>{challenge.commonFailures.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          <button className="knowledge-link" onClick={() => navigate(`/learn/${relatedNode?.id ?? challenge.topicId}`)}>{challenge.knowledgeLink}<ArrowRight /></button>
        </aside>

        <section className="editor-pane">
          <div className="editor-toolbar">
            <div><TerminalSquare /><span><b>solution.py</b><small>Python 3 · 本地运行</small></span></div>
            <div>
              <button title="恢复初始代码" onClick={() => { setCode(challenge.starterCode); setResult(null); }}><RotateCcw /></button>
              <button className={showSolution ? "is-active" : ""} disabled={solutionLoading} onClick={loadSolution}><Eye />{solutionLoading ? "加载中" : showSolution ? "已载入参考解" : entitlements.canViewSolution() ? "查看参考解" : "PRO 参考解"}</button>
            </div>
          </div>

          <div className="judge-actions">
            <div className="judge-actions__status"><span>Python 3</span><b>{result?.judge ? `Tests ${result.judge.passedCount}/${result.judge.totalCount}` : "Tests 未运行"}</b><small><AlertTriangle />代码仅在本机执行</small></div>
            <div><button className="run-button" disabled={Boolean(running)} onClick={() => execute("public")}><Play />{running === "public" ? "运行中" : "运行公开测试"}</button><button className="submit-button" disabled={Boolean(running)} onClick={() => execute("local")}><Send />{running === "local" ? "测试中" : "本地完整测试"}</button></div>
          </div>

          <div className="code-editor">
            <pre aria-hidden="true">{lineNumbers.map((number) => <span key={number}>{number}</span>)}</pre>
            <textarea
              aria-label="Python 代码编辑器"
              value={code}
              spellCheck={false}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const start = target.selectionStart;
                  const next = `${code.slice(0, start)}    ${code.slice(target.selectionEnd)}`;
                  setCode(next);
                  requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 4; });
                }
              }}
            />
          </div>

          <div className="console-pane">
            <div className="console-heading"><span>测试结果</span>{result?.judge && <b>{result.judge.passedCount}/{result.judge.totalCount} 通过 · {result.elapsedMs} ms</b>}</div>
            {!result && <div className="console-empty"><TerminalSquare /><p>运行样例后，这里会显示每个测试的输入、期望输出和实际输出。</p></div>}
            {result && !result.ok && <div className="runtime-error"><CircleX /><div><b>运行失败</b><pre>{result.error?.message}{result.stderr ? `\n${result.stderr}` : ""}</pre></div></div>}
            {result?.judge && (
              <div className="test-results">
                <div className={result.judge.passed ? "submission-summary is-passed" : "submission-summary is-failed"}>
                  {result.judge.passed ? <CheckCircle2 /> : <CircleX />}
                  <span><b>{result.judge.passed ? "全部测试通过" : "仍有测试未通过"}</b><small>{result.judge.passed ? "实现满足当前题目的样例与边界条件" : "检查第一个失败用例，再回到公式逐项核对"}</small></span>
                </div>
                {result.judge.tests.map((test) => (
                  <article className={test.passed ? "is-passed" : "is-failed"} key={test.index}>
                    {test.passed ? <CheckCircle2 /> : <CircleX />}
                    <div><b>{test.hidden ? `隐藏测试 ${test.index}` : `样例测试 ${test.index}`}</b><small>{test.durationMs} ms</small>{!test.hidden && <><code>输入：{formatValue(test.input)}</code><code>期望：{formatValue(test.expected)}</code><code>实际：{test.error ?? formatValue(test.actual)}</code></>}</div>
                  </article>
                ))}
              </div>
            )}
            {result?.stdout && <div className="program-output"><span>标准输出</span><pre>{result.stdout}</pre></div>}
          </div>
        </section>
      </div>}
      {problemOpen && <button className="problem-scrim" onClick={() => setProblemOpen(false)} aria-label="关闭题目说明" />}
      <LocalRunnerSetupDialog controller={localRunner} open={runnerSetupOpen} onClose={() => setRunnerSetupOpen(false)} />
    </div>
  );
}
