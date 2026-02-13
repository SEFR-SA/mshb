import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set initial direction based on stored language
const lang = localStorage.getItem("i18nextLng") || "en";
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
document.documentElement.lang = lang;

createRoot(document.getElementById("root")!).render(<App />);
