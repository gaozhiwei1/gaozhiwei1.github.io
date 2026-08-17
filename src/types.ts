export type ViewName = "map" | "learn" | "practice" | "code" | "review" | "login" | "signup" | "account" | "pricing" | "auth" | "payment";

export type TopicTone = "blue" | "green" | "amber" | "coral" | "violet";
export type KnowledgeStatus = "seen" | "completed" | "mastered";

export interface Topic {
  id: string;
  index: string;
  title: string;
  english: string;
  description: string;
  why: string;
  tone: TopicTone;
  stage: "基础" | "训练" | "架构" | "推理" | "对齐" | "系统" | "应用";
  lessonCount: number;
  questionCount: number;
  keyPoints: string[];
  prerequisites: string[];
}

export interface CurriculumTrack {
  id: string;
  legacyTopicId: string;
  index: string;
  title: string;
  description: string;
  why: string;
  moduleIds: string[];
}

export interface CurriculumModule {
  id: string;
  trackId: string;
  title: string;
  description: string;
  nodeIds: string[];
}

export interface MathSymbol {
  symbol: string;
  meaning: string;
}

export interface KnowledgeNode {
  id: string;
  trackId: string;
  moduleId: string;
  title: string;
  summary: string;
  why: string;
  intuition: string;
  caveat: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  prerequisites: string[];
  keywords: string[];
  formula?: string;
  symbols?: MathSymbol[];
  tensorShapes?: { label: string; shape: string; note?: string }[];
  codeChallengeId?: string;
}

export type QuestionType = "single" | "numeric" | "self";
export type Difficulty = "基础" | "进阶" | "困难";
export type QuestionCategory = "基础理解" | "数学推导" | "工程理解" | "Debugging" | "System Design" | "Follow-up";
export type QuestionFrequency = "极高频" | "高频" | "中高频" | "中频" | "低频" | "";

export interface DerivationStep {
  title: string;
  detail: string;
  formula?: string;
}

export interface Question {
  id: string;
  topicId: string;
  nodeId?: string;
  category?: QuestionCategory;
  frequency?: QuestionFrequency;
  treeId?: string;
  type: QuestionType;
  difficulty: Difficulty;
  title: string;
  prompt: string;
  choices?: string[];
  correctChoice?: number;
  numericAnswer?: number;
  tolerance?: number;
  unit?: string;
  shortAnswer: string;
  explanation: string;
  knowledgePoints?: string[];
  equations?: string[];
  pitfalls?: string[];
  sourceTags?: string[];
  derivation?: DerivationStep[];
  followUps: string[];
  reference: string;
  tags: string[];
  codeChallengeId?: string;
}

export interface ProgressState {
  completedQuestions: string[];
  masteredQuestions: string[];
  bookmarkedQuestions: string[];
  visitedTopics: string[];
  completedChallenges: string[];
  seenNodes: string[];
  completedNodes: string[];
  masteredNodes: string[];
  reviewHistory: Record<string, { lastReviewedAt: string; intervalDays: number; correctStreak: number }>;
}

export interface CodeExample {
  input: string;
  output: string;
  explanation: string;
}

export interface CodeChallenge {
  id: string;
  title: string;
  topicId: string;
  difficulty: Difficulty;
  summary: string;
  motivation: string;
  functionSignature: string;
  description: string[];
  parameters: { name: string; meaning: string; shape?: string }[];
  examples: CodeExample[];
  constraints: string[];
  starterCode: string;
  knowledgeLink: string;
  complexity?: string;
  commonFailures?: string[];
}
