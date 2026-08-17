import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleX,
  Code2,
  Filter,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import { questions } from "../data/questions";
import { curriculumTracks, knowledgeNodeById, resolveTrackId } from "../data/curriculum";
import { toggleItem } from "../lib/progress";
import { useEntitlements } from "../entitlements/entitlementContext";
import { useAuth } from "../auth/authContext";
import { apiRequest } from "../lib/api";
import { productConfig } from "../config/product";
import type { Difficulty, ProgressState, Question, QuestionCategory, QuestionFrequency } from "../types";
import { Formula } from "./Formula";
import { ProPreview } from "./ProPreview";

interface PracticePageProps {
  questionId?: string;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
}

type ResultState = "correct" | "incorrect" | "revealed" | null;

function QuestionWorkspace({
  question,
  result,
  setResult,
  progress,
  setProgress,
  navigate,
}: {
  question: Question;
  result: ResultState;
  setResult: (result: ResultState) => void;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [numeric, setNumeric] = useState("");
  const [draft, setDraft] = useState("");
  const index = questions.findIndex((item) => item.id === question.id);
  const bookmarked = progress.bookmarkedQuestions.includes(question.id);
  const mastered = progress.masteredQuestions.includes(question.id);

  const submit = () => {
    let nextResult: ResultState = "revealed";
    if (question.type === "single") nextResult = choice === question.correctChoice ? "correct" : "incorrect";
    if (question.type === "numeric") {
      const difference = Math.abs(Number(numeric) - (question.numericAnswer ?? 0));
      nextResult = numeric.trim() && difference <= (question.tolerance ?? 0) ? "correct" : "incorrect";
    }
    setResult(nextResult);
    setProgress((current) => {
      const previous = current.reviewHistory[question.id];
      const correct = nextResult === "correct";
      const streak = correct ? (previous?.correctStreak ?? 0) + 1 : 0;
      const intervals = [1, 3, 7, 14, 30, 60];
      return {
        ...current,
        completedQuestions: current.completedQuestions.includes(question.id)
          ? current.completedQuestions
          : [...current.completedQuestions, question.id],
        reviewHistory: {
          ...current.reviewHistory,
          [question.id]: {
            lastReviewedAt: new Date().toISOString(),
            correctStreak: streak,
            intervalDays: intervals[Math.min(streak, intervals.length - 1)],
          },
        },
      };
    });
  };

  const next = questions[index + 1] ?? questions[0];

  return (
    <div className="question-workspace">
      <section className="question-pane">
        <div className="question-heading">
          <div className="question-tags"><span className={`difficulty difficulty--${question.difficulty}`}>{question.difficulty}</span>{question.frequency && <span className="frequency-tag">{question.frequency}</span>}{question.category && <span>{question.category}</span>}{question.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <button
            className="icon-button"
            aria-label={bookmarked ? "取消收藏" : "收藏题目"}
            title={bookmarked ? "取消收藏" : "收藏题目"}
            onClick={() => setProgress((current) => ({ ...current, bookmarkedQuestions: toggleItem(current.bookmarkedQuestions, question.id) }))}
          >{bookmarked ? <BookmarkCheck /> : <Bookmark />}</button>
        </div>
        <span className="question-number">QUESTION {String(index + 1).padStart(2, "0")}</span>
        <h1>{question.title}</h1>
        <p className="question-prompt">{question.prompt}</p>

        {question.type === "single" && (
          <div className="choice-list">
            {question.choices?.map((item, choiceIndex) => {
              const selected = choice === choiceIndex;
              const isCorrect = result && choiceIndex === question.correctChoice;
              const isWrong = result === "incorrect" && selected && choiceIndex !== question.correctChoice;
              return (
                <button
                  type="button"
                  className={`${selected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                  key={item}
                  onClick={() => !result && setChoice(choiceIndex)}
                  disabled={Boolean(result)}
                  aria-pressed={selected}
                >
                  <span className="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span>
                  <p>{item}</p>
                  <span className={`choice-state ${selected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`} aria-hidden="true">
                    {isCorrect ? <CheckCircle2 /> : isWrong ? <CircleX /> : <i />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "numeric" && (
          <label className="numeric-answer"><span>填写计算结果</span><div><input type="number" value={numeric} onChange={(event) => setNumeric(event.target.value)} disabled={Boolean(result)} placeholder="输入数值" /><b>{question.unit}</b></div></label>
        )}

        {question.type === "self" && (
          <div className="draft-area"><label htmlFor="answer-draft">口述草稿 / 答题要点</label><textarea id="answer-draft" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={Boolean(result)} placeholder="先用自己的话回答，再展开评分点……" /></div>
        )}

        <div className="question-actions">
          {!result ? (
            <button className="primary-action" type="button" onClick={submit} disabled={question.type === "single" ? choice === null : question.type === "numeric" ? !numeric : false}>
              <Check size={18} />{question.type === "self" ? "查看评分点" : "提交答案"}
            </button>
          ) : (
            <button className="secondary-action" type="button" onClick={() => { setResult(null); navigate(`/practice/${next.id}`); }}>下一题<ArrowRight /></button>
          )}
          {result && <button className="text-action" onClick={() => { setResult(null); setChoice(null); setNumeric(""); }}><RotateCcw />重新作答</button>}
        </div>
      </section>

      <aside className={result ? "answer-pane is-visible" : "answer-pane"}>
        {!result ? (
          <div className="answer-placeholder"><Lightbulb /><strong>分层揭示答案</strong><p>提交后显示 20 秒回答、深入解释和面试官继续追问。先组织因果关系，不要急着背结论。</p></div>
        ) : (
          <div className="answer-content">
            <div className={`answer-verdict verdict--${result}`}>
              {result === "correct" ? <CheckCircle2 /> : result === "incorrect" ? <CircleX /> : <Lightbulb />}
              <span><b>{result === "correct" ? "回答正确" : result === "incorrect" ? "再检查一遍因果链" : "对照评分点"}</b><small>{question.reference}</small></span>
            </div>
            <section><span>20 秒回答</span><p className="short-answer">{question.shortAnswer}</p></section>
            {question.knowledgePoints && (
              <section className="answer-knowledge"><span>知识点拆解</span><ul>{question.knowledgePoints.map((point) => <li key={point}>{point}</li>)}</ul></section>
            )}
            {question.equations && question.equations.length > 0 && (
              <section className="answer-equations"><span>关键公式</span><div>{question.equations.map((equation) => <Formula block key={equation}>{equation}</Formula>)}</div></section>
            )}
            {question.derivation && (
              <section className="answer-derivation">
                <span>逐步推导</span>
                <div>{question.derivation.map((step, stepIndex) => <article key={step.title}><b>{stepIndex + 1}</b><div><strong>{step.title}</strong>{step.formula && <Formula block>{step.formula}</Formula>}<p>{step.detail}</p></div></article>)}</div>
              </section>
            )}
            {question.explanation && <section><span>深入解释</span><p>{question.explanation}</p></section>}
            {question.pitfalls && question.pitfalls.length > 0 && (
              <section className="answer-pitfalls"><span>容易答错</span><ul>{question.pitfalls.map((item) => <li key={item}>{item}</li>)}</ul></section>
            )}
            {question.followUps.length > 0 && <section><span>面试官继续追问</span><ol>{question.followUps.map((item) => <li key={item}>{item}</li>)}</ol></section>}
            {question.sourceTags && question.sourceTags.length > 0 && <p className="answer-source-tags">来源标签：{question.sourceTags.join(" · ")}</p>}
            {question.nodeId && <button className="answer-knowledge-link" onClick={() => navigate(`/learn/${question.nodeId}`)}><Lightbulb /><span><b>查看完整知识节点</b><small>{knowledgeNodeById[question.nodeId]?.title ?? question.reference}</small></span><ArrowRight /></button>}
            {question.codeChallengeId && <button className="answer-code-link" onClick={() => navigate(`/code/${question.codeChallengeId}`)}><Code2 /><span><b>用代码验证这个知识点</b><small>进入本地 Python 判题平台</small></span><ArrowRight /></button>}
            <button
              className={mastered ? "master-button is-mastered" : "master-button"}
              onClick={() => setProgress((current) => ({ ...current, masteredQuestions: toggleItem(current.masteredQuestions, question.id) }))}
            >
              <CheckCircle2 />{mastered ? "已标记掌握" : "标记为已掌握"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function PracticePage({ questionId, progress, setProgress, navigate }: PracticePageProps) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const selectedQuestion = questions.find((question) => question.id === questionId) ?? questions[0];
  const selectedQuestionIndex = questions.findIndex((question) => question.id === selectedQuestion.id);
  const accessible = entitlements.canAccessQuestion(selectedQuestionIndex);
  const protectedAnswerRequired = selectedQuestionIndex >= productConfig.freeQuestionLimit;
  const [protectedAnswer, setProtectedAnswer] = useState<Partial<Question> | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const hydratedQuestion = protectedAnswer ? { ...selectedQuestion, ...protectedAnswer } : selectedQuestion;
  const [result, setResult] = useState<ResultState>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [category, setCategory] = useState<QuestionCategory | "all">("all");
  const [frequency, setFrequency] = useState<QuestionFrequency | "all">("all");
  const [listOpen, setListOpen] = useState(false);
  const selectedTrackId = selectedQuestion.nodeId
    ? knowledgeNodeById[selectedQuestion.nodeId]?.trackId ?? resolveTrackId(selectedQuestion.topicId)
    : resolveTrackId(selectedQuestion.topicId);
  const [openTracks, setOpenTracks] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("math2llm-practice-groups") ?? "[]") as string[];
      return [...new Set([...stored, selectedTrackId])];
    } catch {
      return [selectedTrackId];
    }
  });

  useEffect(() => {
    if (!accessible || !protectedAnswerRequired || !auth.session) return;
    let active = true;
    queueMicrotask(() => { if (active) setAnswerLoading(true); });
    void apiRequest<Partial<Question>>(`/api/premium/question/${encodeURIComponent(selectedQuestion.id)}/answer`, {}, auth.session.access_token)
      .then((answer) => { if (active) setProtectedAnswer(answer); })
      .catch(() => { if (active) setProtectedAnswer(null); })
      .finally(() => { if (active) setAnswerLoading(false); });
    return () => { active = false; };
  }, [accessible, auth.session, protectedAnswerRequired, selectedQuestion.id]);

  const filteredQuestions = useMemo(
    () => questions.filter((question) =>
      (difficulty === "all" || question.difficulty === difficulty)
      && (category === "all" || question.category === category)
      && (frequency === "all" || question.frequency === frequency)
    ),
    [category, difficulty, frequency],
  );
  const groupedQuestions = useMemo(() => curriculumTracks.map((track) => ({
    track,
    questions: filteredQuestions.filter((question) => {
      const trackId = question.nodeId
        ? knowledgeNodeById[question.nodeId]?.trackId ?? resolveTrackId(question.topicId)
        : resolveTrackId(question.topicId);
      return trackId === track.id;
    }),
  })).filter((group) => group.questions.length), [filteredQuestions]);

  const toggleTrack = (trackId: string) => {
    const next = openTracks.includes(trackId)
      ? openTracks.filter((id) => id !== trackId)
      : [...openTracks, trackId];
    setOpenTracks(next);
    localStorage.setItem("math2llm-practice-groups", JSON.stringify(next));
  };

  return (
    <div className="page page--practice">
      <header className="practice-toolbar">
        <div><span className="eyebrow">INTERVIEW PRACTICE</span><h1>面试刷题</h1></div>
        <button className="question-list-toggle" onClick={() => setListOpen(!listOpen)}><Filter />题目列表<ChevronDown /></button>
        <div className="filter-group">
          <label>难度<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "all")}><option value="all">全部难度</option><option>基础</option><option>进阶</option><option>困难</option></select></label>
          <label>题型<select value={category} onChange={(event) => setCategory(event.target.value as QuestionCategory | "all")}><option value="all">全部题型</option><option>基础理解</option><option>数学推导</option><option>工程理解</option><option>Debugging</option><option>System Design</option></select></label>
          <label>频率<select value={frequency} onChange={(event) => setFrequency(event.target.value as QuestionFrequency | "all")}><option value="all">全部频率</option><option>极高频</option><option>高频</option><option>中高频</option><option>中频</option><option>低频</option></select></label>
        </div>
      </header>

      <div className="practice-layout">
        <aside className={listOpen ? "question-list is-open" : "question-list"}>
          <div className="question-list__head"><span>{filteredQuestions.length} 道题</span><small>已完成 {progress.completedQuestions.length}</small></div>
          <div className="question-list__scroll question-groups">
            {groupedQuestions.map(({ track, questions: trackQuestions }) => {
              const open = openTracks.includes(track.id);
              const completeCount = trackQuestions.filter((question) => progress.completedQuestions.includes(question.id)).length;
              return (
                <section className={open ? "question-group is-open" : "question-group"} key={track.id}>
                  <button className="question-group__toggle" onClick={() => toggleTrack(track.id)} aria-expanded={open}>
                    <span><strong>{track.title}</strong><small>{completeCount}/{trackQuestions.length}</small></span><ChevronDown />
                  </button>
                  {open && <div className="question-group__items">{trackQuestions.map((question) => {
                    const complete = progress.completedQuestions.includes(question.id);
                    const questionIndex = questions.findIndex((item) => item.id === question.id);
                    const locked = !entitlements.canAccessQuestion(questionIndex);
                    return (
                      <button className={selectedQuestion.id === question.id ? "is-active" : ""} key={question.id} onClick={() => { navigate(`/practice/${question.id}`); setListOpen(false); }}>
                        {locked ? <LockKeyhole /> : complete ? <CheckCircle2 /> : <Circle />}<span><strong>{question.title}</strong><small>{question.category ?? "基础理解"} · {question.difficulty}{question.frequency ? ` · ${question.frequency}` : ""}{locked ? " · PRO" : ""}</small></span>
                      </button>
                    );
                  })}</div>}
                </section>
              );
            })}
          </div>
        </aside>

        {accessible && (!protectedAnswerRequired || protectedAnswer) ? <QuestionWorkspace
          key={hydratedQuestion.id}
          question={hydratedQuestion}
          result={result}
          setResult={setResult}
          progress={progress}
          setProgress={setProgress}
          navigate={navigate}
        /> : accessible && answerLoading ? <div className="practice-paywall"><p className="premium-load-state">正在安全加载 PRO 题目答案…</p></div> : <div className="practice-paywall"><ProPreview title={selectedQuestion.title} description={selectedQuestion.prompt} inclusions={["20 秒结构化回答", "完整推导与评分点", "面试官追问链", "相关代码题入口"]} navigate={navigate} /></div>}
      </div>
      {listOpen && <button className="question-list-scrim" aria-label="关闭题目列表" onClick={() => setListOpen(false)} />}
    </div>
  );
}
