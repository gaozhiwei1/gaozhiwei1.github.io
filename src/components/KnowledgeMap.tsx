import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Circle, LockKeyhole } from "lucide-react";
import {
  curriculumModules,
  curriculumTracks,
  knowledgeNodeById,
  moduleById,
  progressForTrack,
} from "../data/curriculum";
import { codeChallenges } from "../data/codeChallenges";
import { questions } from "../data/questions";
import { hasGoldArticle } from "../content/gold/registry";
import type { CurriculumTrack, ProgressState } from "../types";

interface KnowledgeMapProps {
  progress: ProgressState;
  navigate: (path: string) => void;
  initialTrackId?: string;
  initialModuleId?: string;
}

function trackStatus(track: CurriculumTrack, progress: ProgressState) {
  const summary = progressForTrack(track.id, progress.completedNodes);
  if (summary.total && summary.completed === summary.total) return "completed";
  if (track.moduleIds.some((id) => moduleById[id].nodeIds.some((nodeId) => progress.seenNodes.includes(nodeId)))) return "current";
  return "future";
}

export function KnowledgeMap({ progress, navigate, initialTrackId, initialModuleId }: KnowledgeMapProps) {
  const nextTrack = curriculumTracks.find((track) => progressForTrack(track.id, progress.completedNodes).percent < 100) ?? curriculumTracks[0];
  const initialTrack = curriculumTracks.find((track) => track.id === initialTrackId) ?? nextTrack;
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrack.id);
  const selectedTrack = curriculumTracks.find((track) => track.id === selectedTrackId) ?? nextTrack;
  const selectedModules = curriculumModules.filter((module) => module.trackId === selectedTrack.id);
  const firstIncompleteModule = selectedModules.find((module) => module.nodeIds.some((id) => !progress.completedNodes.includes(id))) ?? selectedModules[0];
  const routeModule = selectedModules.find((module) => module.id === initialModuleId);
  const [selectedModuleId, setSelectedModuleId] = useState((routeModule ?? firstIncompleteModule).id);
  const selectedModule = selectedModules.find((module) => module.id === selectedModuleId) ?? firstIncompleteModule;
  const selectedNodes = selectedModule.nodeIds.map((id) => knowledgeNodeById[id]);
  const nextNode = selectedNodes.find((node) => !progress.completedNodes.includes(node.id)) ?? selectedNodes[0];

  const counts = useMemo(() => ({
    completed: progress.completedNodes.length,
    total: Object.keys(knowledgeNodeById).length,
    mastered: progress.masteredNodes.length,
  }), [progress.completedNodes.length, progress.masteredNodes.length]);

  const rememberMapLocation = (trackId: string, moduleId: string) => {
    window.history.replaceState(null, "", `#/map/${encodeURIComponent(trackId)}/${encodeURIComponent(moduleId)}`);
  };

  const openNode = (nodeId: string) => {
    rememberMapLocation(selectedTrack.id, selectedModule.id);
    navigate(`/learn/${nodeId}`);
  };

  const chooseTrack = (trackId: string) => {
    const modules = curriculumModules.filter((module) => module.trackId === trackId);
    const nextModule = modules.find((module) => module.nodeIds.some((id) => !progress.completedNodes.includes(id))) ?? modules[0];
    setSelectedTrackId(trackId);
    setSelectedModuleId(nextModule.id);
    rememberMapLocation(trackId, nextModule.id);
  };

  return (
    <div className="page page--map page--curriculum">
      <section className="curriculum-intro">
        <div>
          <span className="eyebrow">MATH2LLM · ENGINEER CURRICULUM</span>
          <h1>LLM 算法工程师学习路线</h1>
          <p>Motivation → Mathematical intuition → Derivation → Implementation → Experiment → Interview</p>
        </div>
        <button className="primary-action" onClick={() => openNode(nextNode.id)}><BookOpen />继续：{nextNode.title}<ArrowRight /></button>
      </section>

      <section className="current-learning" aria-label="当前学习状态">
        <div><span>你现在在</span><strong>{selectedTrack.index} · {selectedTrack.title}</strong><small>{selectedModule.title}</small></div>
        <div><span>下一步</span><strong>{nextNode.title}</strong><small>{nextNode.estimatedMinutes} 分钟 · {nextNode.difficulty}</small></div>
        <div className="current-learning__numbers"><span>{counts.completed}/{counts.total} 已完成</span><span>{counts.mastered} 已掌握</span><span>{questions.length} 道题 · {codeChallenges.length} 道代码</span></div>
      </section>

      <div className="curriculum-layout">
        <section className="track-index" aria-label="课程 Track">
          <header><div><span>完整路线</span><h2>12 个核心 Track</h2></div><small>点击查看内部路径</small></header>
          <div className="track-list">
            {curriculumTracks.map((track) => {
              const summary = progressForTrack(track.id, progress.completedNodes);
              const status = trackStatus(track, progress);
              const active = track.id === selectedTrack.id;
              return (
                <button className={`${active ? "is-active" : ""} status-${status}`} onClick={() => chooseTrack(track.id)} key={track.id} aria-expanded={active}>
                  <span className="track-list__index">{track.index}</span>
                  <span className="track-list__copy"><strong>{track.title}</strong><small>{track.description}</small></span>
                  <span className="track-list__meta"><b>{summary.percent}%</b><small>{summary.total} 个知识点</small></span>
                  {status === "completed" ? <CheckCircle2 /> : status === "current" ? <Circle className="is-current-dot" /> : <LockKeyhole />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="track-detail" aria-live="polite">
          <header>
            <div><span>TRACK {selectedTrack.index}</span><h2>{selectedTrack.title}</h2><p>{selectedTrack.why}</p></div>
            <div className="track-detail__progress"><b>{progressForTrack(selectedTrack.id, progress.completedNodes).percent}%</b><span>完成度</span></div>
          </header>

          <div className="module-switcher" role="tablist" aria-label={`${selectedTrack.title} 模块`}>
            {selectedModules.map((module, index) => {
              const complete = module.nodeIds.filter((id) => progress.completedNodes.includes(id)).length;
              return <button role="tab" aria-selected={module.id === selectedModule.id} className={module.id === selectedModule.id ? "is-active" : ""} onClick={() => { setSelectedModuleId(module.id); rememberMapLocation(selectedTrack.id, module.id); }} key={module.id}><span>{index + 1}</span><b>{module.title}</b><small>{complete}/{module.nodeIds.length}</small><ChevronDown /></button>;
            })}
          </div>

          <div className="module-path">
            <div className="module-path__heading"><div><span>当前模块</span><h3>{selectedModule.title}</h3><p>{selectedModule.description}</p></div><button onClick={() => openNode(nextNode.id)}>从这里继续<ArrowRight /></button></div>
            <ol>
              {selectedNodes.map((node, index) => {
                const completed = progress.completedNodes.includes(node.id);
                const seen = progress.seenNodes.includes(node.id);
                return (
                  <li className={completed ? "is-completed" : seen ? "is-seen" : ""} key={node.id}>
                    <button onClick={() => openNode(node.id)}>
                      <span className="node-state">{completed ? <Check /> : <b>{String(index + 1).padStart(2, "0")}</b>}</span>
                      <span><strong>{node.title}{hasGoldArticle(node.id) && <em className="gold-node-badge">GOLD</em>}</strong><small>{node.summary}</small></span>
                      <span className="node-meta">{node.difficulty} · {node.estimatedMinutes}m{node.prerequisites.length > 0 && <small>{node.prerequisites.length} 个先修</small>}</span>
                      <ArrowRight />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
