import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./design.css";
import { applyAppearance, readColorMode, readMotionPreference, readVisualStyle } from "./appearance";

applyAppearance(readColorMode(), readVisualStyle(), readMotionPreference());

/**
 * Root DOM element used by the React application.
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
