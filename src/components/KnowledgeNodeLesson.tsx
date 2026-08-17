import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import { codeChallengeById } from "../data/codeChallenges";
import { knowledgeNodeById, knowledgeNodes, moduleById } from "../data/curriculum";
import { questions } from "../data/questions";
import { PriorityDeepDive, priorityNodeIds } from "../content/PriorityDeepDive";
import { GoldArticle } from "../content/gold/GoldArticle";
import { premiumGoldNodeIds, publicGoldArticleFor } from "../content/gold/registry";
import { protectedDeepDiveTopicIds } from "../config/product";
import { useEntitlements } from "../entitlements/entitlementContext";
import { toggleItem } from "../lib/progress";
import type { KnowledgeNode, ProgressState, Question } from "../types";
import { Formula } from "./Formula";
import { TensorShape } from "./TensorShape";
import { PremiumDeepDive } from "./PremiumDeepDive";
import { LessonFigure } from "./LessonFigure";
import { inlineFiguresForNode } from "../content/lessonFigures";

interface KnowledgeNodeLessonProps {
  node: KnowledgeNode;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
}

function questionsFor(node: KnowledgeNode): Question[] {
  const exact = questions.filter((question) => question.nodeId === node.id);
  const related = questions.filter(
    (question) =>
      question.nodeId !== node.id
      && question.tags.some((tag) => node.keywords.includes(tag)),
  );
  return [...exact, ...related];
}

function followUpsFor(node: KnowledgeNode, relatedQuestions: Question[]): string[] {
  const matched = relatedQuestions.flatMap((question) => [
    question.title,
    ...question.followUps,
  ]);
  const fallback = [
    `${node.title} 解决的具体问题是什么？`,
    `如果移除 ${node.title}，最先出现什么可观察现象？`,
    `${node.title} 改变的是概率、梯度、FLOPs、显存还是带宽？`,
    `这个结论依赖哪些假设，什么时候会失效？`,
  ];
  return [...new Set([...matched, ...fallback])].slice(0, 6);
}

function LessonActions({
  node,
  progress,
  setProgress,
  navigate,
  relatedQuestions,
}: {
  node: KnowledgeNode;
  progress: ProgressState;
  setProgress: React.Dispatch<React.SetStateAction<ProgressState>>;
  navigate: (path: string) => void;
  relatedQuestions: Question[];
}) {
  const entitlements = useEntitlements();
  const completed = progress.completedNodes.includes(node.id);
  const mastered = progress.masteredNodes.includes(node.id);
  const practiceQuestion = relatedQuestions.find((question) => {
    const index = questions.findIndex((item) => item.id === question.id);
    return index >= 0 && entitlements.canAccessQuestion(index);
  }) ?? relatedQuestions[0];

  const markCompleted = () => {
    setProgress((current) => ({
      ...current,
      completedNodes: current.completedNodes.includes(node.id)
        ? current.completedNodes
        : [...current.completedNodes, node.id],
    }));
  };

  const toggleMastered = () => {
    setProgress((current) => ({
      ...current,
      completedNodes: current.completedNodes.includes(node.id)
        ? current.completedNodes
        : [...current.completedNodes, node.id],
      masteredNodes: toggleItem(current.masteredNodes, node.id),
    }));
  };

  return (
    <div className="lesson-actions lesson-actions--compact">
      {practiceQuestion && (
        <button
          className="secondary-action"
          onClick={() => navigate(`/practice/${practiceQuestion.id}`)}
        >
          进入相关刷题<ArrowRight />
        </button>
      )}
      <button
        className={completed ? "completion-action is-complete" : "completion-action"}
        onClick={markCompleted}
      >
        <CheckCircle2 />{completed ? "已完成本知识点" : "标记为完成"}
      </button>
      <button
        className={mastered ? "mastery-action is-mastered" : "mastery-action"}
        onClick={toggleMastered}
      >
        {mastered ? "已掌握" : "标记掌握"}
      </button>
    </div>
  );
}

