import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  CheckSquare2,
  CircleUserRound,
  Command,
  Crown,
  ExternalLink,
  GraduationCap,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  TerminalSquare,
  X,
} from "lucide-react";
import { useAuth } from "../auth/authContext";
import { rememberAuthReturn } from "../auth/authNavigation";
import { questions } from "../data/questions";
import { codeChallenges } from "../data/codeChallenges";
import { knowledgeNodes } from "../data/curriculum";
import { useEntitlements } from "../entitlements/entitlementContext";
import type { ProgressState, ViewName } from "../types";

interface ShellProps {
  children: React.ReactNode;
  view: ViewName;
  progress: ProgressState;
  navigate: (path: string) => void;
}

const navigation = [
  { id: "map" as const, label: "知识地图", icon: Map, path: "/map" },
  { id: "learn" as const, label: "开始学习", icon: BookOpenText, path: "/learn/transformer.attention.qkv" },
  { id: "practice" as const, label: "面试刷题", icon: CheckSquare2, path: "/practice" },
  { id: "code" as const, label: "代码实战", icon: TerminalSquare, path: "/code/stable-softmax" },
  { id: "review" as const, label: "复习中心", icon: GraduationCap, path: "/review" },
];

export function Shell({ children, view, progress, navigate }: ShellProps) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("math2llm-sidebar-collapsed") === "true");
  const completion = Math.round((progress.completedNodes.length / knowledgeNodes.length) * 100);
  const nextLearningNode = knowledgeNodes.find((node) => !progress.completedNodes.includes(node.id)) ?? knowledgeNodes[0];

  useEffect(() => {
    localStorage.setItem("math2llm-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [
      ...knowledgeNodes
        .filter((node) => `${node.title}${node.summary}${node.keywords.join("")}`.toLowerCase().includes(normalized))
        .slice(0, 7)
        .map((node) => ({ id: node.id, kind: "知识点", title: node.title, detail: node.summary, path: `/learn/${node.id}` })),
      ...knowledgeNodes
        .filter((node) => node.formula && `${node.title}${node.formula}${node.symbols?.map((item) => item.meaning).join("")}`.toLowerCase().includes(normalized))
        .slice(0, 4)
        .map((node) => ({ id: node.id, kind: "公式", title: node.title, detail: node.formula ?? "", path: `/learn/${node.id}` })),
      ...questions
        .filter((question) => `${question.title}${question.tags.join("")}`.toLowerCase().includes(normalized))
        .slice(0, 6)
        .map((question) => ({ id: question.id, kind: "面试题", title: question.title, detail: question.reference, path: `/practice/${question.id}` })),
      ...codeChallenges
        .filter((challenge) => `${challenge.title}${challenge.summary}${challenge.functionSignature}`.toLowerCase().includes(normalized))
        .slice(0, 4)
        .map((challenge) => ({ id: challenge.id, kind: "代码题", title: challenge.title, detail: challenge.functionSignature, path: `/code/${challenge.id}` })),
    ].slice(0, 12);
  }, [query]);

  const go = (path: string) => {
    navigate(path);
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <div className={collapsed ? "app-shell is-sidebar-collapsed" : "app-shell"}>
      <aside className={`${menuOpen ? "sidebar is-open" : "sidebar"}${collapsed ? " is-collapsed" : ""}`}>
        <div className="brand" onClick={() => go("/map")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") go("/map"); }} role="button" tabIndex={0} aria-label="返回知识地图">
          <span className="brand__mark">M</span>
          <span><strong>Math2LLM</strong><small>LLM 面试训练场</small></span>
        </div>
        <button className="sidebar__close icon-button" onClick={() => setMenuOpen(false)} aria-label="关闭菜单"><X /></button>
        <button className="sidebar__collapse icon-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开侧栏" : "收起侧栏"} title={collapsed ? "展开侧栏" : "收起侧栏"}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>

        <nav className="main-nav" aria-label="主导航">
          <span className="nav-label">学习工作台</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            const targetPath = item.id === "learn" ? `/learn/${nextLearningNode.id}` : item.path;
            return (
              <button
                type="button" key={item.id}
                className={view === item.id ? "nav-item is-active" : "nav-item"}
                onClick={() => go(targetPath)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} /><span>{item.label}</span>
                {item.id === "practice" && <small>{progress.completedQuestions.length}/{questions.length}</small>}
                {item.id === "code" && <small>{progress.completedChallenges.length}/{codeChallenges.length}</small>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__progress">
          <div className="progress-copy"><span>课程完成度</span><b>{completion}%</b></div>
          <div className="progress-track"><i style={{ width: `${completion}%` }} /></div>
          <p>Seen {progress.seenNodes.length} · Completed {progress.completedNodes.length} · Mastered {progress.masteredNodes.length}</p>
        </div>

        <a className="source-link" href="/handbook/main.pdf" target="_blank" rel="noreferrer">
          <ExternalLink size={17} /><span>打开原版讲义 PDF</span>
        </a>
      </aside>

      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="关闭菜单" />}

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMenuOpen(true)} aria-label="打开菜单"><Menu /></button>
          <button className="search-trigger" onClick={() => setSearchOpen(true)} type="button">
            <Search size={17} /><span>搜索全站</span><kbd><Command size={12} /> K</kbd>
          </button>
          <div className="topbar__actions">
            {entitlements.plan !== "pro" && <button className="upgrade-link" onClick={() => go("/pricing")}><Crown />PRO</button>}
            <button className="account-link" onClick={() => { if (!auth.user) rememberAuthReturn(); go(auth.user ? "/account" : "/login"); }} title={auth.user?.email ?? "登录账号"}><CircleUserRound /><span>{auth.user ? String(auth.user.user_metadata.display_name ?? auth.user.email?.split("@")[0] ?? "账号") : "登录"}</span></button>
            <div className="topbar__edition"><span>2026 Edition</span><b>{knowledgeNodes.length} 知识点 · {questions.length} 题</b></div>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {navigation.map((item) => {
          const Icon = item.icon;
          const targetPath = item.id === "learn" ? `/learn/${nextLearningNode.id}` : item.path;
          return <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => go(targetPath)}><Icon /><span>{item.label}</span></button>;
        })}
      </nav>

      {searchOpen && (
        <div className="command-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="command-panel" role="dialog" aria-modal="true" aria-label="全局搜索" onMouseDown={(event) => event.stopPropagation()}>
            <div className="command-input"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：KV Cache、DPO、为什么升维" /><button onClick={() => setSearchOpen(false)}>ESC</button></div>
            <div className="command-results">
              {query && results.length === 0 && <p className="empty-state">没有找到匹配内容</p>}
              {!query && <p className="empty-state">检索知识点、公式、面试题或代码题</p>}
              {results.map((result) => (
                <button key={`${result.kind}-${result.id}`} onClick={() => go(result.path)}>
                  <span>{result.kind}</span><strong>{result.title}</strong><small>{result.detail}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
