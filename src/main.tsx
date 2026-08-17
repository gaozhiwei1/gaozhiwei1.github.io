import React from "react";
import ReactDOM from "react-dom/client";
import "katex/dist/katex.min.css";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { EntitlementProvider } from "./entitlements/EntitlementContext";
import { LearningProgressProvider } from "./progress/LearningProgressContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <LearningProgressProvider>
        <EntitlementProvider>
          <App />
        </EntitlementProvider>
      </LearningProgressProvider>
    </AuthProvider>
  </React.StrictMode>,
);
