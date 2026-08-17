import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import {
  curriculumTracks,
  knowledgeNodeById,
  knowledgeNodes,
  moduleById,
  nodesForTrack,
  resolveTrackId,
  trackById,
} from "../data/curriculum";
import { questions } from "../data/questions";
import type { ProgressState } from "../types";
import { KnowledgeNodeLesson } from "./KnowledgeNodeLesson";
import { priorityNodeIds } from "../content/PriorityDeepDive";
import { goldTocFor, hasGoldArticle } from "../content/gold/registry";
import { protectedDeepDiveTopicIds } from "../config/product";
import { useEntitlements } from "../entitlements/entitlementContext";
import { ProPreview } from "./ProPreview";

interface LearnPageProps {
  topicId: string;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
}

const defaultNodeByRoute: Record<string, string> = {
  math: "math.linear.matmul-shapes",
  tokenization: "tokenization.granularity",
  transformer: "transformer.attention.why",
  architecture: "transformer.norm.layer-rms",
  decoder: "decoder.objective.autoregressive",
  pretraining: "pretraining.data.sources",
  "post-training": "posttraining.sft.masking",
  reasoning: "reasoning.behavior.thinking",
  inference: "inference.cache.kv",
  moe: "moe.routing.why-ffn",
  peft: "peft.lora.update",
  distributed: "distributed.data.ddp",
  evaluation: "evaluation.metrics.loss-perplexity",
  "rag-agents": "evaluation.applications.rag-agent",
};

const sectionLabels: Record<string, string> = {
  overview: "核心问题",
  math: "数学关系",
  "deep-dive": "完整推导",
  shape: "Tensor Shape",
  implementation: "代码验证",
  pitfalls: "边界",
  interview: "面试追问",
};

function resolveNode(routeId: string, completedNodes: string[]) {
  if (knowledgeNodeById[routeId]) return knowledgeNodeById[routeId];
  const explicitDefault = defaultNodeByRoute[routeId];
  if (explicitDefault) return knowledgeNodeById[explicitDefault];
  const trackId = resolveTrackId(routeId);
  const trackNodes = nodesForTrack(trackId);
  return trackNodes.find((node) => !completedNodes.includes(node.id)) ?? trackNodes[0] ?? knowledgeNodes[0];
}

