import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Polyfills for Node.js globals in browser
import { Buffer } from "buffer";
import process from "process";

// Make Buffer and process globally available
(window as any).Buffer = Buffer;
(window as any).process = process;
(window as any).global = window;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
