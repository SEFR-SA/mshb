import { createRoot } from "react-dom/client";
import { toast } from "sonner";
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
  toast.error("Something went wrong. Please try again.");
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  // If React fails to mount (e.g. missing env vars), show an error instead of a white screen
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px;background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;">
        <p style="font-size:18px;font-weight:600">Failed to start the app</p>
        <p style="font-size:13px;opacity:0.6;max-width:420px;text-align:center">${
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        }</p>
        <button onclick="location.reload()" style="padding:8px 20px;border-radius:8px;border:none;background:#5865f2;color:#fff;cursor:pointer;font-size:14px">Reload</button>
      </div>`;
  }
  console.error("[Fatal]", err);
}