export function LearnPage({ topicId, progress, setProgress, navigate }: LearnPageProps) {
  const entitlements = useEntitlements();
  const node = resolveNode(topicId, progress.completedNodes);
  const accessible = entitlements.canAccessTopic(node.id);
  const track = trackById[node.trackId];
  const module = moduleById[node.moduleId];
  const [currentSection, setCurrentSection] = useState("overview");

  const trackQuestions = useMemo(
    () => questions.filter((question) => question.topicId === track.id || question.nodeId?.startsWith(`${track.id}.`) || (track.id === "transformer" && question.topicId === "architecture")),
    [track.id],
  );

  const trackPracticeQuestion = useMemo(
    () => trackQuestions.find((question) => {
      const index = questions.findIndex((item) => item.id === question.id);
      return index >= 0 && entitlements.canAccessQuestion(index);
    }) ?? trackQuestions[0],
    [entitlements, trackQuestions],
  );

  const pageSections = useMemo(() => {
    if (hasGoldArticle(node.id)) {
      return [
        { id: "overview", label: "本节目标" },
        ...goldTocFor(node.id),
        { id: "lesson-actions", label: "练习与完成" },
      ];
    }

    const ids = ["overview"];
    if (node.formula) ids.push("math");
    if (priorityNodeIds.has(node.id) || protectedDeepDiveTopicIds.has(node.id)) ids.push("deep-dive");
    if (node.tensorShapes?.length) ids.push("shape");
    if (node.codeChallengeId) ids.push("implementation");
    ids.push("pitfalls", "interview");
    return ids.map((id) => ({ id, label: sectionLabels[id] }));
  }, [node.codeChallengeId, node.formula, node.id, node.tensorShapes?.length]);

  useEffect(() => {
    setProgress((current) => ({
      ...current,
      visitedTopics: current.visitedTopics.includes(track.id) ? current.visitedTopics : [...current.visitedTopics, track.id],
      seenNodes: current.seenNodes.includes(node.id) ? current.seenNodes : [...current.seenNodes, node.id],
    }));
  }, [node.id, setProgress, track.id]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>(".lesson-article [id]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setCurrentSection(visible[0].target.id);
    }, { rootMargin: "-90px 0px -68%", threshold: [0, 0.1] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [node.id]);

  const globalIndex = knowledgeNodes.findIndex((item) => item.id === node.id);
  const previousNode = knowledgeNodes[globalIndex - 1];
  const nextNode = knowledgeNodes[globalIndex + 1];
  const completedInModule = module.nodeIds.filter((id) => progress.completedNodes.includes(id)).length;
  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;
    setCurrentSection(id);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page page--learn page--node">
      <div className="breadcrumb">
        <button onClick={() => navigate(`/map/${encodeURIComponent(track.id)}/${encodeURIComponent(module.id)}`)}><ArrowLeft />返回本模块</button>
        <span>/</span><span>{track.title}</span><span>/</span><strong>{module.title}</strong>
      </div>

      <header className="node-header">
        <div>
          <span className="lesson-index">TRACK {track.index} · {track.title} · {module.title}</span>
          <h1>{node.title}</h1>
          <p>{node.summary}</p>
        </div>
        <div className="node-header__progress">
          <span>{completedInModule}/{module.nodeIds.length}</span>
          <small>{module.title} 完成</small>
          <div><i style={{ width: `${module.nodeIds.length ? completedInModule / module.nodeIds.length * 100 : 0}%` }} /></div>
        </div>
      </header>

      <div className="lesson-layout lesson-layout--node">
        <article className="lesson-article node-article">
          {accessible
            ? <KnowledgeNodeLesson node={node} progress={progress} setProgress={setProgress} navigate={navigate} />
            : <ProPreview title={node.title} description={node.summary} inclusions={["完整数学推导", "变量与控制关系", "PyTorch 实现或实验", "3–6 道面试追问"]} navigate={navigate} />}
        </article>

        {accessible && <aside className="lesson-rail node-rail" aria-label="本页目录">
          <div className="rail-block rail-block--toc">
            <span>目录</span>
            {pageSections.map((section) => <button type="button" className={currentSection === section.id ? "is-current" : ""} onClick={() => scrollToSection(section.id)} aria-current={currentSection === section.id ? "location" : undefined} key={section.id}>{section.label}{currentSection === section.id && <i />}</button>)}
          </div>
          <div className="rail-status"><CheckCircle2 /><span><b>{progress.completedNodes.includes(node.id) ? "已完成" : "学习中"}</b><small>{node.difficulty} · {node.estimatedMinutes} 分钟</small></span></div>
          <button className="practice-callout" onClick={() => navigate(trackPracticeQuestion ? `/practice/${trackPracticeQuestion.id}` : "/practice")}>
            <ListChecks /><span><b>进入本章刷题</b><small>{trackQuestions.length} 道结构化追问</small></span><ArrowRight />
          </button>
        </aside>}
      </div>

      <footer className="lesson-footer">
        <button disabled={!previousNode} onClick={() => previousNode && navigate(`/learn/${previousNode.id}`)}><ArrowLeft />上一知识点</button>
        <span>{globalIndex + 1} / {knowledgeNodes.length}</span>
        <button disabled={!nextNode} onClick={() => nextNode && navigate(`/learn/${nextNode.id}`)}>下一知识点<ArrowRight /></button>
      </footer>
      <p className="track-position">全课程 {curriculumTracks.findIndex((item) => item.id === track.id) + 1}/{curriculumTracks.length} · {track.title}</p>
    </div>
  );
}
