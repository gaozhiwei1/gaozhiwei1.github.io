import { useMemo, useState } from "react";
import { ArrowRight, Bookmark, CalendarClock, Check, CheckCircle2, Circle, Clock3, RotateCcw, Target } from "lucide-react";
import { questions } from "../data/questions";
import { resolveTrackId, trackById } from "../data/curriculum";
import type { ProgressState } from "../types";

interface ReviewPageProps {
  progress: ProgressState;
  navigate: (path: string) => void;
}

const routes = [
  { title: "基础模型 / Pretraining", path: "Transformer → Pretraining → Distributed → Evaluation", topicId: "transformer.attention.qkv" },
  { title: "Post-Training / Alignment", path: "SFT → Reward Model → PPO → DPO → GRPO → RLVR", topicId: "posttraining.sft.masking" },
  { title: "推理优化", path: "Attention → GQA → KV Cache → FlashAttention → Quantization", topicId: "inference.cache.kv" },
  { title: "LLM 应用 / Reliability", path: "Inference → RAG → Agent → Evaluation → Reliability", topicId: "evaluation.applications.rag-agent" },
];

const checklistItems = [
  "能手推 attention shape 与 causal mask",
  "能解释 attention 为什么除以 √dₖ",
  "能准确区分 Attention 与 FFN 的职责",
  "能计算 KV Cache 并解释 decode bandwidth",
  "能区分 MHA / MQA / GQA",
  "能解释 FlashAttention 优化的是 IO",
  "能区分 PPO old policy 与 reference policy",
  "能解释 DPO reference 与 GRPO group baseline",
  "能估算 LoRA 和训练模型状态显存",
  "能回答 DDP / TP / PP / FSDP 切了什么",
];

export function ReviewPage({ progress, navigate }: ReviewPageProps) {
  const [now] = useState(() => Date.now());
  const [checked, setChecked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("llm-interview-checklist") ?? "[]"); } catch { return []; }
  });
  const completed = progress.completedQuestions.length;
  const mastered = progress.masteredQuestions.length;
  const bookmarkedQuestions = useMemo(
    () => questions.filter((question) => progress.bookmarkedQuestions.includes(question.id)),
    [progress.bookmarkedQuestions],
  );
  const dueQuestions = useMemo(() => {
    const due = questions.filter((question) => {
      const history = progress.reviewHistory[question.id];
      if (!history) return false;
      const dueAt = new Date(history.lastReviewedAt).getTime() + history.intervalDays * 86_400_000;
      return dueAt <= now;
    });
    const unmasteredCompleted = questions.filter((question) => progress.completedQuestions.includes(question.id) && !progress.masteredQuestions.includes(question.id));
    const candidates = [...due, ...unmasteredCompleted, ...bookmarkedQuestions];
    const unique = candidates.filter((question, index) => candidates.findIndex((item) => item.id === question.id) === index);
    if (unique.length >= 6) return unique;
    const unfinished = questions.filter((question) => !progress.masteredQuestions.includes(question.id) && !unique.some((item) => item.id === question.id));
    return [...unique, ...unfinished].slice(0, 6);
  }, [bookmarkedQuestions, now, progress.completedQuestions, progress.masteredQuestions, progress.reviewHistory]);
  const actualDueCount = useMemo(() => questions.filter((question) => {
    const history = progress.reviewHistory[question.id];
    if (!history) return false;
    return new Date(history.lastReviewedAt).getTime() + history.intervalDays * 86_400_000 <= now;
  }).length, [now, progress.reviewHistory]);

  const toggleCheck = (item: string) => {
    const next = checked.includes(item) ? checked.filter((entry) => entry !== item) : [...checked, item];
    setChecked(next);
    localStorage.setItem("llm-interview-checklist", JSON.stringify(next));
  };

  return (
    <div className="page page--review">
      <section className="daily-review-hero">
        <div><span className="eyebrow">TODAY'S REVIEW</span><h1>今天应该复习什么？</h1><p>优先安排已到期、做过但未掌握和主动收藏的题目；首次使用时会给出一组诊断题。</p></div>
        <div className="daily-review-summary"><CalendarClock /><span><strong>今天建议复习 {dueQuestions.length} 个知识点</strong><small><Clock3 />预计 {Math.max(dueQuestions.length * 2, 4)} 分钟 · {actualDueCount} 项已到期</small></span><button disabled={!dueQuestions.length} onClick={() => dueQuestions[0] && navigate(`/practice/${dueQuestions[0].id}`)}>开始今日复习<ArrowRight /></button></div>
      </section>

      <section className="daily-review-list" aria-label="今日复习题">
        {dueQuestions.slice(0, 6).map((question, index) => <button key={question.id} onClick={() => navigate(`/practice/${question.id}`)}><span>{String(index + 1).padStart(2, "0")}</span><b>{question.title}</b><small>{trackById[resolveTrackId(question.topicId)].title} · {question.difficulty}</small><ArrowRight /></button>)}
      </section>

      <section className="review-stats">
        <div><CheckCircle2 /><span><small>已完成</small><strong>{completed} / {questions.length}</strong></span></div>
        <div><Target /><span><small>已掌握</small><strong>{mastered}</strong></span></div>
        <div><Bookmark /><span><small>已收藏</small><strong>{bookmarkedQuestions.length}</strong></span></div>
        <div><RotateCcw /><span><small>已到期</small><strong>{actualDueCount}</strong></span></div>
      </section>

      <div className="review-grid">
        <section className="review-section">
          <div className="review-section__title"><div><span>LAST-DAY CHECKLIST</span><h2>面试前最后检查</h2></div><b>{checked.length}/{checklistItems.length}</b></div>
          <div className="checklist">
            {checklistItems.map((item) => (
              <button className={checked.includes(item) ? "is-checked" : ""} key={item} onClick={() => toggleCheck(item)}>
                {checked.includes(item) ? <Check /> : <Circle />}<span>{item}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="review-section">
          <div className="review-section__title"><div><span>BOOKMARKS</span><h2>收藏的追问题</h2></div><b>{bookmarkedQuestions.length}</b></div>
          <div className="bookmark-list">
            {bookmarkedQuestions.length === 0 && <div className="empty-review"><Bookmark /><p>刷题时点击书签，难题会集中出现在这里。</p><button onClick={() => navigate("/practice")}>开始刷题<ArrowRight /></button></div>}
            {bookmarkedQuestions.map((question) => (
              <button key={question.id} onClick={() => navigate(`/practice/${question.id}`)}><span><small>{trackById[resolveTrackId(question.topicId)].title}</small><strong>{question.title}</strong></span><ArrowRight /></button>
            ))}
          </div>
        </section>
      </div>

      <section className="routes-section">
        <div className="review-section__title"><div><span>ROLE-BASED ROUTES</span><h2>不同岗位怎么刷？</h2></div></div>
        <div className="route-list">
          {routes.map((route) => (
            <button key={route.title} onClick={() => navigate(`/learn/${route.topicId}`)}><strong>{route.title}</strong><p>{route.path}</p><ArrowRight /></button>
          ))}
        </div>
      </section>
    </div>
  );
}
