import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "./components/Shell";
import { useLearningProgress } from "./progress/learningProgressContext";
import type { ViewName } from "./types";

const KnowledgeMap = lazy(() => import("./components/KnowledgeMap").then((module) => ({ default: module.KnowledgeMap })));
const LearnPage = lazy(() => import("./components/LearnPage").then((module) => ({ default: module.LearnPage })));
const PracticePage = lazy(() => import("./components/PracticePage").then((module) => ({ default: module.PracticePage })));
const CodeLabPage = lazy(() => import("./components/CodeLabPage").then((module) => ({ default: module.CodeLabPage })));
const ReviewPage = lazy(() => import("./components/ReviewPage").then((module) => ({ default: module.ReviewPage })));
const AuthPage = lazy(() => import("./components/AuthPage").then((module) => ({ default: module.AuthPage })));
const OAuthCallbackPage = lazy(() => import("./components/AuthPage").then((module) => ({ default: module.OAuthCallbackPage })));
const AccountPage = lazy(() => import("./components/AccountPage").then((module) => ({ default: module.AccountPage })));
const PricingPage = lazy(() => import("./components/PricingPage").then((module) => ({ default: module.PricingPage })));
const PaymentStatusPage = lazy(() => import("./components/PaymentStatusPage").then((module) => ({ default: module.PaymentStatusPage })));

interface RouteState {
  view: ViewName;
  id?: string;
  subId?: string;
}

function readRoute(): RouteState {
  const path = window.location.hash.replace(/^#/, "") || "/map";
  const [, view, rawId, rawSubId] = path.split("/");
  const id = rawId?.split("?")[0] ? decodeURIComponent(rawId.split("?")[0]) : undefined;
  const subId = rawSubId?.split("?")[0] ? decodeURIComponent(rawSubId.split("?")[0]) : undefined;
  if (view === "map") return { view: "map", id, subId };
  if (view === "learn") return { view: "learn", id };
  if (view === "practice") return { view: "practice", id };
  if (view === "code") return { view: "code", id };
  if (view === "review") return { view: "review" };
  if (view === "login") return { view: "login" };
  if (view === "signup") return { view: "signup" };
  if (view === "account") return { view: "account" };
  if (view === "pricing") return { view: "pricing" };
  if (view === "auth" && id === "callback") return { view: "auth", id };
  if (view === "payment") return { view: "payment", id };
  return { view: "map" };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(readRoute);
  const { progress, setProgress } = useLearningProgress();

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const searchButton = document.querySelector<HTMLButtonElement>(".search-trigger");
        searchButton?.click();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const page = useMemo(() => {
    if (route.view === "learn") return <LearnPage key={route.id ?? "transformer"} topicId={route.id ?? "transformer"} progress={progress} setProgress={setProgress} navigate={navigate} />;
    if (route.view === "practice") return <PracticePage key={route.id ?? "practice"} questionId={route.id} progress={progress} setProgress={setProgress} navigate={navigate} />;
    if (route.view === "code") return <CodeLabPage key={route.id ?? "code"} challengeId={route.id} progress={progress} setProgress={setProgress} navigate={navigate} />;
    if (route.view === "review") return <ReviewPage progress={progress} navigate={navigate} />;
    if (route.view === "login") return <AuthPage mode="login" navigate={navigate} />;
    if (route.view === "signup") return <AuthPage mode="signup" navigate={navigate} />;
    if (route.view === "auth") return <OAuthCallbackPage navigate={navigate} />;
    if (route.view === "account") return <AccountPage navigate={navigate} />;
    if (route.view === "pricing") return <PricingPage navigate={navigate} />;
    if (route.view === "payment") return <PaymentStatusPage outcome={route.id === "error" ? "error" : "success"} navigate={navigate} />;
    return <KnowledgeMap progress={progress} navigate={navigate} initialTrackId={route.id} initialModuleId={route.subId} />;
  }, [navigate, progress, route, setProgress]);

  return (
    <Shell view={route.view} progress={progress} navigate={navigate}>
      <Suspense fallback={<div className="page-loading"><span /><b>正在载入学习模块</b></div>}>
        {page}
      </Suspense>
    </Shell>
  );
}