export function KnowledgeNodeLesson({ node, progress, setProgress, navigate }: KnowledgeNodeLessonProps) {
  const module = moduleById[node.moduleId];
  const moduleNodes = module.nodeIds.map((id) => knowledgeNodeById[id]);
  const moduleIndex = moduleNodes.findIndex((item) => item.id === node.id);
  const nextNode = moduleNodes[moduleIndex + 1]
    ?? knowledgeNodes.find((item) => item.prerequisites.includes(node.id));
  const challenge = node.codeChallengeId ? codeChallengeById[node.codeChallengeId] : undefined;
  const relatedQuestions = questionsFor(node);
  const followUps = followUpsFor(node, relatedQuestions);
  const goldMarkdown = publicGoldArticleFor(node.id);
  const premiumGold = premiumGoldNodeIds.has(node.id);
  const inlineFigures = inlineFiguresForNode(node.id);

  if (goldMarkdown || premiumGold) {
    return (
      <>
        <section className="node-introduction gold-node-introduction" id="overview">
          <div className="node-introduction__label">
            <span>{module.title}</span>
            <b>{node.difficulty} · 约 {node.estimatedMinutes} 分钟</b>
          </div>
          <p className="lesson-lead">{node.why} {node.intuition}</p>
        </section>

        {goldMarkdown ? <GoldArticle markdown={goldMarkdown} nodeId={node.id} /> : <PremiumDeepDive topicId={node.id} />}

        <section className="gold-lesson-actions" id="lesson-actions">
          {challenge && (
            <div className="related-challenge related-challenge--compact">
              <div>
                <span>CODING</span>
                <h3>{challenge.title}</h3>
                <p>{challenge.motivation}</p>
                <code>{challenge.functionSignature}</code>
              </div>
              <button onClick={() => navigate(`/code/${challenge.id}`)}>
                进入代码实战<ArrowRight />
              </button>
            </div>
          )}
          <LessonActions node={node} progress={progress} setProgress={setProgress} navigate={navigate} relatedQuestions={relatedQuestions} />
        </section>

        {nextNode && (
          <button className="next-node" onClick={() => navigate(`/learn/${nextNode.id}`)}>
            <span><small>下一知识点</small><strong>{nextNode.title}</strong></span><ArrowRight />
          </button>
        )}
      </>
    );
  }

  const authoredSupport = relatedQuestions.find(
    (question) => question.derivation?.length || question.knowledgePoints?.length,
  );
  const supportPoints = (authoredSupport?.knowledgePoints ?? []).filter((point) => {
    const normalized = point.trim();
    if (/^(动机|机制|边界)[:：]/.test(normalized)) return false;
    return normalized !== node.why && normalized !== node.intuition && normalized !== node.caveat;
  });
  const hasAuthoredExplanation = supportPoints.length > 0 || Boolean(authoredSupport?.derivation?.length);

  return (
    <>
      <section className="node-introduction node-introduction--compact" id="overview">
        <div className="node-introduction__label">
          <span>{module.title}</span>
          <b>{node.difficulty} · 约 {node.estimatedMinutes} 分钟</b>
        </div>
        <p className="lesson-lead">{node.why} {node.intuition}</p>
      </section>

      {inlineFigures.map((figure) => <LessonFigure figure={figure} key={figure.id} />)}

      {node.formula && (
        <section className="node-section node-section--prose node-section--math" id="math">
          <h2>核心关系</h2>
          <Formula block>{node.formula}</Formula>
          {node.symbols?.length ? (
            <dl className="symbol-glossary symbol-glossary--quiet">
              {node.symbols.map((item) => (
                <div key={item.symbol}>
                  <dt><Formula>{item.symbol}</Formula></dt>
                  <dd>{item.meaning}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      )}

      {hasAuthoredExplanation && (
        <section className="node-section node-section--prose" id="explanation">
          <h2>{authoredSupport?.derivation?.length ? "推导与解释" : "进一步理解"}</h2>
          {supportPoints.map((point) => <p key={point}>{point}</p>)}
          {authoredSupport?.derivation?.map((step) => (
            <div className="inline-derivation-step" key={step.title}>
              <strong>{step.title}</strong>
              {step.formula && <Formula block>{step.formula}</Formula>}
              <p>{step.detail}</p>
            </div>
          ))}
        </section>
      )}

      {priorityNodeIds.has(node.id) && (
        <section className="node-section node-section--prose node-section--deep" id="deep-dive">
          <PriorityDeepDive nodeId={node.id} />
        </section>
      )}

      {protectedDeepDiveTopicIds.has(node.id) && (
        <section className="node-section node-section--prose node-section--deep" id="deep-dive">
          <PremiumDeepDive topicId={node.id} />
        </section>
      )}

      {node.tensorShapes?.length ? (
        <section className="node-section node-section--prose node-section--shape" id="shape">
          <h2>Shape 与轴语义</h2>
          <p>只看元素个数不够；实现时要同时追踪每个轴代表的对象，否则广播和 reshape 很容易“能运行但语义错误”。</p>
          <TensorShape title={node.title} items={node.tensorShapes} />
        </section>
      ) : null}

      {challenge && (
        <section className="node-section node-section--prose" id="implementation">
          <h2>用代码验证</h2>
          <div className="related-challenge related-challenge--compact">
            <div>
              <span>RELATED CODING</span>
              <h3>{challenge.title}</h3>
              <p>{challenge.motivation}</p>
              <code>{challenge.functionSignature}</code>
            </div>
            <button onClick={() => navigate(`/code/${challenge.id}`)}>
              进入代码实战<ArrowRight />
            </button>
          </div>
        </section>
      )}

      <aside className="lesson-boundary" id="pitfalls">
        <span>边界</span>
        <p>{node.caveat}</p>
      </aside>

      <section className="node-section node-section--prose node-section--interview" id="interview">
        <details className="interview-details">
          <summary>
            <span><ListChecks /><strong>面试追问</strong><small>{relatedQuestions.length} 道关联题</small></span>
            <b>展开</b>
          </summary>
          <ol className="interview-chain interview-chain--quiet">
            {followUps.map((question) => <li key={question}><p>{question}</p></li>)}
          </ol>
        </details>
        <LessonActions node={node} progress={progress} setProgress={setProgress} navigate={navigate} relatedQuestions={relatedQuestions} />
      </section>

      {nextNode && (
        <button className="next-node" onClick={() => navigate(`/learn/${nextNode.id}`)}>
          <span><small>下一知识点</small><strong>{nextNode.title}</strong></span><ArrowRight />
        </button>
      )}
    </>
  );

}
