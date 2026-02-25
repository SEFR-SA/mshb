import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set initial direction based on stored language
const lang = localStorage.getItem("i18nextLng") || "en";
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
document.documentElement.lang = lang;

// Global error traps — log before React has a chance to swallow them
window.onerror = (msg, src, line, col, err) => {
  console.error("[Global onerror]", msg, "at", src, `${line}:${col}`, err);
};
window.addEventListener("unhandledrejection", (e) => {
  console.error("[Unhandled Rejection]", e.reason);
});

createRoot(document.getElementById("root")!).render(<App />);
